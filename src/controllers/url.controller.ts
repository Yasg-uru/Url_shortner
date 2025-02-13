import { NextFunction, Request, Response } from "express"; 
import validUrl from "valid-url";
import { ShortURL } from "../models/url.model";
import { AppError } from "../utils/errorhandler.utils";
import redisClient from "../configurations/redis.config";
import geoip from 'geoip-lite';
import ClickAnalytics from "../models/analysis";
import useragent from "express-useragent";
import mongoose from "mongoose";

class UrlShortenerController {
  constructor(){
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
          //     this.logAnalytics(req, alias).catch(err => console.error("Analytics Error:", err));
          //     return res.redirect(cachedUrl);
          // }

          const shortUrl = await ShortURL.findOne({ shortUrl: alias });
          if (!shortUrl) {
              throw new AppError("Short URL not found", 404);
          }

          shortUrl.clicks += 1;
          await shortUrl.save();

          this.logAnalytics(req, shortUrl._id).catch(err => console.error("Analytics Error:", err));

          res.redirect(shortUrl.longUrl);
      } catch (error) {
          next(error);
      }
  }

    private async logAnalytics(req: Request, shortUrlId: mongoose.Types.ObjectId) {
        try {
            console.log("Logging analytics for:", { shortUrlId, ip: req.ip });

            const ip = req.ip || req.headers["x-forwarded-for"] || "Unknown";
            const userAgent = req.headers["user-agent"] || "Unknown";
            const geo = geoip.lookup(ip as string);

            // Parse user agent properly
            const ua = useragent.parse(userAgent || "");

            const analyticsData = new ClickAnalytics({
                shortUrlId,
                ipAddress: ip,
                userAgent,
                osType: ua.os || "Unknown",
                deviceType: ua.isMobile ? "Mobile" : ua.isTablet ? "Tablet" : "Desktop",
                geolocation: geo
                    ? {
                        country: geo.country,
                        city: geo.city,
                        latitude: geo.ll ? geo.ll[0] : undefined,
                        longitude: geo.ll ? geo.ll[1] : undefined,
                    }
                    : undefined,
            });

            await analyticsData.save();
        } catch (error) {
            console.error("Analytics tracking failed:", error);
        }
    }
}

export default new UrlShortenerController();
