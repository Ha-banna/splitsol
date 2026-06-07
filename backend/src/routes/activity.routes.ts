import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import * as activityService from '../services/activity.service';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const limit = Number(req.query.limit ?? 20);
    const offset = Number(req.query.offset ?? 0);
    const feed = await activityService.getActivityFeed(userId, limit, offset);
    res.json(feed);
  }),
);

export default router;
