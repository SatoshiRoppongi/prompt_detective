import * as admin from "firebase-admin";
import {DocumentData} from "@google-cloud/firestore";

const db = admin.firestore();
const usersCollection = db.collection("users");

export const createUser = async (data: DocumentData) => {
  const userRef = await usersCollection.add(data);
  const user = await userRef.get();
  return user.data();
};

export const getUser = async (id: string) => {
  return await usersCollection.doc(id).get();
};

export const updateUser = async (id: string, data: DocumentData) => {
  const userRef = usersCollection.doc(id);
  await userRef.set(data, {merge: true});
  const user = await userRef.get();
  return user.data();
};

export const deleteUser = async (id: string) => {
  await usersCollection.doc(id).delete();
};
