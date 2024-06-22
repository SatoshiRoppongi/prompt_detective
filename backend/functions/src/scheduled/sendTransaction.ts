/* eslint-disable max-len */
import {Connection, PublicKey, clusterApiUrl, Transaction, TransactionInstruction, Keypair} from "@solana/web3.js";
import {serialize} from "borsh";
import {Buffer} from "buffer";

// Solana接続設定
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// プログラムID
const programId = "YOUR_PROGRAM_ID";
const payer = Keypair.fromSecretKey(Uint8Array.from([
  /* シークレットキーのバイト配列 */
  // envファイルから？
]));

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

const distributes = async (scores: Array<[string, number]>, participantAccounts: Array<string>) => {
  const programIdPubKey = new PublicKey(programId);

  // シリアライズ
  const instructionData = serialize(SCHEMA, new DistributesInstruction({scores}));

  const transaction = new Transaction().add(new TransactionInstruction({
    keys: [
      {pubkey: programIdPubKey, isSigner: false, isWritable: true},
      ...participantAccounts.map((participant) => ({pubkey: new PublicKey(participant), isSigner: false, isWritable: true})),
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
