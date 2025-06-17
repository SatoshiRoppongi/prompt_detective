/* eslint-disable max-len */

// 手動で実行するスクリプトです.
// クライアントアプリやスケジュールトリガーからは呼ばれません

import {Connection, PublicKey, clusterApiUrl, Transaction, TransactionInstruction, Keypair, SystemProgram, VersionedTransaction, TransactionMessage, sendAndConfirmTransaction, ComputeBudgetProgram} from "@solana/web3.js";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.CLUSTER_URL || clusterApiUrl("devnet");
const connection = new Connection(url, "confirmed");

// プログラムID
const programId = process.env.PROGRAM_ID;

// 秘密鍵の読み込みとUint8Arrayへの変換
let payer: Keypair | null = null;
const secretKeyString = process.env.SECRET_KEY;

if (secretKeyString) {
  const secretKeyArray = secretKeyString.split(",").map((num) => parseInt(num, 10));
  if (secretKeyArray.length === 64) {
    payer = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray), {
      skipValidation: false,
    });
  } else {
    console.warn("SECRET_KEYの形式が正しくありません。Solana機能は無効化されます。");
  }
} else {
  console.warn("SECRET_KEYが設定されていません。Solana機能は無効化されます。");
}

export const createQuizStateAccount = async () => {
  if (!payer) {
    console.warn("Solana functionality is disabled (no payer configured). Quiz state account creation skipped.");
    return new PublicKey("11111111111111111111111111111111"); // System Program ID as mock
  }

  try {
    const quizStateKeyPair = Keypair.generate();

    // アカウントサイズを適切に計算（例: 1000バイト）
    // const accountSize = 1000;
    // const accountSize = 100;
    // const accountSize = 4024;
    const accountSize = 424;
    const lamports = await connection.getMinimumBalanceForRentExemption(accountSize);

    if (!programId) {
      throw new Error("programId is not defined");
    }

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: quizStateKeyPair.publicKey,
        lamports,
        space: accountSize,
        programId: new PublicKey(programId),
      })
    );
    transaction.add(ComputeBudgetProgram.setComputeUnitLimit({units: 1_000_000}));

    const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions: transaction.instructions,
    }).compileToV0Message();

    const versionedTransaction = new VersionedTransaction(message);
    versionedTransaction.sign([payer, quizStateKeyPair]);

    // トランザクションを送信し、確認を待つ
    const signature = await connection.sendTransaction(versionedTransaction);
    await connection.confirmTransaction({signature, blockhash, lastValidBlockHeight});

    console.log(`QuizState account created: ${quizStateKeyPair.publicKey.toBase58()}`);

    // ここでQuizStateの初期化命令を送信する（別途実装が必要）
    await initializeQuizState(quizStateKeyPair.publicKey);

    return quizStateKeyPair.publicKey;
  } catch (error) {
    console.error("Failed to create QuizState account:", error);
    throw error;
  }
};

// QuizStateの初期化関数（別途実装が必要）
async function initializeQuizState(
  quizStatePubkey: PublicKey,
) {
  if (!payer) {
    console.warn("Solana functionality is disabled (no payer configured). Quiz state initialization skipped.");
    return;
  }

  try {
    // 初期化命令のデータを作成
    /*
    const instructionData = Buffer.from([
      0, // 命令の識別子（例: 0 = 初期化）
      // 必要に応じて追加のパラメータをここに含める
      ...Buffer.alloc(64), // 64バイトの空データを追加（例として）

    ]);
    */
    const instructionData = Buffer.from([0]); // 命令の識別子（例: 0 = 初期化）
    // 必要に応じて追加のパラメータをここに含める

    if (!programId) {
      throw new Error("programId is not defined");
    }
    const programIdPubKey = new PublicKey(programId);

    console.log("programId; ", programId);

    // 初期化命令を作成
    const initializeInstruction = new TransactionInstruction({
      keys: [
        {pubkey: quizStatePubkey, isSigner: false, isWritable: true},
        {pubkey: payer.publicKey, isSigner: true, isWritable: false},
      ],
      programId: programIdPubKey,
      data: instructionData,
    });

    // トランザクションを作成し、命令を追加
    const transaction = new Transaction().add(initializeInstruction);

    // トランザクションを送信し、確認を待つ
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer] // 署名者
    );

    console.log(`QuizState initialized. Transaction signature: ${signature}`);
  } catch (error) {
    console.error("Failed to initialize QuizState:", error);
    throw error;
  }
}

const callCreateQuizStateAccount = async () => {
  try {
    const publicKey = await createQuizStateAccount();
    return publicKey;
  } catch (error) {
    console.error(`Error in CreatedQuizStateAccount: ${error}`);
    return new PublicKey("11111111111111111111111111111111"); // Return mock key on error
  }
};

callCreateQuizStateAccount();

