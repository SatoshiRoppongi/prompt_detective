// plugins/solana.ts
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin((nuxtApp) => {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  nuxtApp.provide("solana", { connection, PublicKey });
});

