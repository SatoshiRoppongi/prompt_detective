/* eslint-disable max-len */
import * as admin from "firebase-admin";
import * as crypto from "crypto";

const db = admin.firestore();
const securityLogsCollection = db.collection("security_logs");
const bannedUsersCollection = db.collection("banned_users");
const rateLimitCollection = db.collection("rate_limits");

export interface SecurityLog {
  id?: string;
  userId?: string;
  walletAddress: string;
  action: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
  timestamp: any;
  resolved: boolean;
}

export interface BannedUser {
  id?: string;
  walletAddress: string;
  reason: string;
  bannedBy: string;
  bannedAt: any;
  expiresAt?: any;
  permanent: boolean;
  appeals: Appeal[];
}

export interface Appeal {
  id: string;
  message: string;
  submittedAt: any;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: any;
  response?: string;
}

export interface RateLimit {
  id?: string;
  identifier: string; // wallet address or IP
  action: string;
  count: number;
  windowStart: any;
  blocked: boolean;
}

export interface AntiCheatResult {
  isValid: boolean;
  suspiciousActivities: string[];
  riskScore: number;
  recommendations: string[];
}

// Rate limiting configurations
const RATE_LIMITS = {
  quiz_participation: { maxAttempts: 5, windowMinutes: 60 },
  answer_submission: { maxAttempts: 3, windowMinutes: 5 },
  wallet_connection: { maxAttempts: 10, windowMinutes: 15 },
  api_requests: { maxAttempts: 100, windowMinutes: 1 },
};

