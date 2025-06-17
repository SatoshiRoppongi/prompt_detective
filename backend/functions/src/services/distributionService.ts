import * as admin from "firebase-admin";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl, Keypair } from "@solana/web3.js";
import { QuizResult, updateDistributionStatus } from "./resultCalculationService";
import * as dotenv from "dotenv";

dotenv.config();

const db = admin.firestore();

// Solana connection setup
const url = process.env.CLUSTER_URL || clusterApiUrl("devnet");
const connection = new Connection(url, "confirmed");

// Get the treasury keypair from environment
const secretKeyString = process.env.SECRET_KEY;
if (!secretKeyString) {
  throw new Error("SECRET_KEY not configured");
}

const secretKeyArray = secretKeyString.split(",").map((num) => parseInt(num, 10));
const treasuryKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));

// Platform settings
const PLATFORM_WALLET = process.env.PLATFORM_WALLET || treasuryKeypair.publicKey.toString();

export interface DistributionTransaction {
  quizId: string;
  signature: string;
  recipient: string;
  amount: number;
  type: 'prize' | 'platform_fee';
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
  confirmedAt?: Date;
  error?: string;
}

export interface DistributionSummary {
  quizId: string;
  totalDistributed: number;
  totalPrize: number;
  platformFee: number;
  successfulTransactions: number;
  failedTransactions: number;
  status: 'pending' | 'completed' | 'partial' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * クイズ結果に基づいて賞金を分配する
 */
export const distributeQuizPrizes = async (quizResult: QuizResult): Promise<DistributionSummary> => {
  console.log(`🎯 Starting prize distribution for quiz: ${quizResult.quizId}`);
  
  try {
    // Create distribution summary
    const distributionSummary: DistributionSummary = {
      quizId: quizResult.quizId,
      totalDistributed: 0,
      totalPrize: 0,
      platformFee: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      status: 'pending',
      createdAt: new Date()
    };

    // Save initial distribution summary
    await saveDistributionSummary(distributionSummary);
    
    const transactions: DistributionTransaction[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    // Distribute prizes to winners
    for (const winner of quizResult.winners) {
      try {
        const signature = await transferSOL(
          winner.walletAddress, 
          winner.prize,
          `Prize for quiz ${quizResult.quizId}`
        );

        const transaction: DistributionTransaction = {
          quizId: quizResult.quizId,
          signature,
          recipient: winner.walletAddress,
          amount: winner.prize,
          type: 'prize',
          status: 'pending',
          createdAt: new Date()
        };

        // Save transaction record
        await saveDistributionTransaction(transaction);
        transactions.push(transaction);

        console.log(`✅ Prize transferred to ${winner.walletAddress}: ${winner.prize / LAMPORTS_PER_SOL} SOL`);
        totalSuccess++;
        distributionSummary.totalPrize += winner.prize;

      } catch (error) {
        console.error(`❌ Failed to transfer prize to ${winner.walletAddress}:`, error);
        
        const failedTransaction: DistributionTransaction = {
          quizId: quizResult.quizId,
          signature: '',
          recipient: winner.walletAddress,
          amount: winner.prize,
          type: 'prize',
          status: 'failed',
          createdAt: new Date(),
          error: (error as Error).message
        };

        await saveDistributionTransaction(failedTransaction);
        transactions.push(failedTransaction);
        totalFailed++;
      }
    }

    // Handle platform fee
    const platformFeeDetail = quizResult.distributionDetails.find(d => d.type === 'platform_fee');
    if (platformFeeDetail && platformFeeDetail.amount > 0) {
      try {
        const signature = await transferSOL(
          PLATFORM_WALLET,
          platformFeeDetail.amount,
          `Platform fee for quiz ${quizResult.quizId}`
        );

        const feeTransaction: DistributionTransaction = {
          quizId: quizResult.quizId,
          signature,
          recipient: PLATFORM_WALLET,
          amount: platformFeeDetail.amount,
          type: 'platform_fee',
          status: 'pending',
          createdAt: new Date()
        };

        await saveDistributionTransaction(feeTransaction);
        transactions.push(feeTransaction);
        distributionSummary.platformFee = platformFeeDetail.amount;
        totalSuccess++;

        console.log(`✅ Platform fee transferred: ${platformFeeDetail.amount / LAMPORTS_PER_SOL} SOL`);
      } catch (error) {
        console.error(`❌ Failed to transfer platform fee:`, error);
        totalFailed++;
      }
    }

    // Update distribution summary
    distributionSummary.totalDistributed = distributionSummary.totalPrize + distributionSummary.platformFee;
    distributionSummary.successfulTransactions = totalSuccess;
    distributionSummary.failedTransactions = totalFailed;
    distributionSummary.status = totalFailed === 0 ? 'completed' : totalSuccess > 0 ? 'partial' : 'failed';
    distributionSummary.completedAt = new Date();

    await saveDistributionSummary(distributionSummary);

    // Update quiz result status
    if (totalFailed === 0) {
      await updateDistributionStatus(quizResult.quizId, 'distributed');
    } else {
      await updateDistributionStatus(quizResult.quizId, 'failed', 
        `${totalFailed} transactions failed out of ${totalSuccess + totalFailed}`);
    }

    console.log(`🎉 Distribution completed for quiz ${quizResult.quizId}: ${totalSuccess} success, ${totalFailed} failed`);
    
    // Start transaction confirmation monitoring
    monitorTransactionConfirmations(transactions);

    return distributionSummary;

  } catch (error) {
    console.error('Error in prize distribution:', error);
    await updateDistributionStatus(quizResult.quizId, 'failed', `Distribution error: ${error}`);
    throw error;
  }
};

/**
 * SOL転送を実行
 */
const transferSOL = async (
  recipientAddress: string, 
  lamports: number, 
  memo?: string
): Promise<string> => {
  try {
    const recipient = new PublicKey(recipientAddress);
    
    // Check treasury balance
    const balance = await connection.getBalance(treasuryKeypair.publicKey);
    if (balance < lamports) {
      throw new Error(`Insufficient treasury balance. Required: ${lamports}, Available: ${balance}`);
    }

    // Create transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipient,
        lamports: lamports,
      })
    );

