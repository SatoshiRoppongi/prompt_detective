import {Request, Response, NextFunction} from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends Error implements AppError {
  statusCode = 500;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class SolanaError extends Error implements AppError {
  statusCode = 503;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = "SolanaError";
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error(`Error ${error.name}: ${error.message}`, {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  });

  // Default error values
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal Server Error";

  // Handle specific error types
  if (error.name === "ValidationError") {
    statusCode = 400;
  } else if (error.name === "NotFoundError") {
    statusCode = 404;
  } else if (error.message.includes("FIRESTORE")) {
    statusCode = 503;
    message = "Database service temporarily unavailable";
  } else if (error.message.includes("SOLANA")) {
    statusCode = 503;
    message = "Blockchain service temporarily unavailable";
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.url,
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
