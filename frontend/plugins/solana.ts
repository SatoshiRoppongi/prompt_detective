// plugins/solana.ts
import { Connection, PublicKey, clusterApiUrl, Transaction, SendTransactionError } from "@solana/web3.js";
import { defineNuxtPlugin } from "#app";
import { serialize } from 'borsh';
import { Buffer } from 'buffer';

class JoinQuiz {
  bet: bigint;
  fee: bigint;

  constructor(properties: { bet: bigint, fee:bigint }) {
    this.bet = properties.bet;
    this.fee = properties.fee;
    }
}

const SCHEMA = new Map([
  [JoinQuiz, {
    kind: 'struct',
    fields: [
          ['bet', 'u64'],
          ['fee', 'u64']
  ]}]
]);


export default defineNuxtPlugin((nuxtApp) => {
  if (typeof window !== "undefined") {
    window.Buffer = Buffer;
  }
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  nuxtApp.provide("solana", {
    connection,
    PublicKey,
    async joinQuiz(wallet: any, programId: string, bet: number, fee:number) {
      try {
        console.log("programId:", programId);
        console.log("wallet.publicKey:", wallet.publicKey);
        const programIdPubKey = new PublicKey(programId);
        const participantPubKey = wallet.publicKey;

      // convert from sol to lamports(1sol = 1000000000 lamports)
        const betBigInt = BigInt(Math.round(bet * 1_000_000_000));
        const feeBigInt = BigInt(Math.round(fee * 1_000_000_000));

        // serialize
        const instructionData = serialize(SCHEMA, new JoinQuiz({ bet: betBigInt, fee: feeBigInt }));
        console.log("Serialized instruction data:", Buffer.from(instructionData).toString('hex'));


        const transaction = new Transaction().add({
          programId: programIdPubKey,
          keys: [
            { pubkey: participantPubKey, isSigner: true, isWritable: true },
            { pubkey: programIdPubKey, isSigner: false, isWritable: true }
          ],
          data: Buffer.from(instructionData)
        });
        console.log('a')

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = participantPubKey;

        console.log('b')
        const signedTransaction = await wallet.signTransaction(transaction);

        console.log('c')
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        console.log('d')

        const strategy = {
          signature: signature,
          blockhash: blockhash,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        }
        console.log('e')

        await connection.confirmTransaction(strategy);
        console.log('f')

      } catch (error) {
        if (error instanceof SendTransactionError) {
          console.error("Transaction failed:", error);
        }
        console.error("Failed to join the quiz:", error);
      }
    }
  });
});

