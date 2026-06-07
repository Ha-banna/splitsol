import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { submitFeedback } from '../services/feedback.service';

const router = Router();

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { category, message, platform, app_version } = req.body;
    const result = await submitFeedback(userId, {
      category,
      message,
      platform,
      app_version,
    });
    res.status(201).json(result);
  }),
);

export default router;
