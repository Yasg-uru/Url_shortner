import mongoose , {Schema} from "mongoose";
export interface IShortURL extends Document {
    longUrl: string;
    shortUrl: string;
    customAlias?: string;
    topic?: "acquisition" | "activation" | "retention";
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
      topic: { type: String, enum: ["acquisition", "activation", "retention"] },
      createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      clicks: { type: Number, default: 0 },
      expiresAt: { type: Date },
    },
    { timestamps: true }
  );
  
  // Indexing for optimized queries
  ShortURLSchema.index({ shortUrl: 1 }, { unique: true });
  ShortURLSchema.index({ createdBy: 1, createdAt: -1 });
  
  export const ShortURL = mongoose.model<IShortURL>("ShortURL", ShortURLSchema);
  