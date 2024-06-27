/* eslint-disable max-len */
import {Connection, PublicKey, clusterApiUrl, Transaction, TransactionInstruction, Keypair, VersionedTransaction, TransactionMessage} from "@solana/web3.js";
import {serialize} from "borsh";
import {Buffer} from "buffer";

// Solana接続設定

const url = process.env.CLUSTER_URL || clusterApiUrl("devnet");
const connection = new Connection(url, "confirmed");

// プログラムID
const programId = process.env.PROGRAM_ID;

if (!programId) {
  throw new Error("PROGRAM_IDが設定されていません。");
}

// 秘密鍵の読み込みとUint8Arrayへの変換
const secretKeyString = process.env.SECRET_KEY;
if (!secretKeyString) {
  throw new Error("SECRET_KEYが設定されていません。");
}

const secretKeyArray = secretKeyString.split(",").map((num) => parseInt(num, 10));
if (secretKeyArray.length !== 64) {
  throw new Error("SECRET_KEYの長さが正しくありません。");
}

const payer = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray), {
  skipValidation: false,
});

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
    // TODO: 適切なハンドリングをする
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
