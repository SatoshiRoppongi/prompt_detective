/* eslint-disable max-len */
import * as admin from "firebase-admin";
// import {DocumentData} from "@google-cloud/firestore";

const db = admin.firestore();
const usersCollection = db.collection("users");

interface User {
  id?: string;
  name: string | null;
  walletAddress: string;
  // todo: 必要なら他のユーザ情報を定義
}

export const createUser = async (user: User): Promise<User> => {
  if (!user.name) {
    user.name = user.walletAddress;
  }
  const docRef = await usersCollection.add(user);
  return {id: docRef.id, ...user};
};

export const getUser = async (id: string): Promise<User | null> => {
  const doc = await usersCollection.doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return {id: doc.id, ...doc.data()} as User;
};

export const getUserByWalletAddress = async (walletAddress: string): Promise<User | null> => {
  console.log("test:", walletAddress);
  const snapshot = await usersCollection.where("walletAddress", "==", walletAddress).limit(1).get();
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return {id: doc.id, ...doc.data()} as User;
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  await usersCollection.doc(id).update(user);
};

export const deleteUser = async (id: string): Promise<void> => {
  await usersCollection.doc(id).delete();
};
