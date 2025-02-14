import { Request, Response, Router } from "express";
import passport from "passport";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { User } from "../models/user.model";
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
    res.json({
      token, // Send JWT to frontend
      user,
    });
  }
);
authRouter.post("/logout", (req: Request, res: Response) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(400).json({ message: "No token provided" });
    return;
  }

  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  res.json({ message: "Logged out successfully" });
});
authRouter.get("/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.user?.userId); 
  
      if (!user) {
          res.status(404).json({ message: "User not found" });
          return 
      }
  
      res.json({ user });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
export default authRouter;
