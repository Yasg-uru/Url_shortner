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
  totalClicks: number;
  uniqueUsers: { userId: mongoose.Types.ObjectId }[];
  clicksByDate: { date: string; clickCount: number }[];
  osTypeStats: { osName: string; uniqueClicks: number; uniqueUsers: number }[];
  deviceTypeStats: { deviceName: string; uniqueClicks: number; uniqueUsers: number }[];
}

// Define Schema
const ClickAnalyticsSchema = new Schema<IClickAnalytics>(
  {
    shortUrlId: {
      type: Schema.Types.ObjectId,
      ref: "ShortURL",
      required: true,
      index: true, // Optimized for query performance
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
    totalClicks: {
      type: Number,
      default: 0,
    },
    uniqueUsers: [
      {
        userId: { type: String, required: true },
      },
    ],
    clicksByDate: [
      {
        date: { type: String, required: true },
        clickCount: { type: Number, required: true, default: 0 },
      },
    ],
    osTypeStats: [
      {
        osName: { type: String, required: true },
        uniqueClicks: { type: Number, default: 0 },
        uniqueUsers: { type: Number, default: 0 },
      },
    ],
    deviceTypeStats: [
      {
        deviceName: { type: String, required: true },
        uniqueClicks: { type: Number, default: 0 },
        uniqueUsers: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Indexing for better analytics queries
ClickAnalyticsSchema.index({ shortUrlId: 1, timestamp: -1 });
ClickAnalyticsSchema.index({ osType: 1 });
ClickAnalyticsSchema.index({ deviceType: 1 });

const ClickAnalytics = model<IClickAnalytics>("ClickAnalytics", ClickAnalyticsSchema);
export default ClickAnalytics;
