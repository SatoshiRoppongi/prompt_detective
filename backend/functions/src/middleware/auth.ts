import {Request, Response, NextFunction} from "express";
import * as admin from "firebase-admin";

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
  userWallet?: string;
}

export const verifyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({error: "Missing or invalid authorization header"});
      return;
    }

    const token = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401).json({error: "Invalid or expired token"});
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({error: "Authentication service error"});
  }
};

export const verifyWalletOwnership = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const {walletAddress} = req.body;

  if (!req.user) {
    res.status(401).json({error: "User not authenticated"});
    return;
  }

  if (!walletAddress) {
    res.status(400).json({error: "Wallet address is required"});
    return;
  }

  // In a real implementation, you would verify that the user
  // actually owns the wallet address through signature verification
  // For now, we'll store the wallet address in the request
  req.userWallet = walletAddress;

  next();
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({error: "User not authenticated"});
    return;
  }

  // Check if user has admin role
  if (!req.user.admin && !req.user.email?.endsWith("@admin.prompt-detective.com")) {
    res.status(403).json({error: "Admin access required"});
    return;
  }

  next();
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];

      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
      } catch (error) {
        // Ignore auth errors for optional auth
        console.log("Optional auth failed:", error);
      }
    }

    next();
  } catch (error) {
    // Continue without auth for optional auth
    next();
  }
};
