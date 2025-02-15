import { NextFunction, Request, Response, Router } from "express";
import passport from "passport";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { User } from "../models/user.model";
import { AppError } from "../utils/errorhandler.utils";
const authRouter = Router();
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false }), // No session needed
  (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication failed" });
      return;
    }

    // Extract JWT Token & User Data
    const { user, token } = req.user as any;
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiry
    });
    res.redirect("http://localhost:5173/");
  }
);
authRouter.post("/logout", (req: Request, res: Response) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(400).json({ message: "No token provided" });
    return;
  }

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: true, // <-- Add this for HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiry
  });
  

  res.json({ message: "Logged out successfully" });
});
authRouter.get(
  "/check", isAuthenticated, 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const user = await User.findById(userId);
      if (!user) {
        return next(new AppError("please login to continue", 400));
      }
      res.status(200).json({
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);
authRouter.get(
  "/profile",
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.user?.userId);

      if (!user) {
        return next(new AppError("user not found", 404));
      }

      res.json({ user });
    } catch (error) {
      return next(error);
    }
  }
);
export default authRouter;
