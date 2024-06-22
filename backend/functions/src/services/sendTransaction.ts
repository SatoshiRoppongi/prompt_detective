/* eslint-disable max-len */
import {Connection, PublicKey, clusterApiUrl, Transaction, TransactionInstruction, Keypair} from "@solana/web3.js";
import {serialize} from "borsh";
import {Buffer} from "buffer";

// Solana接続設定
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

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
console.log("aaaaaaaaaaa", Uint8Array.from(secretKeyArray));
if (secretKeyArray.length !== 64) {
  throw new Error("SECRET_KEYの長さが正しくありません。");
}

const payer = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray), {
  skipValidation: true,
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

const distributes = async (scores: Array<[string, number]>) => {
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
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer.publicKey;

  transaction.sign(payer);
  const signature = await connection.sendRawTransaction(transaction.serialize());

  const strategy = {
    signature: signature,
    blockhash: blockhash,
    lastValidBlockHeight: (await connection.getBlockHeight()) + 150,
  };

  await connection.confirmTransaction(strategy);
};

export default distributes;
