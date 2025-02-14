import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { rateLimiter } from "../middlewares/rate-limiter.middleware";
import urlController from "../controllers/url.controller";

const ShortenRouter = Router();
ShortenRouter.post('/shorten', isAuthenticated, rateLimiter, urlController.shorten);
ShortenRouter.get('/shorten/:alias', isAuthenticated, urlController.redirect);
ShortenRouter.get('/analytics/overall', isAuthenticated, urlController.getOverallAnalytics);
ShortenRouter.get('/analytics/:alias', isAuthenticated, urlController.getUrlAnalytics);
ShortenRouter.get('/analytics/topic/:topic', isAuthenticated, urlController.getTopicAnalytics);
export default ShortenRouter;