    // Add memo if provided
    if (memo) {
      const memoInstruction = new Transaction().add({
        keys: [],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from(memo, "utf8"),
      });
      transaction.add(...memoInstruction.instructions);
    }

    // Sign and send transaction
    const signature = await connection.sendTransaction(transaction, [treasuryKeypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    console.log(`Transaction sent: ${signature}`);
    return signature;

  } catch (error) {
    console.error('Error in SOL transfer:', error);
    throw error;
  }
};

/**
 * トランザクション確認を監視
 */
const monitorTransactionConfirmations = async (transactions: DistributionTransaction[]) => {
  console.log(`📊 Monitoring ${transactions.length} transactions for confirmation`);
  
  for (const transaction of transactions) {
    if (transaction.signature && transaction.status === 'pending') {
      try {
        // Wait for confirmation (max 30 seconds)
        const confirmation = await connection.confirmTransaction(transaction.signature, 'confirmed');
        
        if (confirmation.value.err) {
          transaction.status = 'failed';
          transaction.error = `Transaction failed: ${confirmation.value.err}`;
          console.error(`❌ Transaction failed: ${transaction.signature}`);
        } else {
          transaction.status = 'confirmed';
          transaction.confirmedAt = new Date();
          console.log(`✅ Transaction confirmed: ${transaction.signature}`);
        }

        // Update transaction status in Firestore
        await updateDistributionTransaction(transaction);

      } catch (error) {
        console.error(`❌ Error confirming transaction ${transaction.signature}:`, error);
        transaction.status = 'failed';
        transaction.error = `Confirmation error: ${error}`;
        await updateDistributionTransaction(transaction);
      }
    }
  }
};

/**
 * 分配サマリーをFirestoreに保存
 */
const saveDistributionSummary = async (summary: DistributionSummary): Promise<void> => {
  try {
    const summaryRef = db.collection('distribution_summaries').doc(summary.quizId);
    await summaryRef.set({
      ...summary,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: summary.completedAt ? admin.firestore.FieldValue.serverTimestamp() : null
    });
  } catch (error) {
    console.error('Error saving distribution summary:', error);
    throw error;
  }
};

/**
 * 分配トランザクションをFirestoreに保存
 */
const saveDistributionTransaction = async (transaction: DistributionTransaction): Promise<void> => {
  try {
    const transactionRef = db.collection('distribution_transactions').doc();
    await transactionRef.set({
      ...transaction,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      confirmedAt: transaction.confirmedAt ? admin.firestore.FieldValue.serverTimestamp() : null
    });
  } catch (error) {
    console.error('Error saving distribution transaction:', error);
    throw error;
  }
};

/**
 * 分配トランザクションのステータスを更新
 */
const updateDistributionTransaction = async (transaction: DistributionTransaction): Promise<void> => {
  try {
    const querySnapshot = await db.collection('distribution_transactions')
      .where('quizId', '==', transaction.quizId)
      .where('signature', '==', transaction.signature)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      await doc.ref.update({
        status: transaction.status,
        error: transaction.error || null,
        confirmedAt: transaction.confirmedAt ? admin.firestore.FieldValue.serverTimestamp() : null
      });
    }
  } catch (error) {
    console.error('Error updating distribution transaction:', error);
  }
};

