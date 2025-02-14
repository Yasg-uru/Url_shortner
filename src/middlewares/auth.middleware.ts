import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AppError } from "../utils/errorhandler.utils";

dotenv.config();

interface AuthRequest extends Request {
  user?: any;
}

export const isAuthenticated = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token; 
  if (!token) {
    
    return next(new AppError('Unauthorized - No token provided', 401))
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
   
    return next(new AppError('Invalid or expired token', 401))
  }
};
