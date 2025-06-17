/* eslint-disable max-len */
import {Connection, PublicKey, clusterApiUrl, Transaction, TransactionInstruction, Keypair, VersionedTransaction, TransactionMessage} from "@solana/web3.js";
import {serialize} from "borsh";
import {Buffer} from "buffer";
import * as functions from "firebase-functions";

// Solana接続設定

const url = process.env.CLUSTER_URL || functions.config().solana?.cluster_url || clusterApiUrl("devnet");
const connection = new Connection(url, "confirmed");

// プログラムID
const programId = process.env.PROGRAM_ID || functions.config().solana?.program_id;

if (!programId) {
  console.warn("PROGRAM_IDが設定されていません。Solana機能は無効化されます。");
}

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

// GameInstruction定義
class DistributesInstruction {
  Distributes: { scores: Array<[string, number]> };

  constructor(properties: { scores: Array<[string, number]> }) {
    this.Distributes = properties;
  }
}

// スキーマ定義
const SCHEMA = new Map([
  [DistributesInstruction, {
    kind: "struct",
    fields: [
      ["Distributes", {
        kind: "struct",
        fields: [
          ["scores", [{
            kind: "seq",
            element: {
              kind: "tuple",
              elements: ["string", "u64"],
            },
          }]],
        ],
      }],
    ],
  }],
]);

export const distributes = async (scores: Array<[string, number]>) => {
  if (!programId) {
    console.warn("Solana functionality is disabled (PROGRAM_ID not configured). Distribution skipped.");
    console.log(`Mock distribution for ${scores.length} participants:`);
    scores.forEach(([address, score], index) => {
      console.log(`  ${index + 1}. ${address}: ${score} points`);
    });
    return;
  }

  if (!payer) {
    console.warn("Solana functionality is disabled (no payer configured). Distribution skipped.");
    console.log(`Mock distribution for ${scores.length} participants:`);
    scores.forEach(([address, score], index) => {
      console.log(`  ${index + 1}. ${address}: ${score} points`);
    });
    return;
  }
  const programIdPubKey = new PublicKey(programId);

  // シリアライズ
  const instructionData = serialize(SCHEMA, new DistributesInstruction({scores}));

  // scoresからparticipantAccountsを生成
  const participantAccounts = scores.map(([address]) => ({pubkey: new PublicKey(address), isSigner: false, isWritable: true}));

  const transaction = new Transaction().add(new TransactionInstruction({
    keys: [
      {pubkey: programIdPubKey, isSigner: false, isWritable: true},
      ...participantAccounts,
      {pubkey: payer.publicKey, isSigner: true, isWritable: true}, // 手数料返還用アカウント
      // 他に必要なアカウントがあれば追加
    ],
    programId: programIdPubKey,
    data: Buffer.from(instructionData),
  }));

  const {blockhash} = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions: transaction.instructions,
  }).compileToV0Message();

  const versionedTransaction = new VersionedTransaction(message);
  versionedTransaction.sign([payer]);

  const signature = await connection.sendTransaction(versionedTransaction);

  const strategy = {
    signature: signature,
    blockhash: blockhash,
    lastValidBlockHeight: (await connection.getBlockHeight()) + 150,
  };

  await connection.confirmTransaction(strategy);
};
