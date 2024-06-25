import { Connection, PublicKey, clusterApiUrl, Transaction, SendTransactionError } from "@solana/web3.js";
import { defineNuxtPlugin } from "#app";
import { serialize } from 'borsh';
import { Buffer } from 'buffer';

class JoinQuiz {
  bet: bigint;
  fee: bigint;

  constructor(properties: { bet: bigint, fee: bigint }) {
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
    ]
  }]
]);

export default defineNuxtPlugin((nuxtApp) => {
  if (typeof window !== "undefined") {
    window.Buffer = Buffer;
  }

  const config = useRuntimeConfig()
  // .envファイルにCLUSTER_URLがセットされていなければ、devnetに接続
  const url: string = config.public.clusterUrl || clusterApiUrl("devnet")

  // const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const connection = new Connection(url, "confirmed");
  nuxtApp.provide("solana", {
    connection,
    PublicKey,
    async joinQuiz(wallet: any, programId: string, bet: number, fee: number) {
      try {
        const programIdPubKey = new PublicKey(programId);
        const participantPubKey = wallet.publicKey;
        console.log('programIdPubKey: ', programId)
        console.log('participantPubKey', wallet.publicKey)

        // convert from sol to lamports (1 sol = 1_000_000_000 lamports)
        const betBigInt = BigInt(Math.round(bet * 1_000_000_000));
        const feeBigInt = BigInt(Math.round(fee * 1_000_000_000));

        // serialize
        const instructionData = Buffer.concat([
          Buffer.from([0]),
          serialize(SCHEMA, new JoinQuiz({ bet: betBigInt, fee: feeBigInt }))])
        console.log("Serialized instruction data:", Buffer.from(instructionData).toString('hex'));

        const transaction = new Transaction().add({
          programId: programIdPubKey,
          keys: [
            { pubkey: participantPubKey, isSigner: true, isWritable: true },
            { pubkey: programIdPubKey, isSigner: false, isWritable: true }
          ],
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
        };

        await connection.confirmTransaction(strategy);

      } catch (error) {
        if (error instanceof SendTransactionError) {
          console.error("Transaction failed:", await error.getLogs(connection));
        } else {
          console.error("Failed to join the quiz:", error);
        }
        throw new Error("Failed to join the quiz");
      }
    }
  });
});
