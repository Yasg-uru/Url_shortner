import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { rateLimiter } from "../middlewares/rate-limiter.middleware";
import urlController from "../controllers/url.controller";

const ShortenRouter = Router();
/**
 * @swagger
 * tags:
 *   name: URL Shortener
 *   description: API endpoints for URL shortening and management.
 */

/**
 * @swagger
 * /api/shorten:
 *   post:
 *     summary: Create a Shortened URL
 *     tags: [URL Shortener]
 *     description: Shortens a long URL and returns a unique short URL.
 *     operationId: shortenUrl
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               longUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://www.example.com/my-long-url"
 *               customAlias:
 *                 type: string
 *                 example: "myAlias"
 *               topic:
 *                 type: string
 *                 example: "Technology"
 *     responses:
 *       201:
 *         description: Successfully created a shortened URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shortUrl:
 *                   type: string
 *                   example: "https://short.ly/myAlias"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid URL format or custom alias already in use.
 *       401:
 *         description: User is not authenticated.
 *       429:
 *         description: Too many requests (rate limit exceeded).
 *       500:
 *         description: Internal server error.
 */
ShortenRouter.post(
  "/shorten",
  isAuthenticated,
  rateLimiter,
  urlController.shorten
);

/**
 * @swagger
 * tags:
 *   name: URL Redirect
 *   description: API endpoints for handling URL redirections.
 */

/**
 * @swagger
 * /api/shorten/{alias}:
 *   get:
 *     summary: Redirect to Original URL
 *     tags: [URL Redirect]
 *     description: >
 *       **Note:** This endpoint returns a 302 redirect to the original long URL.
 *       Due to HTTP redirect behavior and CORS restrictions, Swagger UI might not follow the redirect.
 *       For complete testing, please use Postman or your browser.
 *     operationId: redirectToLongUrl
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: alias
 *         in: path
 *         required: true
 *         description: The unique alias of the shortened URL.
 *         schema:
 *           type: string
 *           example: "myAlias"
 *     responses:
 *       302:
 *         description: Successfully redirects to the original long URL.
 *         headers:
 *           Location:
 *             description: The original long URL.
 *             schema:
 *               type: string
 *               format: uri
 *               example: "https://www.example.com/long-url"
 *       400:
 *         description: Authentication required.
 *       404:
 *         description: Short URL not found.
 *       500:
 *         description: Internal server error.
 */

ShortenRouter.get("/shorten/:alias", isAuthenticated, urlController.redirect);
/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: API endpoints for retrieving analytics data.
 */

/**
 * @swagger
 * /api/analytics/overall:
 *   get:
 *     summary: Retrieve Overall Analytics
 *     tags: [Analytics]
 *     description: Fetches aggregated analytics data for all shortened URLs created by the authenticated user.
 *     operationId: getOverallAnalytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved analytics data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUrls:
 *                   type: integer
 *                   description: Total number of URLs created by the user.
 *                   example: 10
 *                 totalClicks:
 *                   type: integer
 *                   description: Total number of clicks across all URLs.
 *                   example: 1500
 *                 uniqueUsers:
 *                   type: integer
 *                   description: Number of unique users who clicked on the URLs.
 *                   example: 320
 *                 clicksByDate:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2024-02-01"
 *                       totalClicks:
 *                         type: integer
 *                         example: 200
 *                 osTypeStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       osName:
 *                         type: string
 *                         example: "Windows"
 *                       uniqueClicks:
 *                         type: integer
 *                         example: 300
 *                       uniqueUsers:
 *                         type: integer
 *                         example: 150
 *                 deviceTypeStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       deviceName:
 *                         type: string
 *                         example: "iPhone"
 *                       uniqueClicks:
 *                         type: integer
 *                         example: 400
 *                       uniqueUsers:
 *                         type: integer
 *                         example: 220
 *       401:
 *         description: Unauthorized access - User must be authenticated.
 *       500:
 *         description: Internal server error.
 */
ShortenRouter.get(
  "/analytics/overall",
  isAuthenticated,
  urlController.getOverallAnalytics
);

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: API endpoints for retrieving analytics data.
 */

