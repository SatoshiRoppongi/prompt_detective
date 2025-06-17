import { Connection, PublicKey, clusterApiUrl, Transaction, SendTransactionError, ComputeBudgetProgram, SystemProgram} from "@solana/web3.js";
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
        const participantPubKey = wallet.publicKey;
        console.log('participantPubKey', wallet.publicKey);
        console.log('bet:', bet, 'fee:', fee);

        // Use a real treasury account for testing (this will be the quiz pot)
        const treasuryPubKey = new PublicKey('Aqo52TCb2bvQ9AZoGrDo8iYQ9g5NHJoL5c44i3oVR6GE');
        
        // convert from sol to lamports (1 sol = 1_000_000_000 lamports)
        const totalAmount = Math.round((bet + fee) * 1_000_000_000);
        console.log('totalAmount in lamports:', totalAmount);

        // Create actual SOL transfer transaction
        const transaction = new Transaction();
        transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
        
        // Use Solana's built-in system transfer instruction
        const systemInstruction = SystemProgram.transfer({
          fromPubkey: participantPubKey,
          toPubkey: treasuryPubKey,
          lamports: totalAmount,
        });

        transaction.add(systemInstruction);

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = participantPubKey;

        // Sign and send the real transaction
        console.log('Sending real transaction to devnet...');
        const signedTransaction = await wallet.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());

        const strategy = {
          signature: signature,
          blockhash: blockhash,
          lastValidBlockHeight: (await connection.getBlockHeight()) + 150
        };

        console.log('Transaction sent, signature:', signature);
        await connection.confirmTransaction(strategy);
        console.log('✅ Transaction confirmed! Quiz joined successfully');
        
        return signature;

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
