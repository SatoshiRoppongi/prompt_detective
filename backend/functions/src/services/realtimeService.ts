import {Server as SocketIOServer} from "socket.io";
import {Server} from "http";
import * as admin from "firebase-admin";

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: Server): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("join-quiz", (quizId: string) => {
      socket.join(quizId);
      console.log(`Client ${socket.id} joined quiz: ${quizId}`);
    });

    socket.on("leave-quiz", (quizId: string) => {
      socket.leave(quizId);
      console.log(`Client ${socket.id} left quiz: ${quizId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Set up Firestore listeners for real-time updates
  setupFirestoreListeners();

  return io;
}

function setupFirestoreListeners() {
  const db = admin.firestore();

  // Listen to active quiz changes
  db.collection("quiz").where("status", "==", "active")
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const quizData = {id: change.doc.id, ...change.doc.data()};

        if (change.type === "added" || change.type === "modified") {
          // Broadcast quiz updates to all clients in the quiz room
          io?.to(quizData.id).emit("quiz-updated", quizData);
          console.log(`Broadcasting quiz update for: ${quizData.id}`);
        }
      });
    });

  // Listen to participation changes
  db.collection("participation")
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const participationData = {id: change.doc.id, ...data};

        if (change.type === "added" && data.quizId) {
          // Broadcast new participation to quiz room
          io?.to(data.quizId).emit("new-participation", participationData);
          console.log(`Broadcasting new participation for quiz: ${data.quizId}`);
        }
      });
    });
}

export function broadcastQuizUpdate(quizId: string, data: any) {
  if (io) {
    io.to(quizId).emit("quiz-updated", data);
    console.log(`Broadcasting quiz update for: ${quizId}`);
  }
}

export function broadcastNewParticipation(quizId: string, participationData: any) {
  if (io) {
    io.to(quizId).emit("new-participation", participationData);
    console.log(`Broadcasting new participation for quiz: ${quizId}`);
  }
}

export function broadcastGameEnd(quizId: string, results: any) {
  if (io) {
    io.to(quizId).emit("game-ended", results);
    console.log(`Broadcasting game end for quiz: ${quizId}`);
  }
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}