/**
 * @swagger
 * /api/analytics/{alias}:
 *   get:
 *     summary: Retrieve Analytics for a Specific Short URL
 *     tags: [Analytics]
 *     description: Fetches analytics data for a specific shortened URL, including total clicks, unique users, OS statistics, and device type statistics.
 *     operationId: getUrlAnalytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alias
 *         required: true
 *         schema:
 *           type: string
 *         description: The alias of the shortened URL.
 *     responses:
 *       200:
 *         description: Successfully retrieved analytics data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalClicks:
 *                   type: integer
 *                   description: Total number of clicks on the short URL.
 *                   example: 150
 *                 uniqueUsers:
 *                   type: integer
 *                   description: Number of unique users who clicked on the URL.
 *                   example: 50
 *                 clicksByDate:
 *                   type: array
 *                   description: Click activity in the last 7 days.
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2024-02-01"
 *                       clickCount:
 *                         type: integer
 *                         example: 20
 *                 osTypeStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       osName:
 *                         type: string
 *                         example: "Windows"
 *                       uniqueClicks:
 *                         type: integer
 *                         example: 50
 *                       uniqueUsers:
 *                         type: integer
 *                         example: 30
 *                 deviceTypeStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       deviceName:
 *                         type: string
 *                         example: "iPhone"
 *                       uniqueClicks:
 *                         type: integer
 *                         example: 70
 *                       uniqueUsers:
 *                         type: integer
 *                         example: 40
 *       401:
 *         description: Unauthorized access - User must be authenticated.
 *       404:
 *         description: Short URL not found.
 *       500:
 *         description: Internal server error.
 */

ShortenRouter.get(
  "/analytics/:alias",
  isAuthenticated,
  urlController.getUrlAnalytics
);
/**
 * @swagger
 * /api/analytics/topic/{topic}:
 *   get:
 *     summary: Retrieve Analytics for URLs under a Specific Topic
 *     tags: [Analytics]
 *     description: Fetches aggregated analytics data for all shortened URLs categorized under a specific topic.
 *     operationId: getTopicAnalytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: The topic category of the URLs.
 *     responses:
 *       200:
 *         description: Successfully retrieved topic-based analytics data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalClicks:
 *                   type: integer
 *                   description: Total number of clicks across all URLs under the topic.
 *                   example: 300
 *                 uniqueUsers:
 *                   type: integer
 *                   description: Number of unique users who interacted with URLs under the topic.
 *                   example: 120
 *                 clicksByDate:
 *                   type: array
 *                   description: Click activity by date for the topic.
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2024-02-01"
 *                       totalClicks:
 *                         type: integer
 *                         example: 50
 *                 urls:
 *                   type: array
 *                   description: List of URLs under the topic with their individual analytics.
 *                   items:
 *                     type: object
 *                     properties:
 *                       shortUrl:
 *                         type: string
 *                         example: "xyz123"
 *                       totalClicks:
 *                         type: integer
 *                         example: 150
 *                       uniqueUsers:
 *                         type: integer
 *                         example: 60
 *       400:
 *         description: Bad request - User must be logged in.
 *       404:
 *         description: No URLs found under this topic.
 *       500:
 *         description: Internal server error.
 */
ShortenRouter.get(
  "/analytics/topic/:topic",
  isAuthenticated,
  urlController.getTopicAnalytics
);
/**
 * @swagger
 * /api/topics:
 *   get:
 *     summary: Retrieve All Topics Associated with a User's URLs
 *     tags: [Topics]
 *     description: Fetches all unique topics from the URLs created by the authenticated user.
 *     operationId: getUserTopics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user topics.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               description: List of topics associated with the user's URLs.
 *               items:
 *                 type: string
 *                 example: "marketing"
 *       400:
 *         description: Unauthorized request - User must be logged in.
 *       500:
 *         description: Internal server error.
 */
ShortenRouter.get("/topics", isAuthenticated, urlController.getUserTopis);
/**
 * @swagger
 * /api/recent-urls:
 *   get:
 *     summary: Retrieve Recent Shortened URLs
 *     tags: [URLs]
 *     description: Fetches recent URLs created by the authenticated user, with optional filters like topic, sorting, and pagination.
 *     operationId: getRecentUrls
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: topic
 *         schema:
 *           type: string
 *         description: Filter URLs by a specific topic.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort URLs by creation date (ascending or descending).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Pagination - Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Pagination - Number of results per page.
 *     responses:
 *       200:
 *         description: Successfully retrieved recent URLs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       shortUrl:
 *                         type: string
 *                         example: "abc123"
 *                       longUrl:
 *                         type: string
 *                         example: "https://example.com"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     hasNext:
 *                       type: boolean
 *                     hasPrevious:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - User must be logged in.
 *       500:
 *         description: Internal server error.
 */
ShortenRouter.get("/recent-urls", isAuthenticated, urlController.getRecentUrls);
export default ShortenRouter;
