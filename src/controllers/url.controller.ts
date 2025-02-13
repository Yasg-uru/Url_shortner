import { NextFunction, Request, Response } from "express";
import validUrl from "valid-url";
import { ShortURL } from "../models/url.model";
import { AppError } from "../utils/errorhandler.utils";
import redisClient from "../configurations/redis.config";
import geoip from "geoip-lite";
import ClickAnalytics from "../models/analysis";
import useragent from "express-useragent";
import mongoose from "mongoose";
import moment from "moment";

class UrlShortenerController {
  constructor() {
    this.redirect = this.redirect.bind(this);
    this.logAnalytics = this.logAnalytics.bind(this);
  }
  public async shorten(req: Request, res: Response, next: NextFunction) {
    try {
      const { longUrl, customAlias, topic } = req.body;
      const userId = req.user?.userId; // Extract user ID from auth middleware

      // Dynamically import nanoid to support ESM in CommonJS
      const { nanoid } = await import("nanoid");

      // Validate URL
      if (!validUrl.isUri(longUrl)) {
        throw new AppError("Invalid URL format.", 400);
      }

      let shortUrlAlias = customAlias || nanoid(6); // Generate a 6-character unique ID

      if (customAlias) {
        const existingAlias = await ShortURL.findOne({ shortUrl: customAlias });
        if (existingAlias) {
          throw new AppError("Custom alias already in use.", 400);
        }
      }

      // Create Short URL
      const newShortUrl = new ShortURL({
        longUrl,
        shortUrl: shortUrlAlias,
        customAlias,
        topic,
        createdBy: userId,
        clicks: 0,
      });

      await newShortUrl.save();

      // Cache URL in Redis for faster access (expires in 24 hours)
      try {
        await redisClient.setex(shortUrlAlias, 86400, longUrl);
      } catch (redisError) {
        console.error("Redis caching failed:", redisError);
      }

      // Construct the full short URL
      const fullShortUrl = `${process.env.BASE_URL}/api/shorten/${shortUrlAlias}`;

      res.status(201).json({
        shortUrl: fullShortUrl,
        createdAt: newShortUrl.createdAt,
      });
    } catch (error) {
      console.error("Error creating short URL:", error);
      next(error); // Pass error to the global error handler
    }
  }

  public async redirect(req: Request, res: Response, next: NextFunction) {
    try {
      const { alias } = req.params;

      let cachedUrl = await redisClient.get(alias);
      // if (cachedUrl) {
      //   // this.logAnalytics(req, alias).catch((err) =>
      //   //   console.error("Analytics Error:", err)
      //   // );
      //   return res.redirect(cachedUrl);
      // }

      const shortUrl = await ShortURL.findOne({ shortUrl: alias });
      if (!shortUrl) {
        throw new AppError("Short URL not found", 404);
      }

      // Increment click count
      shortUrl.clicks += 1;
      await shortUrl.save();

      // Log analytics data
      this.logAnalytics(req, shortUrl._id).catch((err) =>
        console.error("Analytics Error:", err)
      );

      // Cache the URL for faster redirects
      await redisClient.setex(alias, 86400, shortUrl.longUrl);

      res.redirect(shortUrl.longUrl);
    } catch (error) {
      next(error);
    }
  }

  private async logAnalytics(
    req: Request,
    shortUrlId: mongoose.Types.ObjectId
  ) {
    try {
      console.log("Logging analytics for:", { shortUrlId, ip: req.ip });

      const ip = req.ip || req.headers["x-forwarded-for"] || "Unknown";
      const userAgent = req.headers["user-agent"] || "Unknown";
      const geo = geoip.lookup(ip as string);
      const ua = useragent.parse(userAgent || "");
      const currentDate = moment().format("YYYY-MM-DD"); // Format date as YYYY-MM-DD

      // Check for existing analytics for this short URL
      let analytics = await ClickAnalytics.findOne({ shortUrlId });

      if (!analytics) {
        analytics = new ClickAnalytics({
          shortUrlId,
          totalClicks: 1,
          uniqueUsers: 1,
          clicksByDate: [{ date: currentDate, clickCount: 1 }],
          osTypeStats: [
            { osName: ua.os || "Unknown", uniqueClicks: 1, uniqueUsers: 1 },
          ],
          deviceTypeStats: [
            {
              deviceName: ua.isMobile
                ? "Mobile"
                : ua.isTablet
                ? "Tablet"
                : "Desktop",
              uniqueClicks: 1,
              uniqueUsers: 1,
            },
          ],
        });
      } else {
        // Update total click count
        analytics.totalClicks = (analytics.totalClicks || 0 ) +1;

        // Update unique users count
        const existingUser = await ClickAnalytics.findOne({
          shortUrlId,
          ipAddress: ip,
        });
        if (!existingUser) {
          analytics.uniqueUsers = (analytics.uniqueUsers || 0) + 1;
        }

        // Update clicks by date (for last 7 days)
        const last7Days = moment().subtract(7, "days").format("YYYY-MM-DD");
        analytics.clicksByDate = (analytics.clicksByDate || [])
          .filter((data) => data.date >= last7Days) // Keep only recent 7 days
          .map((data) =>
            data.date === currentDate
              ? { ...data, clickCount: data.clickCount + 1 }
              : data
          );

        if (!analytics.clicksByDate.find((data) => data.date === currentDate)) {
          analytics.clicksByDate.push({ date: currentDate, clickCount: 1 });
        }

        // Update OS statistics
        analytics.osTypeStats = analytics.osTypeStats || [];
        const osEntry = analytics.osTypeStats.find((os) => os.osName === ua.os);
        if (osEntry) {
          osEntry.uniqueClicks += 1;
          if (!existingUser) osEntry.uniqueUsers += 1;
        } else {
          analytics.osTypeStats.push({
            osName: ua.os || "Unknown",
            uniqueClicks: 1,
            uniqueUsers: 1,
          });
        }

        // Update device type statistics
        const deviceType = ua.isMobile
          ? "Mobile"
          : ua.isTablet
          ? "Tablet"
          : "Desktop";
        analytics.deviceTypeStats = analytics.deviceTypeStats || [];
        const deviceEntry = analytics.deviceTypeStats.find(
          (device) => device.deviceName === deviceType
        );
        if (deviceEntry) {
          deviceEntry.uniqueClicks += 1;
          if (!existingUser) deviceEntry.uniqueUsers += 1;
        } else {
          analytics.deviceTypeStats.push({
            deviceName: deviceType,
            uniqueClicks: 1,
            uniqueUsers: 1,
          });
        }
      }

      await analytics.save();
    } catch (error) {
      console.error("Analytics tracking failed:", error);
    }
  }
}

export default new UrlShortenerController();
