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
import { CacheKeys } from "../utils/cachekeys.util";
 async function invalidateCache(keys: string[]) {
  try {
    redisClient.del(...keys);
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }
}
class UrlShortenerController {
  constructor() {
    this.redirect = this.redirect.bind(this);
    this.logAnalytics = this.logAnalytics.bind(this);
 

  }
  public async getRecentUrls(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId; // Extract user ID from auth middleware
      const { topic, sortBy, page = 1, limit = 20 } = req.query;

      if (!userId) {
        return next(new AppError("Unauthorized access", 401));
      }

      // Construct cache key
      const cacheKey = `recentUrls:${userId}:${topic || "all"}:${sortBy || "desc"}:${page}:${limit}`;

      // Check Redis cache first
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        const cachedResponse = JSON.parse(cachedData);
        res.status(200).json(cachedResponse);
        return;
      }

      // Construct query
      const query: any = { createdBy: userId };
      if (topic) {
        query.topic = topic;
      }

      // Construct sort options
      const sortOptions: any = {};
      if (sortBy === "asc") {
        sortOptions.createdAt = 1;
      } else {
        sortOptions.createdAt = -1;
      }

      // Calculate skip and limit for pagination
      const pageNumber = Number(page);
      const limitNumber = Number(limit);
      const skip = (pageNumber - 1) * limitNumber;

      // Fetch total number of documents for the query
      const totalDocuments = await ShortURL.countDocuments(query);

