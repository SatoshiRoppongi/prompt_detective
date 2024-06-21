// plugins/solana.ts
import { Connection, PublicKey, clusterApiUrl, Transaction } from "@solana/web3.js";
import { defineNuxtPlugin } from "#app";
import { serialize } from 'borsh';
import { Buffer } from 'buffer';

class QuizInstruction {
  JoinQuiz: { bet: number, fee: number};

  constructor(properties: { bet: number, fee:number }) {
    this.JoinQuiz = properties;
  }
}

const SCHEMA = new Map([
  [QuizInstruction, {
    kind: 'struct',
    fields: [
      ['JoinQuiz', {
        kind: 'struct', fields: [
          ['bet', 'u64'],
          ['fee', 'u64']
      ]}]
  ]}]
]);


export default defineNuxtPlugin((nuxtApp) => {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  nuxtApp.provide("solana", {
    connection,
    PublicKey,
    async joinQuiz(wallet: any, programId: string, bet: number, fee:number) {
      const programIdPubKey = new PublicKey(programId);
      const participantPubKey = wallet.publicKey;

      // serialize
      const instructionData = serialize(SCHEMA, new QuizInstruction({ bet, fee }));

      const transaction = new Transaction().add({
        keys: [
          { pubkey: participantPubKey, isSigner: true, isWritable: true },
          { pubkey: programIdPubKey, isSigner: false, isWritable: true }
        ],
        programId: programIdPubKey,
        data: Buffer.from(instructionData)
      });

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = participantPubKey;

      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      const strategy = {
        signature: signature,
        blockhash: blockhash,
        lastValidBlockHeight: (await connection.getBlockHeight()) + 150
      }

      await connection.confirmTransaction(strategy);
    }
  });
});

