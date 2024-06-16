/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {onRequest} from "firebase-functions/v2/https";
/*
import * as logger from "firebase-functions/logger";

import * as functions from "firebase-functions";
import * as solanaWeb3 from "@solana/web3.js";
import * as borsh from "borsh";

// 環境変数の型を定義
interface Config {
  solana: {
    payer_secret_key: string;
  };
}

const config: Config = functions.config() as Config;

// プライヤースコアの構造体定義
class PlayerScore {
  pubkey: solanaWeb3.PublicKey;
  score: number;

  constructor(props: { pukey: solanaWeb3.PublicKey; score: number}) {
    this.pubkey = props.pubkey;
    this.score = props.score;
  }
}

// GameInstruction enumのBorshsシリアライズ設定
class SetScoreInstruction {
  instruction: number;
  scores: PlayerScore[];

  constructor(props: { scores: PlayerScore[] }) {
    this.instruction = 1; // 1はSetScoresの指示
    this.scores = props.scores;
  }
}

const PlayerScoreSchema = new Map([
  [
    PlayerScore,
    {
      kind: "struct",
      fields: [
        ["pubkey", "pubkey"],
        ["score", "u64"],
      ],
    },
  ],
]);

const SetScoreInstructionSchema = new Map([
  [
    SetScoresInstruction,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["scores", [PlayerScore]],
      ],
    },
  ],
]);

// スコアを設定するための関数
async function setScores(
  scores: Array<[solanaWeb3.PublicKey, number]>,
  programId: solanaWeb3.PublicKey,
  connection: solanaWeb3.Connection,
  payerKeypair: solanaWeb3.payerKeypair
) {
  // Game state アカウントを指定(デプロイ時に作成済みと仮定)
  // TODO: YOUR_GAME_STATE_ACCOUNT_PUBLIC_KEYはスマートコントラクトデプロイ後に払い出されるIDを埋める
  const gameStateAccount = new solanaWeb3.PublicKey(
    "YOUR_GAME_STATE_ACCOUNT_PUBLIC_KEY"
  );

  // インストラクションデータを作成
  const instructionData = new SetScoreInstruction({scores});
  const serializedData = borsh.serialize(
    SetScoreInstructionSchema,
    instructionData
  );

  // トランザクションの作成
  const transaction = new solanaWeb3.Transaction().add(
    new solanaWeb3.TransactionInstruction({
      keys: [
        {pubkey: gameStateAccount, isSigner: false, isWritable: true},
        ...scores.map(([pubkey]) => ({
          pubkey,
          isSigner: false,
          isWritable: true,
        })),
      ],
      programId: programId,
      data: Buffer.from(serializedData),
    })
  );

  // トランザクションを送信
  const signature = await solanaWeb3.sendAndConfirmTransaction(
    connection,
    transaction,
    [payerKeypair]
  );
  console.log("Transaction successful with signature:", signature);
}

// スコアを計算するための関数
function calculateScores(): PlayerScore[] {
  // ここにスコア計算ロジックを追加
  // 仮のスコア計算例
  return [
    new PlayerScore({
      pubkey: new solanaWeb3.PublicKey("PLAYER1_PUBLIC_KEY"),
      score: 50,
    }),
    new PlayerScore({
      pubkey: new solanaWeb3.PublicKey("PLAYER2_PUBLIC_KEY"),
      score: 30,
    }),
    new PlayerScore({
      pubkey: new solanaWeb3.PublicKey("PLAYER3_PUBLIC_KEY"),
      score: 20,
    }),
  ];
}

// Firebase Function
export const scheduledSetScores =
functions.pubsub.schedule("every day 19:00").
  timeZone("Asia/Tokyo").
  onRun(async (context) => {
    try {
      const connection = new solanaWeb3.Connection(
        solanaWeb3.clusterApiUrl("devnet"),
        "confirmed"
      );
      // TODO:環境変数の設定
      // firebase functions:config:set¥
      // solana.payer_secret_key="YOUR_PAYER_SECRET_KEY_ARRAY"

      const payerKeypair = solanaWeb3.Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(config.solana.payer_secret_key))
      ); // 環境変数から秘密鍵を取得
      // デプロイしたプログラムのID
      const programId = new solanaWeb3.PublicKey("YOUR_PROGRAM_ID");

      // リクエストボディからスコアリストを取得
      // TODO: firestoreからユーザ(publicKey)と回答文字列を取得。
      // 文字列と、secret_propmtを比較、文字列類似度を計算し、scores(0〜100までの整数)とする。
      const scores = calculateScores();

      await setScores(scores, programId, connection, payerKeypair);

      res.status(200).send("Scores set and SOL distributed based on scores!");
    } catch (error) {
      console.error("Error setting scores:", error);
    }
  });
  */

// TODO: 下記機能を満たす関数を追加する
// ・ユーザから問題に対する回答とpubkeyを取得し、firestoreに格納する(setScoresとは別endpoint)
//   ・別ファイルにしたほうがいいかも？
// ・文字列類似度を計算するロジック(word2vec?)-> scoreを0〜1の範囲に正規化

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