/**
 * 分配履歴を取得
 */
export const getDistributionHistory = async (
  quizId?: string,
  limit: number = 50
): Promise<{ summaries: DistributionSummary[], transactions: DistributionTransaction[] }> => {
  try {
    let summariesQuery = db.collection('distribution_summaries')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    let transactionsQuery = db.collection('distribution_transactions')
      .orderBy('createdAt', 'desc')
      .limit(limit * 5); // More transactions than summaries

    if (quizId) {
      summariesQuery = summariesQuery.where('quizId', '==', quizId);
      transactionsQuery = transactionsQuery.where('quizId', '==', quizId);
    }

    const [summariesSnapshot, transactionsSnapshot] = await Promise.all([
      summariesQuery.get(),
      transactionsQuery.get()
    ]);

    const summaries = summariesSnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate()
    } as DistributionSummary));

    const transactions = transactionsSnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      confirmedAt: doc.data().confirmedAt?.toDate()
    } as DistributionTransaction));

    return { summaries, transactions };

  } catch (error) {
    console.error('Error getting distribution history:', error);
    return { summaries: [], transactions: [] };
  }
};

/**
 * 財務統計を取得
 */
export const getTreasuryStats = async (): Promise<{
  currentBalance: number;
  totalDistributed: number;
  totalFees: number;
  pendingDistributions: number;
}> => {
  try {
    // Get current treasury balance
    const currentBalance = await connection.getBalance(treasuryKeypair.publicKey);

    // Get distribution statistics
    const { summaries } = await getDistributionHistory(undefined, 100);
    
    const totalDistributed = summaries.reduce((sum, s) => sum + s.totalPrize, 0);
    const totalFees = summaries.reduce((sum, s) => sum + s.platformFee, 0);
    const pendingDistributions = summaries
      .filter(s => s.status === 'pending' || s.status === 'partial')
      .reduce((sum, s) => sum + s.totalDistributed, 0);

    return {
      currentBalance,
      totalDistributed,
      totalFees,
      pendingDistributions
    };

  } catch (error) {
    console.error('Error getting treasury stats:', error);
    return {
      currentBalance: 0,
      totalDistributed: 0,
      totalFees: 0,
      pendingDistributions: 0
    };
  }
};