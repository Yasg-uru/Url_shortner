import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { rateLimiter } from "../middlewares/rate-limiter.middleware";
import urlController from "../controllers/url.controller";

const ShortenRouter = Router();
ShortenRouter.post('/shorten', isAuthenticated, rateLimiter, urlController.shorten);
ShortenRouter.get('/:alias', isAuthenticated, urlController.redirect);
ShortenRouter.get('/analytics/:alias', isAuthenticated, urlController.getUrlAnalytics);
export default ShortenRouter;