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
app.use(cookieParser());

app.use(helmet());

app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
