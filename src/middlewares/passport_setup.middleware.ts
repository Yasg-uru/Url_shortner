import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { User, IUser } from "../models/user.model"; // Import User model
import { generateToken } from "../utils/generate-token.utils";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_SECRET_ID as string,
      callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = new User({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            profilePicture: profile.photos?.[0]?.value,
            lastLogin: new Date(),
          });
          await user.save();
        } else {
          user.lastLogin = new Date();
          await user.save();
        }
        const token = generateToken(user._id.toString());

        return done(null, {user,token} as any);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

