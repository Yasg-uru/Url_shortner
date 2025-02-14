import { NextFunction, Request, Response } from "express";
import validUrl from "valid-url";
import { IShortURL, ShortURL } from "../models/url.model";
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
        await redisClient.setex(
          shortUrlAlias,
          86400,
          JSON.stringify(newShortUrl)
        );
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

      let cachedData = await redisClient.get(alias);
      if (cachedData) {
        const urlData: IShortURL = JSON.parse(cachedData);
        console.log('this is cached data :', cachedData)
        this.logAnalytics(req, urlData._id).catch((err) =>
          console.error("Analytics Error:", err)
        );
        return res.redirect(urlData.longUrl);
      }

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
      await redisClient.setex(alias, 86400, JSON.stringify(shortUrl));

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
      const currentDate = moment().format("YYYY-MM-DD");

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
        analytics.totalClicks = (analytics.totalClicks || 0) + 1;

        const existingUser = await ClickAnalytics.findOne({
          shortUrlId,
          ipAddress: ip,
        });
        if (!existingUser) {
          analytics.uniqueUsers = (analytics.uniqueUsers || 0) + 1;
        }

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
  public async getUrlAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { alias } = req.params;

      // Check Redis cache first
      const cacheKey = `analytics:${alias}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }

      // Find the Short URL
      const shortUrl = await ShortURL.findOne({ shortUrl: alias });
      if (!shortUrl) {
        return next(new AppError("Short URL not found", 404));
      }

      // Retrieve analytics data
      const analytics = await ClickAnalytics.findOne({
        shortUrlId: shortUrl._id,
      });

      if (!analytics) {
        const emptyResponse = {
          totalClicks: 0,
          uniqueUsers: 0,
          clicksByDate: [],
          osTypeStats: [],
          deviceTypeStats: [],
        };

        // Cache empty response for 5 minutes to prevent frequent DB calls
        await redisClient.setex(cacheKey, 300, JSON.stringify(emptyResponse));
        res.status(200).json(emptyResponse);
        return;
      }

      // Filter clicks for the last 7 days
      const last7Days = moment().subtract(7, "days").format("YYYY-MM-DD");
      const recentClicks = (analytics.clicksByDate || []).filter(
        (entry) => entry.date >= last7Days
      );

      const responseData = {
        totalClicks: analytics.totalClicks,
        uniqueUsers: analytics.uniqueUsers,
        clicksByDate: recentClicks,
        osTypeStats: analytics.osTypeStats,
        deviceTypeStats: analytics.deviceTypeStats,
      };

      // Cache response for 10 minutes
      await redisClient.setex(cacheKey, 600, JSON.stringify(responseData));

      res.status(200).json(responseData);
    } catch (error) {
      next(error);
    }
  }
  public async getTopicAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { topic } = req.params;
      const userId = req.user?.userId;
      const cacheKey = `topicAnalytics:${userId}:${topic}`;


      // Check Redis cache first
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }

      const urls = await ShortURL.find({ topic }).select("_id shortUrl");
      if (!urls.length) {
        throw new AppError("No URLs found under this topic", 404);
      }

      const urlIds = urls.map((url) => url._id);

      const analytics = await ClickAnalytics.aggregate([
        { $match: { shortUrlId: { $in: urlIds } } },
        {
          $group: {
            _id: "$shortUrlId",
            totalClicks: { $sum: 1 },
            uniqueUsers: { $addToSet: "$ipAddress" },
            clicksByDate: {
              $push: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
                },
                count: 1,
              },
            },
          },
        },
      ]);

      let totalClicks = 0;
      let uniqueUsersSet = new Set();
      let clicksByDateMap: Record<string, number> = {};

      const urlAnalytics = urls.map((url) => {
        const data = analytics.find(
          (a) => a._id.toString() === url._id.toString()
        );

        if (!data) {
          return {
            shortUrl: url.shortUrl,
            totalClicks: 0,
            uniqueUsers: 0,
          };
        }

        totalClicks += data.totalClicks;
        data.uniqueUsers.forEach((user: string) => uniqueUsersSet.add(user));

        // Aggregate clicks by date
        data.clicksByDate.forEach((entry: { date: string; count: number }) => {
          clicksByDateMap[entry.date] =
            (clicksByDateMap[entry.date] || 0) + entry.count;
        });

        return {
          shortUrl: url.shortUrl,
          totalClicks: data.totalClicks,
          uniqueUsers: data.uniqueUsers.length,
        };
      });

      // Format clicksByDate for response
      const clicksByDate = Object.keys(clicksByDateMap).map((date) => ({
        date,
        totalClicks: clicksByDateMap[date],
      }));

      // Construct response
      const responseData = {
        totalClicks,
        uniqueUsers: uniqueUsersSet.size,
        clicksByDate,
        urls: urlAnalytics,
      };

      await redisClient.setex(cacheKey, 600, JSON.stringify(responseData));

      res.status(200).json(responseData);
    } catch (error) {
      next(error);
    }
  }
  public async getOverallAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) return next(new AppError("Unauthorized access", 401));

      const cacheKey = `overallAnalytics:${userId}`;

      // Check Redis cache
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }

      // Fetch all URLs created by the user
      const urls = await ShortURL.find({ createdBy: userId }).select(
        "_id shortUrl"
      );
      if (!urls.length) {
        res.status(200).json({
          totalUrls: 0,
          totalClicks: 0,
          uniqueUsers: 0,
          clicksByDate: [],
          osType: [],
          deviceType: [],
        });
        return;
      }

      const urlIds = urls.map((url) => url._id);

      // Aggregate analytics data for all URLs
      const analytics = await ClickAnalytics.aggregate([
        { $match: { shortUrlId: { $in: urlIds } } },
        {
          $group: {
            _id: null,
            totalClicks: { $sum: 1 },
            uniqueUsers: { $addToSet: "$ipAddress" },
            clicksByDate: {
              $push: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
                },
                count: 1,
              },
            },
            osType: {
              $push: {
                osName: "$osType",
                ipAddress: "$ipAddress",
              },
            },
            deviceType: {
              $push: {
                deviceName: "$deviceType",
                ipAddress: "$ipAddress",
              },
            },
          },
        },
      ]);

      if (!analytics.length) {
        res.status(200).json({
          totalUrls: urls.length,
          totalClicks: 0,
          uniqueUsers: 0,
          clicksByDate: [],
          osType: [],
          deviceType: [],
        });
        return;
      }

      const data = analytics[0];

      const clicksByDateMap: Record<string, number> = {};
      interface ClickByDateEntry {
        date: string;
        count: number;
      }

      interface OsTypeEntry {
        osName: string;
        ipAddress: string;
      }

      interface DeviceTypeEntry {
        deviceName: string;
        ipAddress: string;
      }

      data.clicksByDate.forEach((entry: ClickByDateEntry) => {
        clicksByDateMap[entry.date] =
          (clicksByDateMap[entry.date] || 0) + entry.count;
      });

      const clicksByDate = Object.keys(clicksByDateMap).map((date) => ({
        date,
        totalClicks: clicksByDateMap[date],
      }));

      const osTypeMap: Record<string, Set<string>> = {};
      interface OsTypeEntry {
        osName: string;
        ipAddress: string;
      }

      data.osType.forEach((entry: OsTypeEntry) => {
        if (!osTypeMap[entry.osName]) {
          osTypeMap[entry.osName] = new Set<string>();
        }
        osTypeMap[entry.osName].add(entry.ipAddress);
      });

      const osType = Object.keys(osTypeMap).map((osName) => ({
        osName,
        uniqueClicks: osTypeMap[osName].size,
        uniqueUsers: osTypeMap[osName].size,
      }));

      const deviceTypeMap: Record<string, Set<string>> = {};
      interface DeviceTypeEntry {
        deviceName: string;
        ipAddress: string;
      }

      data.deviceType.forEach((entry: DeviceTypeEntry) => {
        if (!deviceTypeMap[entry.deviceName]) {
          deviceTypeMap[entry.deviceName] = new Set<string>();
        }
        deviceTypeMap[entry.deviceName].add(entry.ipAddress);
      });

      const deviceType = Object.keys(deviceTypeMap).map((deviceName) => ({
        deviceName,
        uniqueClicks: deviceTypeMap[deviceName].size,
        uniqueUsers: deviceTypeMap[deviceName].size,
      }));

      const responseData = {
        totalUrls: urls.length,
        totalClicks: data.totalClicks,
        uniqueUsers: data.uniqueUsers.length,
        clicksByDate,
        osType,
        deviceType,
      };

      // Cache response for 10 minutes
      await redisClient.setex(cacheKey, 600, JSON.stringify(responseData));

      res.status(200).json(responseData);
    } catch (error) {
      next(error);
    }
  }
}

export default new UrlShortenerController();
