import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

interface QuizData {
  id: string;
  status: string;
  pot: number;
  totalParticipants: number;
  participants: Array<{
    walletAddress: string;
    bet: number;
    createdAt: any;
  }>;
  endTime?: any;
}

interface ParticipationData {
  quizId: string;
  walletAddress: string;
  bet: number;
  createdAt: any;
}

export const useRealtime = () => {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  const connectionError = ref<string | null>(null);

  const quizData = ref<QuizData | null>(null);
  const participants = ref<Array<any>>([]);
  const gameStatus = ref<string>('');

  const connect = () => {
    try {
      // Skip WebSocket connection in development/testing
      console.log('⚠️ WebSocket disabled for Firebase Functions compatibility');
      return;
      
      const runtimeConfig = useRuntimeConfig();
      const serverUrl = runtimeConfig.public.apiBase || 'http://localhost:5001';
      
      socket.value = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      socket.value.on('connect', () => {
        isConnected.value = true;
        connectionError.value = null;
        console.log('✅ Connected to WebSocket server');
      });

      socket.value.on('disconnect', () => {
        isConnected.value = false;
        console.log('❌ Disconnected from WebSocket server');
      });

      socket.value.on('connect_error', (error) => {
        connectionError.value = error.message;
        console.error('WebSocket connection error:', error);
      });

      // Listen for quiz updates
      socket.value.on('quiz-updated', (data: QuizData) => {
        console.log('📊 Quiz updated:', data);
        quizData.value = data;
        gameStatus.value = data.status;
        
        if (data.participants) {
          participants.value = data.participants.sort((a, b) => b.bet - a.bet);
        }
      });

      // Listen for new participations
      socket.value.on('new-participation', (data: ParticipationData) => {
        console.log('👤 New participation:', data);
        
        // Add or update participant in the list
        const existingIndex = participants.value.findIndex(
          p => p && p.walletAddress === data.walletAddress
        );
        
        if (existingIndex >= 0) {
          // Update existing participant
          participants.value[existingIndex].bet += data.bet;
        } else {
          // Add new participant
          participants.value.push({
            walletAddress: data.walletAddress,
            bet: data.bet,
            createdAt: data.createdAt
          });
        }
        
        // Re-sort participants by bet amount
        participants.value.sort((a, b) => b.bet - a.bet);
        
        // Update total pot and participant count
        if (quizData.value) {
          quizData.value.totalParticipants = participants.value.length;
          quizData.value.pot = participants.value.reduce((total, p) => total + p.bet, 0);
        }
      });

      // Listen for game end
      socket.value.on('game-ended', (results: any) => {
        console.log('🏁 Game ended:', results);
        gameStatus.value = 'ended';
        quizData.value = { ...quizData.value, ...results };
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      connectionError.value = 'Failed to initialize WebSocket connection';
    }
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
      isConnected.value = false;
    }
  };

  const joinQuiz = (quizId: string) => {
    if (socket.value && isConnected.value) {
      socket.value.emit('join-quiz', quizId);
      console.log(`🎮 Joined quiz room: ${quizId}`);
    }
  };

  const leaveQuiz = (quizId: string) => {
    if (socket.value && isConnected.value) {
      socket.value.emit('leave-quiz', quizId);
      console.log(`🚪 Left quiz room: ${quizId}`);
    }
  };

  const initializeWithQuiz = (initialQuizData: QuizData) => {
    quizData.value = initialQuizData;
    gameStatus.value = initialQuizData.status;
    
    if (initialQuizData.participants) {
      participants.value = initialQuizData.participants.sort((a, b) => b.bet - a.bet);
    }
    
    // Join the quiz room for real-time updates
    if (initialQuizData.id) {
      joinQuiz(initialQuizData.id);
    }
  };

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    // Connection state
    isConnected: readonly(isConnected),
    connectionError: readonly(connectionError),
    
    // Quiz data
    quizData: readonly(quizData),
    participants: readonly(participants),
    gameStatus: readonly(gameStatus),
    
    // Methods
    connect,
    disconnect,
    joinQuiz,
    leaveQuiz,
    initializeWithQuiz
  };
};