import mongoose, { Schema, Document, model } from "mongoose";

// Interface for TypeScript type safety
export interface IClickAnalytics extends Document {
  shortUrlId: mongoose.Types.ObjectId;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  osType?: string;
  deviceType?: string;
  geolocation?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

const ClickAnalyticsSchema = new Schema<IClickAnalytics>(
  {
    shortUrlId: {
      type: Schema.Types.ObjectId,
      ref: "ShortURL",
      required: true,
      index: true, // Ensures efficient queries
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    osType: {
      type: String,
      trim: true,
    },
    deviceType: {
      type: String,
      trim: true,
    },
    geolocation: {
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Indexing for performance optimization
ClickAnalyticsSchema.index({ shortUrlId: 1, timestamp: -1 });

const ClickAnalytics = model<IClickAnalytics>("ClickAnalytics", ClickAnalyticsSchema);
export default ClickAnalytics;