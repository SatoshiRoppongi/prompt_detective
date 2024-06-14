/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import * as functions from 'firebase-functions';
import * as solanaWeb3 from '@solana/web3.js';
import * as borsh from 'borsh';


// 環境変数の型を定義
interface Config {
    solana: {
        payer_secret_key: string;
    };
}

const config: Config = functions.config() as Config;

// GameInstruction enumのBorshsシリアライズ設定
class SetScoreInstruction {
    instruction: number;
    scores: Array<[solanaWeb3.PublicKey, number]>;

    constructor(props: {scores: Array<[solanaWeb3.PublicKey, number]>}) {
        this.instruction = 1; // 1はSetScoresの指示
        this.scores = props.scores;
    }
}

const SetScoreInstructionSchema = new Map([
    [SetScoresInstruction, { kind: 'struct', fields: [['instruction', 'u8'], ['scores', [borsh.Tuple, solanaWeb3.PublicKey, 'u64']]] }],
]);

// スコアを設定するための関数
async function setScores(scores: Array<[solanaWeb3.PublicKey, number]>, programId: solanaWeb3.PublicKey, connection: solanaWeb3.Connection, payerKeypair: solanaWeb3.payerKeypair ) {
    // Game state アカウントを指定(デプロイ時に作成済みと仮定)
    // TODO: YOUR_GAME_STATE_ACCOUNT_PUBLIC_KEYはスマートコントラクトデプロイ後に払い出されるIDを埋める
    const gameStateAccount = new solanaWeb3.PublicKey('YOUR_GAME_STATE_ACCOUNT_PUBLIC_KEY');

    // インストラクションデータを作成
    const instructionData = new SetScoreInstruction({scores});
    const serializedData = borsh.serialize(SetScoreInstructionSchema, instructionData);

    // トランザクションの作成
    const transactions = new solanaWeb3.Transactions().add(
      new solanaWeb3.TransactionInstruction({
        keys: [
          { pubkey: gameStateAccount, isSigner: false, isWritable: true },
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
    const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [payerKeypair]);
    console.log('Transaction successful with signature:', signature);
}

// Firebase Function
export const setScores = functions.https.onRequest(async (req, res) => {
  try {
    const connection = new solanaWeb3.Connection(
      solanaWeb3.clusterApiUrl("devnet"),
      "confirmed"
    );
    // TODO:環境変数の設定
    // firebase functions:config:set solana.payer_secret_key="YOUR_PAYER_SECRET_KEY_ARRAY"

    const payerKeypair = solanaWeb3.Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(config.solana.payer_secret_key))
    ); // 環境変数から秘密鍵を取得
    const programId = new solanaWeb3.PublicKey("YOUR_PROGRAM_ID"); // デプロイしたプログラムのID

    // リクエストボディからスコアリストを取得
    const scores = req.body.scores.map(
      (item: { pubkey: string; score: number }) =>
        [new solanaWeb3.PublicKey(item.pubkey), item.score] as [
          solanaWeb3.PublicKey,
          number
        ]
    );

    await setScores(scores, programId, connection, payerKeypair);

    res.status(200).send("Scores set and SOL distributed based on scores!");
  } catch (error) {
    console.error('Error setting scores:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
