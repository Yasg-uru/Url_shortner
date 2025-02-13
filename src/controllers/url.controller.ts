import { NextFunction, Request, Response } from "express";
import validUrl from "valid-url";
import { ShortURL } from "../models/url.model";
import { AppError } from "../utils/errorhandler.utils";
import redisClient from "../configurations/redis.config";

class UrlShortenerController {
    public async shorten(req: Request, res: Response, next: NextFunction) {
        try {
            const { longUrl, customAlias, topic } = req.body;
            const userId = req.user?.userId; // Extract user ID from auth middleware

            // Dynamically import nanoid to support ESM in CommonJS
            const { nanoid } = await import("nanoid");

            // Validate URL
            if (!validUrl.isUri(longUrl)) {
                throw new AppError( "Invalid URL format.", 400);
            }

            let shortUrlAlias = customAlias || nanoid(6); // Generate a 6-character unique ID

            if (customAlias) {
                const existingAlias = await ShortURL.findOne({ shortUrl: customAlias });
                if (existingAlias) {
                    throw new AppError("Custom alias already in use.",400);
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
            await redisClient.setex(shortUrlAlias, 86400, longUrl);

            // Construct the full short URL
            const fullShortUrl = `${process.env.BASE_URL}/${shortUrlAlias}`;

            res.status(201).json({
                shortUrl: fullShortUrl,
                createdAt: newShortUrl.createdAt,
            });
        } catch (error) {
            console.error("Error creating short URL:", error);
            next(error); // Pass error to the global error handler
        }
    }
}

export default new UrlShortenerController();