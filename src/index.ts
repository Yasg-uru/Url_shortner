import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import "./middlewares/passport_setup.middleware";
import { connectDb } from "./utils/connectDb";
import { errorMiddleware } from "./middlewares/err.middleware";
import ShortenRouter from "./routes/shorten.routes";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes";
import { rateLimiter } from "./middlewares/rate-limiter.middleware";
import { setupSwagger } from "./configurations/swagger";
dotenv.config();

const app: Application = express();

app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set `secure: true` in production with HTTPS
  })
);
app.use(cors({
  origin:["http://localhost:5173","https://url-shortner-frontend-virid.vercel.app",  "https://url-shortner-frontend-hy4x.onrender.com"],
  credentials:true,
  
}));
app.use(helmet());

app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

setupSwagger(app);
app.get("/auth/user", (req: Request, res: Response): void => {
  if (req.isAuthenticated()) {
    res.json({ loggedIn: true, user: req.user, sessionID: req.sessionID });
    return;
  }
  res
    .status(401)
    .json({ loggedIn: false, message: "User is not authenticated" });
});


app.use("/api", ShortenRouter);
app.use("/auth", authRouter);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

connectDb();
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
