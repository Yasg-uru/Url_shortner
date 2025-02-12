import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  googleId: string;
  email: string;
  name: string;
  profilePicture: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
}

const UserSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    profilePicture: { type: String },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for efficient lookups
UserSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model<IUser>("User", UserSchema);