// Security monitoring
export const logSecurityEvent = async (
  walletAddress: string,
  action: string,
  details: any,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'low',
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  try {
    const securityLog: SecurityLog = {
      walletAddress,
      action,
      details,
      severity,
      ipAddress,
      userAgent,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false,
    };

    await securityLogsCollection.add(securityLog);

    // Auto-escalate critical events
    if (severity === 'critical') {
      await handleCriticalSecurityEvent(walletAddress, action, details);
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

// Rate limiting
export const checkRateLimit = async (
  identifier: string,
  action: string
): Promise<{ allowed: boolean; remainingAttempts: number; resetTime?: Date }> => {
  try {
    const config = RATE_LIMITS[action as keyof typeof RATE_LIMITS];
    if (!config) {
      return { allowed: true, remainingAttempts: Infinity };
    }

    const rateLimitId = `${identifier}_${action}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000);

    const rateLimitDoc = await rateLimitCollection.doc(rateLimitId).get();
    
    if (!rateLimitDoc.exists) {
      // First request in window
      await rateLimitCollection.doc(rateLimitId).set({
        identifier,
        action,
        count: 1,
        windowStart: admin.firestore.FieldValue.serverTimestamp(),
        blocked: false,
      });
      
      return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
    }

    const rateLimitData = rateLimitDoc.data() as RateLimit;
    const windowStartTime = rateLimitData.windowStart.toDate();

    if (windowStartTime < windowStart) {
      // Window expired, reset
      await rateLimitCollection.doc(rateLimitId).update({
        count: 1,
        windowStart: admin.firestore.FieldValue.serverTimestamp(),
        blocked: false,
      });
      
      return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
    }

    if (rateLimitData.count >= config.maxAttempts) {
      // Rate limit exceeded
      const resetTime = new Date(windowStartTime.getTime() + config.windowMinutes * 60 * 1000);
      
      await logSecurityEvent(
        identifier,
        'rate_limit_exceeded',
        { action, count: rateLimitData.count, limit: config.maxAttempts },
        'medium'
      );

      return { allowed: false, remainingAttempts: 0, resetTime };
    }

    // Increment counter
    await rateLimitCollection.doc(rateLimitId).update({
      count: admin.firestore.FieldValue.increment(1),
    });

    return { allowed: true, remainingAttempts: config.maxAttempts - rateLimitData.count - 1 };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, remainingAttempts: 0 };
  }
};

// Anti-cheat system
export const validateQuizSubmission = async (
  walletAddress: string,
  quizId: string,
  submissionData: any
): Promise<AntiCheatResult> => {
  const suspiciousActivities: string[] = [];
  let riskScore = 0;
  const recommendations: string[] = [];

  try {
    // Check submission timing
    const timingAnalysis = await analyzeSubmissionTiming(walletAddress, submissionData);
    if (timingAnalysis.isSuspicious) {
      suspiciousActivities.push('異常な回答時間');
      riskScore += 30;
    }

    // Check for duplicate submissions
    const duplicateCheck = await checkDuplicateSubmissions(walletAddress, quizId);
    if (duplicateCheck.hasDuplicates) {
      suspiciousActivities.push('重複提出の試行');
      riskScore += 50;
      recommendations.push('アカウントを一時制限');
    }

    // Check wallet validation
    const walletValidation = await validateWalletSignature(walletAddress, submissionData);
    if (!walletValidation.isValid) {
      suspiciousActivities.push('無効なウォレット署名');
      riskScore += 70;
      recommendations.push('即座にアカウント凍結');
    }

    // Check for bot behavior patterns
    const botAnalysis = await analyzeBotBehavior(walletAddress);
    if (botAnalysis.isBotLike) {
      suspiciousActivities.push('Bot的な行動パターン');
      riskScore += 40;
      recommendations.push('追加検証が必要');
    }

    // Check submission content
    const contentAnalysis = await analyzeSubmissionContent(submissionData);
    if (contentAnalysis.isSuspicious) {
      suspiciousActivities.push('疑わしい回答内容');
      riskScore += 25;
    }

    // Log analysis results
    if (riskScore > 30) {
      await logSecurityEvent(
        walletAddress,
        'anti_cheat_analysis',
        {
          quizId,
          riskScore,
          suspiciousActivities,
          submissionData: { ...submissionData, prompt: '[REDACTED]' }
        },
        riskScore > 70 ? 'critical' : riskScore > 50 ? 'high' : 'medium'
      );
    }

    return {
      isValid: riskScore < 70,
      suspiciousActivities,
      riskScore,
      recommendations,
    };
  } catch (error: any) {
    console.error('Error in anti-cheat validation:', error);
    await logSecurityEvent(
      walletAddress,
      'anti_cheat_error',
      { error: error?.toString() || 'Unknown error', quizId },
      'high'
    );
    
    return {
      isValid: false,
      suspiciousActivities: ['システムエラー'],
      riskScore: 100,
      recommendations: ['手動レビューが必要'],
    };
  }
};

// User banning system
export const banUser = async (
  walletAddress: string,
  reason: string,
  bannedBy: string,
  permanent: boolean = false,
  expirationHours?: number
): Promise<void> => {
  try {
    const bannedUser: BannedUser = {
      walletAddress,
      reason,
      bannedBy,
      bannedAt: admin.firestore.FieldValue.serverTimestamp(),
      permanent,
      appeals: [],
    };

    if (!permanent && expirationHours) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);
      bannedUser.expiresAt = admin.firestore.Timestamp.fromDate(expiresAt);
    }

    await bannedUsersCollection.doc(walletAddress).set(bannedUser);

    await logSecurityEvent(
      walletAddress,
      'user_banned',
      { reason, bannedBy, permanent, expirationHours },
      'high'
    );
  } catch (error) {
    console.error('Error banning user:', error);
    throw new Error('Failed to ban user');
  }
};

export const checkUserBanned = async (walletAddress: string): Promise<{ banned: boolean; reason?: string; expiresAt?: Date }> => {
  try {
    const bannedDoc = await bannedUsersCollection.doc(walletAddress).get();
    
    if (!bannedDoc.exists) {
      return { banned: false };
    }

    const bannedData = bannedDoc.data() as BannedUser;
    
    // Check if temporary ban has expired
    if (!bannedData.permanent && bannedData.expiresAt) {
      const now = new Date();
      const expiresAt = bannedData.expiresAt.toDate();
      
      if (now > expiresAt) {
        // Ban expired, remove it
        await bannedUsersCollection.doc(walletAddress).delete();
        return { banned: false };
      }
      
      return { banned: true, reason: bannedData.reason, expiresAt };
    }

    return { banned: true, reason: bannedData.reason };
  } catch (error) {
    console.error('Error checking user ban status:', error);
    return { banned: false };
  }
};

// Helper functions for anti-cheat analysis
const analyzeSubmissionTiming = async (walletAddress: string, submissionData: any) => {
  // Check if submission time is too fast (likely bot) or suspiciously consistent
  const submissionTime = submissionData.processingTime || 0;
  
  // Too fast (less than 5 seconds)
  if (submissionTime < 5000) {
    return { isSuspicious: true, reason: 'submission_too_fast' };
  }

  // Get recent submission times for pattern analysis
  const recentSubmissions = await getRecentSubmissions(walletAddress, 10);
  
  if (recentSubmissions.length >= 3) {
    const times = recentSubmissions.map(s => s.processingTime || 0);
    const variance = calculateVariance(times);
    
    // Suspiciously consistent timing (variance too low)
    if (variance < 1000) {
      return { isSuspicious: true, reason: 'timing_too_consistent' };
    }
  }

  return { isSuspicious: false };
};

const checkDuplicateSubmissions = async (walletAddress: string, quizId: string) => {
  try {
    const participantsQuery = await db.collection('quizzes')
      .doc(quizId)
      .collection('participants')
      .where('walletAddress', '==', walletAddress)
      .get();

    return { hasDuplicates: participantsQuery.size > 1 };
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return { hasDuplicates: false };
  }
};

const validateWalletSignature = async (walletAddress: string, submissionData: any) => {
  // TODO: Implement actual wallet signature validation
  // For now, basic validation that wallet address is properly formatted
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const isValidFormat = solanaAddressRegex.test(walletAddress);
  return { isValid: isValidFormat };
};

const analyzeBotBehavior = async (walletAddress: string) => {
  try {
    // Check submission patterns
    const recentActivity = await getRecentSecurityLogs(walletAddress, 'quiz_participation', 24);
    
    if (recentActivity.length > 20) {
      return { isBotLike: true, reason: 'excessive_activity' };
    }

    // Check for identical patterns
    const submissions = await getRecentSubmissions(walletAddress, 5);
    const promptLengths = submissions.map(s => s.guessPrompt?.length || 0);
    
    if (promptLengths.length >= 3 && promptLengths.every(len => len === promptLengths[0])) {
      return { isBotLike: true, reason: 'identical_prompt_lengths' };
    }

    return { isBotLike: false };
  } catch (error) {
    console.error('Error analyzing bot behavior:', error);
    return { isBotLike: false };
  }
};

const analyzeSubmissionContent = async (submissionData: any) => {
  const prompt = submissionData.guessPrompt || '';
  
  // Check for obviously generated or spam content
  const spamKeywords = ['test', 'spam', 'bot', 'automated'];
  const hasSpamKeywords = spamKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword)
  );

  // Check for extremely short or long prompts
  const tooShort = prompt.length < 3;
  const tooLong = prompt.length > 500;

  return { 
    isSuspicious: hasSpamKeywords || tooShort || tooLong,
    reasons: [
      ...(hasSpamKeywords ? ['spam_keywords'] : []),
      ...(tooShort ? ['prompt_too_short'] : []),
      ...(tooLong ? ['prompt_too_long'] : [])
    ]
  };
};

// Critical security event handler
const handleCriticalSecurityEvent = async (
  walletAddress: string,
  action: string,
  details: any
): Promise<void> => {
  try {
    // Auto-ban for critical security violations
    if (action === 'wallet_signature_fraud' || action === 'multiple_duplicate_submissions') {
      await banUser(
        walletAddress,
        `Automatic ban due to: ${action}`,
        'system',
        false,
        24 // 24 hour ban
      );
    }

    // TODO: Send alerts to administrators
    console.log(`CRITICAL SECURITY EVENT: ${action} for wallet ${walletAddress}`, details);
  } catch (error) {
    console.error('Error handling critical security event:', error);
  }
};

// Utility functions
const getRecentSubmissions = async (walletAddress: string, limit: number) => {
  try {
    const query = await db.collectionGroup('participants')
      .where('walletAddress', '==', walletAddress)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return query.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting recent submissions:', error);
    return [];
  }
};

const getRecentSecurityLogs = async (walletAddress: string, action: string, hours: number) => {
  try {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    const query = await securityLogsCollection
      .where('walletAddress', '==', walletAddress)
      .where('action', '==', action)
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(hoursAgo))
      .get();

    return query.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting recent security logs:', error);
    return [];
  }
};

const calculateVariance = (numbers: number[]): number => {
  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
};

// Generate secure tokens
export const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash sensitive data
export const hashData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Security middleware functions
export const validateApiKey = (apiKey: string): boolean => {
  // TODO: Implement proper API key validation
  return Boolean(apiKey && apiKey.length > 10);
};

export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  
  return input;
};

export const getSecurityStats = async (timeframe: 'day' | 'week' | 'month' = 'week') => {
  try {
    const now = new Date();
    let startTime: Date;

    switch (timeframe) {
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [securityLogs, bannedUsers, rateLimits] = await Promise.all([
      securityLogsCollection
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startTime))
        .get(),
      bannedUsersCollection
        .where('bannedAt', '>=', admin.firestore.Timestamp.fromDate(startTime))
        .get(),
      rateLimitCollection
        .where('windowStart', '>=', admin.firestore.Timestamp.fromDate(startTime))
        .where('blocked', '==', true)
        .get()
    ]);

    const logsBySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    securityLogs.docs.forEach(doc => {
      const data = doc.data() as SecurityLog;
      logsBySeverity[data.severity]++;
    });

    return {
      timeframe,
      totalSecurityEvents: securityLogs.size,
      eventsBySeverity: logsBySeverity,
      newBans: bannedUsers.size,
      rateLimitViolations: rateLimits.size,
      activeBans: await getActiveBansCount(),
    };
  } catch (error) {
    console.error('Error getting security stats:', error);
    throw new Error('Failed to get security statistics');
  }
};

const getActiveBansCount = async (): Promise<number> => {
  try {
    const now = admin.firestore.Timestamp.now();
    const activeBans = await bannedUsersCollection
      .where('permanent', '==', true)
      .get();
    
    const temporaryBans = await bannedUsersCollection
      .where('permanent', '==', false)
      .where('expiresAt', '>', now)
      .get();

    return activeBans.size + temporaryBans.size;
  } catch (error) {
    console.error('Error getting active bans count:', error);
    return 0;
  }
};