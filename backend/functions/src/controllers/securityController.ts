import {Request, Response} from "express";
import * as securityService from "../services/securityService";

export const logSecurityEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {walletAddress, action, details, severity} = req.body;
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.get("User-Agent");

    if (!walletAddress || !action) {
      res.status(400).json({
        success: false,
        error: "Wallet address and action are required",
      });
      return;
    }

    await securityService.logSecurityEvent(
      walletAddress,
      action,
      details || {},
      severity || "low",
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: "Security event logged successfully",
    });
  } catch (error: any) {
    console.error("Error logging security event:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to log security event",
    });
  }
};

export const checkRateLimit = async (req: Request, res: Response): Promise<void> => {
  try {
    const {identifier, action} = req.body;

    if (!identifier || !action) {
      res.status(400).json({
        success: false,
        error: "Identifier and action are required",
      });
      return;
    }

    const rateLimitResult = await securityService.checkRateLimit(identifier, action);

    res.json({
      success: true,
      data: rateLimitResult,
    });
  } catch (error: any) {
    console.error("Error checking rate limit:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to check rate limit",
    });
  }
};

export const validateQuizSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const {walletAddress, quizId, submissionData} = req.body;

    if (!walletAddress || !quizId || !submissionData) {
      res.status(400).json({
        success: false,
        error: "Wallet address, quiz ID, and submission data are required",
      });
      return;
    }

    // Check if user is banned
    const banStatus = await securityService.checkUserBanned(walletAddress);
    if (banStatus.banned) {
      res.status(403).json({
        success: false,
        error: "User is banned",
        data: banStatus,
      });
      return;
    }

    // Check rate limit
    const rateLimitResult = await securityService.checkRateLimit(walletAddress, "answer_submission");
    if (!rateLimitResult.allowed) {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        data: rateLimitResult,
      });
      return;
    }

    // Validate submission
    const validationResult = await securityService.validateQuizSubmission(
      walletAddress,
      quizId,
      submissionData
    );

    res.json({
      success: true,
      data: validationResult,
    });
  } catch (error: any) {
    console.error("Error validating quiz submission:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to validate submission",
    });
  }
};

export const banUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const {walletAddress} = req.params;
    const {reason, bannedBy, permanent, expirationHours} = req.body;

    if (!walletAddress || !reason || !bannedBy) {
      res.status(400).json({
        success: false,
        error: "Wallet address, reason, and bannedBy are required",
      });
      return;
    }

    await securityService.banUser(
      walletAddress,
      reason,
      bannedBy,
      permanent || false,
      expirationHours
    );

    res.json({
      success: true,
      message: "User banned successfully",
    });
  } catch (error: any) {
    console.error("Error banning user:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to ban user",
    });
  }
};

export const checkUserBanned = async (req: Request, res: Response): Promise<void> => {
  try {
    const {walletAddress} = req.params;

    if (!walletAddress) {
      res.status(400).json({
        success: false,
        error: "Wallet address is required",
      });
      return;
    }

    const banStatus = await securityService.checkUserBanned(walletAddress);

    res.json({
      success: true,
      data: banStatus,
    });
  } catch (error: any) {
    console.error("Error checking user ban status:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to check ban status",
    });
  }
};

export const getSecurityStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const {timeframe} = req.query;

    const validTimeframes = ["day", "week", "month"];
    const selectedTimeframe = validTimeframes.includes(timeframe as string) ?
      (timeframe as "day" | "week" | "month") :
      "week";

    const stats = await securityService.getSecurityStats(selectedTimeframe);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error getting security stats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get security statistics",
    });
  }
};

export const generateSecureToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = securityService.generateSecureToken();

    res.json({
      success: true,
      data: {token},
    });
  } catch (error: any) {
    console.error("Error generating secure token:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate secure token",
    });
  }
};

// Middleware for security checks
export const securityMiddleware = async (req: Request, res: Response, next: any) => {
  try {
    // Sanitize input
    req.body = securityService.sanitizeInput(req.body);
    req.query = securityService.sanitizeInput(req.query);

    // Check for basic security headers
    const userAgent = req.get("User-Agent");
    if (!userAgent || userAgent.length < 5) {
      await securityService.logSecurityEvent(
        "unknown",
        "suspicious_request",
        {userAgent, path: req.path},
        "medium",
        req.ip
      );
    }

    next();
  } catch (error) {
    console.error("Security middleware error:", error);
    next(); // Continue even if security check fails
  }
};

// Rate limiting middleware for specific endpoints
export const rateLimitMiddleware = (action: string) => {
  return async (req: Request, res: Response, next: any) => {
    try {
      const identifier = req.body.walletAddress || req.ip || "unknown";
      const rateLimitResult = await securityService.checkRateLimit(identifier, action);

      if (!rateLimitResult.allowed) {
        res.status(429).json({
          success: false,
          error: "Rate limit exceeded",
          data: rateLimitResult,
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Rate limit middleware error:", error);
      next(); // Continue even if rate limit check fails
    }
  };
};