      // Fetch recent URLs from the database
      const recentUrls = await ShortURL.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNumber);

      if (!recentUrls.length) {
        res.status(200).json({ message: "No URLs found." });
        return;
      }

      // Calculate pagination metadata
      const hasNext = pageNumber * limitNumber < totalDocuments;
      const hasPrevious = pageNumber > 1;

      // Construct response object
      const response = {
        data: recentUrls,
        pagination: {
          total: totalDocuments,
          page: pageNumber,
          limit: limitNumber,
          hasNext,
          hasPrevious,
        },
      };

      // Cache the response for 10 minutes
      await redisClient.setex(cacheKey, 600, JSON.stringify(response));

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  public async shorten(req: Request, res: Response, next: NextFunction) {
    try {
      const { longUrl, customAlias, topic } = req.body;
      const userId = req.user?.userId;
      if(!userId) return next(new AppError('please login to continue', 400))
      if (!validUrl.isUri(longUrl)) {
        throw new AppError("Invalid URL format.", 400);
      }
      const { nanoid } = await import("nanoid");
  
      let shortUrlAlias = customAlias || nanoid(6);
  
      if (customAlias) {
        const existingAlias = await ShortURL.findOne({ shortUrl: customAlias });
        if (existingAlias) {
          throw new AppError("Custom alias already in use.", 400);
        }
      }
  
      const newShortUrl = new ShortURL({
        longUrl,
        shortUrl: shortUrlAlias,
        customAlias,
        topic,
        createdBy: userId,
        clicks: 0,
      });
  
      await newShortUrl.save();
  
      // Invalidate relevant cache keys
      await invalidateCache([
        CacheKeys.userTopics(userId),
        CacheKeys.overallAnalytics(userId),
        CacheKeys.topicAnalytics(userId, topic),
        CacheKeys.recentUrls(userId, "*", "*", "*", "*"), // Invalidate all recent URLs cache for the user
      ]);
  
      // Cache the new short URL
      await redisClient.setex(CacheKeys.shortUrl(shortUrlAlias), 86400, JSON.stringify(newShortUrl));
  
      const fullShortUrl = `${process.env.BASE_URL}/api/shorten/${shortUrlAlias}`;
      res.status(201).json({ shortUrl: fullShortUrl, createdAt: newShortUrl.createdAt });
    } catch (error) {
      console.error("Error creating short URL:", error);
      next(error);
    }
  }

  public async redirect(req: Request, res: Response, next: NextFunction) {
    try {
      const { alias } = req.params;
      const userId= req.user?.userId;
      if(!userId) return next(new AppError('please login to continue',400));
      const shortUrl = await ShortURL.findOne({ shortUrl: alias });
      if (!shortUrl) {
        return  next(new AppError("Short URL not found", 404));
      }

      // Increment click count
      shortUrl.clicks += 1;
      await shortUrl.save();
      await invalidateCache([
        CacheKeys.shortUrl(alias),
        CacheKeys.urlAnalytics(alias),
        shortUrl.topic ? CacheKeys.topicAnalytics(userId, shortUrl.topic) : '',
        CacheKeys.overallAnalytics(userId),
        CacheKeys.recentUrls(userId, "*", "*", "*", "*"), // Invalidate all recent URLs cache for the user
      ]);
      const cachePattern = `recentUrls:${userId}:*`;
      const keys = await redisClient.keys(cachePattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      // Log analytics data
      this.logAnalytics(req, shortUrl, next).catch((err) =>
        console.error("Analytics Error:", err)
      );

      // Cache the URL for faster redirects
      await redisClient.setex(alias, 86400, JSON.stringify(shortUrl));

      res.redirect(shortUrl.longUrl);
    } catch (error) {
      next(error);
    }
  }
  private async logAnalytics(req: Request, shortUrl: IShortURL, next:NextFunction) {
    try {
      const userId = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : null;
      if (!userId) return next(new AppError("Please log in to continue", 400));
  
      console.log("Logging analytics for:", {
        shortUrlId: shortUrl._id,
        ip: req.ip,
      });
  
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "Unknown";
      const userAgent = req.headers["user-agent"] || "Unknown";
      const ua = useragent.parse(userAgent);
  
      let location = "Unknown";
      const geo = geoip.lookup(ip);
      if (geo) {
        location = `${geo.city}, ${geo.country}`;
      }
  
      const currentDate = moment().format("YYYY-MM-DD");
  
      let analytics = await ClickAnalytics.findOne({ shortUrlId: shortUrl._id });
  
      if (!analytics) {
        analytics = new ClickAnalytics({
          shortUrlId: shortUrl._id,
          totalClicks: 1,
          uniqueUsers: userId ? [{ userId }] : [],
          clicksByDate: [{ date: currentDate, clickCount: 1 }],
          osTypeStats: [{ osName: ua.os || "Unknown", uniqueClicks: 1, uniqueUsers: userId ? 1 : 0 }],
          deviceTypeStats: [
            {
              deviceName: ua.isMobile ? "Mobile" : ua.isTablet ? "Tablet" : "Desktop",
              uniqueClicks: 1,
              uniqueUsers: userId ? 1 : 0,
            },
          ],
        });
      } else {
        analytics.totalClicks += 1;
  
        // Fix: Check if userId exists before adding to uniqueUsers
        if (userId && !analytics.uniqueUsers.some((user) => user.userId.equals(userId))) {
          analytics.uniqueUsers.push({ userId });
        }
  
        let todayEntry = analytics.clicksByDate.find((entry) => entry.date === currentDate);
        if (todayEntry) {
          todayEntry.clickCount += 1;
        } else {
          analytics.clicksByDate.push({ date: currentDate, clickCount: 1 });
        }
  
        analytics.clicksByDate = analytics.clicksByDate.filter(
          (entry) => entry.date >= moment().subtract(7, "days").format("YYYY-MM-DD")
        );
  
        let osEntry = analytics.osTypeStats.find((os) => os.osName === ua.os);
        if (osEntry) {
          osEntry.uniqueClicks += 1;
          if (userId && !analytics.uniqueUsers.some((user) => user.userId.equals(userId))) {
            osEntry.uniqueUsers += 1;
          }
        } else {
          analytics.osTypeStats.push({ osName: ua.os || "Unknown", uniqueClicks: 1, uniqueUsers: userId ? 1 : 0 });
        }
  
        const deviceType = ua.isMobile ? "Mobile" : ua.isTablet ? "Tablet" : "Desktop";
        let deviceEntry = analytics.deviceTypeStats.find((device) => device.deviceName === deviceType);
        if (deviceEntry) {
          deviceEntry.uniqueClicks += 1;
          if (userId && !analytics.uniqueUsers.some((user) => user.userId.equals(userId))) {
            deviceEntry.uniqueUsers += 1;
          }
        } else {
          analytics.deviceTypeStats.push({ deviceName: deviceType, uniqueClicks: 1, uniqueUsers: userId ? 1 : 0 });
        }
      }
  
      await analytics.save();
      await invalidateCache([`analytics:${shortUrl.shortUrl}`]);
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

      // if (cachedData) {
      //   res.status(200).json(JSON.parse(cachedData));
      //   return;
      // }

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
      const recentClicks = analytics.clicksByDate.filter(
        (entry) => entry.date >= last7Days
      );

      // Construct the final response
      const responseData = {
        totalClicks: analytics.totalClicks,
        uniqueUsers: analytics.uniqueUsers.length, // Corrected: return count instead of full array
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
      if(!userId) return next(new AppError('please login to continue',400));
      const cacheKey = CacheKeys.topicAnalytics(userId, topic);

      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }

      // Get all URLs under this topic
      const urls = await ShortURL.find({ topic }).select("_id shortUrl");
      if (!urls.length) {
        return next(new AppError("No URLs found under this topic", 404));
      }

      const urlIds = urls.map((url) => url._id);

      // Aggregate analytics data
      const analytics = await ClickAnalytics.aggregate([
        { $match: { shortUrlId: { $in: urlIds } } },
        {
          $group: {
            _id: "$shortUrlId",
            totalClicks: { $sum: "$totalClicks" }, // Sum totalClicks from documents
            uniqueUsers: { $addToSet: "$uniqueUsers.userId" }, // Ensure unique user IDs
            clicksByDate: { $push: "$clicksByDate" }, // Collect all clicksByDate data
          },
        },
      ]);

      let totalClicks = 0;
      let uniqueUsersSet = new Set<mongoose.Types.ObjectId>();
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
        data.uniqueUsers.forEach((userId: mongoose.Types.ObjectId) =>
          uniqueUsersSet.add(userId)
        );

        // Aggregate clicks by date
        data.clicksByDate.forEach(
          (clicksArray: { date: string; clickCount: number }[]) => {
            clicksArray.forEach((entry) => {
              clicksByDateMap[entry.date] =
                (clicksByDateMap[entry.date] || 0) + entry.clickCount;
            });
          }
        );

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

      // Cache for 10 minutes
      await redisClient.setex(cacheKey, 600, JSON.stringify(responseData));

      res.status(200).json(responseData);
    } catch (error) {
      next(error);
    }
  }

  public async getUserTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError("Unauthorized", 400));
      }

      const cacheKey = `user:${userId}:topics`;
      const cachedTopics = await redisClient.get(cacheKey);

      if (cachedTopics) {
        res.json(JSON.parse(cachedTopics));
        return;
      }

      const topics = await ShortURL.distinct("topic", { createdBy: userId });

      await redisClient.setex(cacheKey, 600, JSON.stringify(topics));

      res.json(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      next(error);
    }
  }

  public async getUserTopis(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(new AppError("Unauthorized", 400));
      }

      const cacheKey = `user:${userId}:topics`;
      const cachedTopics = await redisClient.get(cacheKey);

      // if (cachedTopics) {
      //   res.json(JSON.parse(cachedTopics));
      //   return
      // }

      const topics = await ShortURL.distinct("topic", { createdBy: userId });

      await redisClient.setex(cacheKey, 600, JSON.stringify(topics));

      res.json(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
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

      
      const cacheKey= CacheKeys.overallAnalytics(userId,)
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
          osTypeStats: [],
          deviceTypeStats: [],
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
            totalClicks: { $sum: "$totalClicks" }, // Sum totalClicks from documents
            uniqueUsers: { $addToSet: "$uniqueUsers.userId" }, // Ensure unique user IDs
            clicksByDate: { $push: "$clicksByDate" }, // Collect all clicksByDate data
            osTypeStats: { $push: "$osTypeStats" }, // Collect OS type stats
            deviceTypeStats: { $push: "$deviceTypeStats" }, // Collect Device type stats
          },
        },
      ]);

      if (!analytics.length) {
        res.status(200).json({
          totalUrls: urls.length,
          totalClicks: 0,
          uniqueUsers: 0,
          clicksByDate: [],
          osTypeStats: [],
          deviceTypeStats: [],
        });
        return;
      }

      const data = analytics[0];

      // Process clicks by date
      const clicksByDateMap: Record<string, number> = {};
      data.clicksByDate.forEach(
        (clicksArray: { date: string; clickCount: number }[]) => {
          clicksArray.forEach((entry) => {
            clicksByDateMap[entry.date] =
              (clicksByDateMap[entry.date] || 0) + entry.clickCount;
          });
        }
      );

      const clicksByDate = Object.keys(clicksByDateMap).map((date) => ({
        date,
        totalClicks: clicksByDateMap[date],
      }));

      // Process OS type stats
      const osTypeMap: Record<
        string,
        { uniqueClicks: number; uniqueUsers: number }
      > = {};
      data.osTypeStats?.forEach(
        (
          osStatsArray: {
            osName: string;
            uniqueClicks: number;
            uniqueUsers: number;
          }[]
        ) => {
          osStatsArray.forEach((entry) => {
            if (!osTypeMap[entry.osName]) {
              osTypeMap[entry.osName] = { uniqueClicks: 0, uniqueUsers: 0 };
            }
            osTypeMap[entry.osName].uniqueClicks += entry.uniqueClicks;
            osTypeMap[entry.osName].uniqueUsers += entry.uniqueUsers;
          });
        }
      );

      const osTypeStats = Object.keys(osTypeMap).map((osName) => ({
        osName,
        uniqueClicks: osTypeMap[osName].uniqueClicks,
        uniqueUsers: osTypeMap[osName].uniqueUsers,
      }));

      // Process Device type stats
      const deviceTypeMap: Record<
        string,
        { uniqueClicks: number; uniqueUsers: number }
      > = {};
      data.deviceTypeStats?.forEach(
        (
          deviceStatsArray: {
            deviceName: string;
            uniqueClicks: number;
            uniqueUsers: number;
          }[]
        ) => {
          deviceStatsArray.forEach((entry) => {
            if (!deviceTypeMap[entry.deviceName]) {
              deviceTypeMap[entry.deviceName] = {
                uniqueClicks: 0,
                uniqueUsers: 0,
              };
            }
            deviceTypeMap[entry.deviceName].uniqueClicks += entry.uniqueClicks;
            deviceTypeMap[entry.deviceName].uniqueUsers += entry.uniqueUsers;
          });
        }
      );

      const deviceTypeStats = Object.keys(deviceTypeMap).map((deviceName) => ({
        deviceName,
        uniqueClicks: deviceTypeMap[deviceName].uniqueClicks,
        uniqueUsers: deviceTypeMap[deviceName].uniqueUsers,
      }));

      const responseData = {
        totalUrls: urls.length,
        totalClicks: data.totalClicks,
        uniqueUsers: data.uniqueUsers.length,
        clicksByDate,
        osTypeStats,
        deviceTypeStats,
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
