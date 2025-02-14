import mongoose , {Schema} from "mongoose";
export interface IShortURL extends Document {
  _id:mongoose.Types.ObjectId,
    longUrl: string;
    shortUrl: string;
    customAlias?: string;
    topic?: string;
    createdBy: mongoose.Types.ObjectId;
    clicks: number;
    expiresAt?: Date;
    createdAt: Date;
  }
  
  const ShortURLSchema = new Schema<IShortURL>(
    {
      longUrl: { type: String, required: true },
      shortUrl: { type: String, required: true, unique: true },
      customAlias: { type: String, unique: true, sparse: true },
      topic: { type: String },
      createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      clicks: { type: Number, default: 0 },
      expiresAt: { type: Date },
    },
    { timestamps: true }
  );
  
 
  
  export const ShortURL = mongoose.model<IShortURL>("ShortURL", ShortURLSchema);
  