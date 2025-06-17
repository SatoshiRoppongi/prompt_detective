/* eslint-disable max-len */
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as dotenv from "dotenv";

dotenv.config();

// Solana接続設定
const url = process.env.CLUSTER_URL || clusterApiUrl("devnet");
const connection = new Connection(url, "confirmed");

// プログラムID
const programId = process.env.PROGRAM_ID;
if (!programId) {
  throw new Error("PROGRAM_IDが設定されていません。");
}

// 秘密鍵の読み込み (開発・テスト環境でのみ使用)
let payer: Keypair | null = null;
const secretKeyString = process.env.SECRET_KEY;

if (secretKeyString) {
  const secretKeyArray = secretKeyString.split(",").map((num) => parseInt(num, 10));
  if (secretKeyArray.length === 64) {
    payer = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
  } else {
    console.warn("SECRET_KEYの形式が正しくありません。Solana機能は無効化されます。");
  }
} else {
  console.warn("SECRET_KEYが設定されていません。Solana機能は無効化されます。");
}

/**
 * 新しいゲームを初期化
 */
export const initializeGame = async (
  gameId: string,
  minBet: number = 0.1 * LAMPORTS_PER_SOL, // 0.1 SOL
  maxParticipants = 100,
  durationHours = 24
): Promise<string> => {
  if (!payer) {
    console.warn("Solana functionality is disabled (no payer configured). Game initialization skipped.");
    return `mock-signature-init-${gameId}-${Date.now()}`;
  }

  const programIdPubkey = new PublicKey(programId);

  // Game PDA (Program Derived Address) を生成
  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(gameId)],
    programIdPubkey
  );

  const endTime = Math.floor(Date.now() / 1000) + (durationHours * 60 * 60);

  // initialize_game命令データを作成
  const instructionData = Buffer.concat([
    Buffer.from([0]), // instruction discriminator for initialize_game
    Buffer.from(gameId.length.toString().padStart(4, "0")), // string length
    Buffer.from(gameId, "utf-8"), // game_id
    Buffer.from(minBet.toString().padStart(8, "0")), // min_bet (u64)
    Buffer.from(maxParticipants.toString().padStart(2, "0")), // max_participants (u16)
    Buffer.from(endTime.toString().padStart(8, "0")), // end_time (i64)
  ]);

  const instruction = new TransactionInstruction({
    keys: [
      {pubkey: gamePda, isSigner: false, isWritable: true},
      {pubkey: payer.publicKey, isSigner: true, isWritable: true},
      {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
    ],
    programId: programIdPubkey,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await connection.sendTransaction(transaction, [payer]);

  console.log(`✅ Game initialized: ${gameId}, signature: ${signature}`);
  return signature;
};

/**
 * ゲームを終了
 */
export const endGame = async (gameId: string): Promise<string> => {
  if (!payer) {
    console.warn("Solana functionality is disabled (no payer configured). Game end skipped.");
    return `mock-signature-end-${gameId}-${Date.now()}`;
  }

  const programIdPubkey = new PublicKey(programId);

  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(gameId)],
    programIdPubkey
  );

  // end_game命令データを作成
  const instructionData = Buffer.from([2]); // instruction discriminator for end_game

  const instruction = new TransactionInstruction({
    keys: [
      {pubkey: gamePda, isSigner: false, isWritable: true},
      {pubkey: payer.publicKey, isSigner: true, isWritable: false},
    ],
    programId: programIdPubkey,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await connection.sendTransaction(transaction, [payer]);

  console.log(`✅ Game ended: ${gameId}, signature: ${signature}`);
  return signature;
};

/**
 * 勝者に賞金を分配
 */
export const distributeWinnings = async (
  gameId: string,
  winnerPubkey: string,
  winnerAmount: number
): Promise<string> => {
  if (!payer) {
    console.warn(`Solana functionality is disabled (no payer configured). Winnings distribution skipped for ${winnerPubkey}: ${winnerAmount} lamports`);
    return `mock-signature-distribute-${gameId}-${Date.now()}`;
  }

  const programIdPubkey = new PublicKey(programId);
  const winnerPublicKey = new PublicKey(winnerPubkey);

  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(gameId)],
    programIdPubkey
  );

  // distribute_winnings命令データを作成
  const instructionData = Buffer.concat([
    Buffer.from([3]), // instruction discriminator for distribute_winnings
    winnerPublicKey.toBuffer(), // winner_pubkey (32 bytes)
    Buffer.from(winnerAmount.toString().padStart(8, "0")), // winner_amount (u64)
  ]);

  const instruction = new TransactionInstruction({
    keys: [
      {pubkey: gamePda, isSigner: false, isWritable: true},
      {pubkey: payer.publicKey, isSigner: true, isWritable: true},
      {pubkey: winnerPublicKey, isSigner: false, isWritable: true},
      {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
    ],
    programId: programIdPubkey,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await connection.sendTransaction(transaction, [payer]);

  console.log(`✅ Winnings distributed to ${winnerPubkey}: ${winnerAmount} lamports, signature: ${signature}`);
  return signature;
};

/**
 * ゲーム情報を取得
 */
export const getGameInfo = async (gameId: string): Promise<any> => {
  const programIdPubkey = new PublicKey(programId);

  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(gameId)],
    programIdPubkey
  );

  try {
    const accountInfo = await connection.getAccountInfo(gamePda);
    if (!accountInfo) {
      return null;
    }

    // デシリアライズロジックは実際のスマートコントラクトの構造に応じて実装
    return {
      address: gamePda.toBase58(),
      data: accountInfo.data,
      lamports: accountInfo.lamports,
    };
  } catch (error) {
    console.error("Failed to get game info:", error);
    return null;
  }
};

// 後方互換性のために既存のdistributes関数も保持
export const distributes = async (scores: Array<[string, number]>): Promise<void> => {
  if (scores.length === 0) return;

  // 最高スコアの参加者を勝者とする
  const winner = scores.reduce((prev, current) => {
    return prev[1] > current[1] ? prev : current;
  });

  const [winnerAddress, winnerScore] = winner;
  console.log(`🏆 Winner: ${winnerAddress} with score: ${winnerScore}`);

  // TODO: 実際の賞金額を計算し、distributeWinningsを呼び出す
  // 現在はモックとして処理をログ出力のみ
  console.log("🎉 Prize distribution completed (mock)");
};
