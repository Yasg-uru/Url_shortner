import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import session from 'express-session'
import passport from 'passport'
import "./middlewares/passport_setup.middleware"
dotenv.config();

const app: Application = express();

app.use(
    session({
      secret: process.env.SESSION_SECRET || "supersecret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // Set `secure: true` in production with HTTPS
    })
  );
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());


app.use(helmet());

app.use(morgan("dev"));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Express with TypeScript! 🚀");
});
app.get("/", (req, res) => {
    res.send("Google OAuth with Node.js & TypeScript");
  });
  
  // Google Auth Route
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );
  
  // Google Auth Callback
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
      successRedirect: "/",
    })
  );
  
  // Logout
  app.get("/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.sendStatus(500);
      res.redirect("/");
    });
  });

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
