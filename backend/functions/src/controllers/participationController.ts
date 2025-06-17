import {Request, Response} from "express";
import * as participantionService from "../services/participationService";
import {broadcastNewParticipation} from "../services/realtimeService";
import * as leaderboardService from "../services/leaderboardService";
import * as securityService from "../services/securityService";
export const createParticipant = async (req: Request, res: Response) => {
  try {
    const { quizId, walletAddress, guessPrompt, bet } = req.body;
    const submissionTime = new Date();
    const startTime = Date.now();

    // Validate required fields
    if (!quizId || !walletAddress || !guessPrompt || bet === undefined) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: quizId, walletAddress, guessPrompt, bet"
      });
      return;
    }

    // Check if user is banned
    const banStatus = await securityService.checkUserBanned(walletAddress);
    if (banStatus.banned) {
      await securityService.logSecurityEvent(
        walletAddress,
        "banned_user_participation_attempt",
        { quizId, reason: banStatus.reason },
        "medium",
        req.ip
      );

      res.status(403).json({
        success: false,
        error: "User is banned from participating",
        data: banStatus
      });
      return;
    }

    // Check rate limit for quiz participation
    const rateLimitResult = await securityService.checkRateLimit(walletAddress, "quiz_participation");
    if (!rateLimitResult.allowed) {
      await securityService.logSecurityEvent(
        walletAddress,
        "rate_limit_exceeded",
        { action: "quiz_participation", quizId },
        "medium",
        req.ip
      );

      res.status(429).json({
        success: false,
        error: "Rate limit exceeded for quiz participation",
        data: rateLimitResult
      });
      return;
    }

    // Prepare submission data for anti-cheat validation
    const submissionData = {
      guessPrompt,
      bet,
      processingTime: Date.now() - startTime,
      submissionTime: submissionTime.toISOString(),
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip
    };

    // Run anti-cheat validation
    const validationResult = await securityService.validateQuizSubmission(
      walletAddress,
      quizId,
      submissionData
    );

    // Block submission if validation failed
    if (!validationResult.isValid) {
      await securityService.logSecurityEvent(
        walletAddress,
        "anti_cheat_violation",
        {
          quizId,
          riskScore: validationResult.riskScore,
          suspiciousActivities: validationResult.suspiciousActivities,
          recommendations: validationResult.recommendations
        },
        validationResult.riskScore > 70 ? "critical" : "high",
        req.ip
      );

      res.status(403).json({
        success: false,
        error: "Submission failed security validation",
        data: {
          riskScore: validationResult.riskScore,
          suspiciousActivities: validationResult.suspiciousActivities
        }
      });
      return;
    }

    // Log successful validation for high-risk scores (but still valid)
    if (validationResult.riskScore > 30) {
      await securityService.logSecurityEvent(
        walletAddress,
        "high_risk_submission_allowed",
        {
          quizId,
          riskScore: validationResult.riskScore,
          suspiciousActivities: validationResult.suspiciousActivities
        },
        "medium",
        req.ip
      );
    }

    // Create participant if all security checks pass
    await participantionService.createParticipant(
      quizId,
      walletAddress,
      guessPrompt,
      bet,
      submissionTime
    );

    // Log successful participation
    await securityService.logSecurityEvent(
      walletAddress,
      "quiz_participation",
      {
        quizId,
        bet,
        processingTime: Date.now() - startTime
      },
      "low",
      req.ip
    );
    
    // Create response data for broadcasting and API response
    const participantData = {
      quizId,
      walletAddress,
      guessPrompt,
      bet,
      submissionTime: submissionTime.toISOString(),
      createdAt: new Date().toISOString()
    };
    
    // Broadcast new participation to connected clients
    broadcastNewParticipation(quizId, participantData);
    
    // Get updated leaderboard and include in response
    const leaderboard = await leaderboardService.getLeaderboard(quizId, 10);
    
    res.status(201).json({
      success: true,
      message: "Participation created successfully",
      data: {
        ...participantData,
        leaderboard,
        securityInfo: {
          riskScore: validationResult.riskScore,
          validated: true
        }
      }
    });
  } catch (error: any) {
    console.error("Error creating participant:", error);
    
    // Log error for security monitoring
    if (req.body.walletAddress) {
      await securityService.logSecurityEvent(
        req.body.walletAddress,
        "participation_error",
        { error: error.message, quizId: req.body.quizId },
        "medium",
        req.ip
      );
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to create participation"
    });
  }
};
