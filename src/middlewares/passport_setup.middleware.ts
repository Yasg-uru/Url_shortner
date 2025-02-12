import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { User, IUser } from "../models/user.model"; // Import User model

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_SECRET_ID as string,
      callbackURL: "/auth/google/callback",
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

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Serialize user (store only user ID in session)
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user (retrieve full user details from MongoDB)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
