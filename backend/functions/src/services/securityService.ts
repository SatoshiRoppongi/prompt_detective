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
    // Clean up undefined values to avoid Firestore errors
    const cleanDetails = details ? JSON.parse(JSON.stringify(details, (key, value) => 
      value === undefined ? null : value
    )) : {};
    
    // Ensure required fields are never undefined
    const safeIpAddress = ipAddress || 'unknown';
    const safeUserAgent = userAgent || 'unknown';

    const securityLog: SecurityLog = {
      walletAddress,
      action,
      details: cleanDetails,
      severity,
      ipAddress: safeIpAddress,
      userAgent: safeUserAgent,
      timestamp: new Date().toISOString(),
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
        windowStart: new Date().toISOString(),
        blocked: false,
      });
      
      return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
    }

    const rateLimitData = rateLimitDoc.data() as RateLimit;
    const windowStartTime = new Date(rateLimitData.windowStart);

    if (windowStartTime < windowStart) {
      // Window expired, reset
      await rateLimitCollection.doc(rateLimitId).update({
        count: 1,
        windowStart: new Date().toISOString(),
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
        'medium',
        'unknown', // ipAddress
        'unknown'  // userAgent
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
  try {
    console.log(`🔍 Validating submission for ${walletAddress} in quiz ${quizId} - simplified mode`);
    
    // Temporarily simplified validation to avoid complex database queries and errors
    const suspiciousActivities: string[] = [];
    const riskScore = 0;
    const recommendations: string[] = [];
    const isValid = true;

    // Log validation result with minimal data
    await logSecurityEvent(
      walletAddress,
      'anti_cheat_validation',
      {
        quizId,
        riskScore,
        isValid,
        mode: 'simplified'
      },
      'low',
      'unknown', // ipAddress
      'unknown'  // userAgent
    );

    return {
      isValid,
      suspiciousActivities,
      riskScore,
      recommendations
    };
  } catch (error: any) {
    console.error('Error in anti-cheat validation:', error);
    await logSecurityEvent(
      walletAddress,
      'anti_cheat_error',
      { error: error?.toString() || 'Unknown error', quizId },
      'high',
      'unknown', // ipAddress
      'unknown'  // userAgent
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
      bannedUser.expiresAt = expiresAt.toISOString();
    }

    await bannedUsersCollection.doc(walletAddress).set(bannedUser);

    await logSecurityEvent(
      walletAddress,
      'user_banned',
      { reason, bannedBy, permanent, expirationHours },
      'high',
      'unknown', // ipAddress
      'unknown'  // userAgent
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
      const expiresAt = new Date(bannedData.expiresAt);
      
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

// Helper functions for anti-cheat analysis - simplified for development mode
// TODO: Implement full anti-cheat system when needed

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

// Utility functions removed for simplified security mode
// TODO: Re-implement when full anti-cheat system is needed

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
        .where('timestamp', '>=', startTime.toISOString())
        .get(),
      bannedUsersCollection
        .where('bannedAt', '>=', startTime.toISOString())
        .get(),
      rateLimitCollection
        .where('windowStart', '>=', startTime.toISOString())
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