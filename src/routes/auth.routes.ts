import { NextFunction, Request, Response, Router } from "express";
import passport from "passport";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { User } from "../models/user.model";
import { AppError } from "../utils/errorhandler.utils";
const authRouter = Router();
/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API endpoints for user authentication
 */

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google Authentication
 *     tags: [Authentication]
 *     description: Redirects the user to Google's authentication page to sign in.
 *     operationId: googleAuth
 *     responses:
 *       302:
 *         description: Redirects user to Google login page.
 *       500:
 *         description: Internal server error.
 */
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google Authentication Callback
 *     tags: [Authentication]
 *     description: Handles Google OAuth callback and sets an authentication token as a cookie.
 *     operationId: googleAuthCallback
 *     responses:
 *       200:
 *         description: Authentication successful, user redirected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Authentication successful."
 *       401:
 *         description: Authentication failed.
 *       500:
 *         description: Internal server error.
 */
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
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      httpOnly: false,
      sameSite: "none" as const,
      secure: true,
    });
    
   
    res.redirect(process.env.CLIENT_URL as string);
  }
);
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: User Logout
 *     tags: [Authentication]
 *     description: Logs out the user by clearing the authentication token.
 *     operationId: logoutUser
 *     responses:
 *       200:
 *         description: Successfully logged out.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully."
 *       400:
 *         description: No token provided.
 *       500:
 *         description: Internal server error.
 */
authRouter.post("/logout", (req: Request, res: Response) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(400).json({ message: "No token provided" });
    return;
  }

  res.cookie("token", token, {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: false,
    sameSite: "none" as const,
    secure: true,
  });
  

  res.json({ message: "Logged out successfully" });
});
/**
 * @swagger
 * /auth/check:
 *   get:
 *     summary: Check User Authentication
 *     tags: [Authentication]
 *     description: Verifies if the user is authenticated.
 *     security:
 *       - bearerAuth: []
 *     operationId: checkAuth
 *     responses:
 *       200:
 *         description: Returns authenticated user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   example: { "_id": "123", "name": "John Doe", "email": "johndoe@gmail.com" }
 *       400:
 *         description: User is not authenticated.
 *       500:
 *         description: Internal server error.
 */
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
/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get User Profile
 *     tags: [Authentication]
 *     description: Retrieves the authenticated user's profile details.
 *     security:
 *       - bearerAuth: []
 *     operationId: getUserProfile
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   example: { "_id": "123", "name": "John Doe", "email": "johndoe@gmail.com", "profilePicture": "https://example.com/avatar.jpg" }
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
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
