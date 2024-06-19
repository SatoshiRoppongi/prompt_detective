/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";

const db = admin.firestore();
const problemsCollection = db.collection("problems");

export interface Problem {
    id?: string;
    imageName: string | null;
    secretPrompt: string;
    createdAt: FieldValue;
    // todo: 必要なら他の問題情報を定義
}

export const createProblem = async (problem: Problem): Promise<void> => {
  // 一旦problem.id = documentのキーとする
  const key = problem.id;
  if (!key) {
    return;
  }
  await problemsCollection.doc(key).set(
    problem
  );
  return;
};

export const getLatestProblem = async (): Promise<Problem | null>=> {
  try {
    const querySnapshot = await problemsCollection
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (querySnapshot.empty) {
      console.log("No matching problems.");
      return null;
    }

    const doc = querySnapshot.docs[0];
    console.log("doc:", doc);
    return {id: doc.id, ...doc.data()} as Problem;
  } catch (error) {
    console.error("Error getting latest document:", error);
    return null;
  }
};
