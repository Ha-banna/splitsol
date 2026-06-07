import { NextFunction, Request, Response, Router } from 'express';
import { renderAdminDashboard } from '../admin/dashboard';
import { isAdminEnabled } from '../config/env';
import { getAdminStats } from '../services/admin.service';
import { listFeedbackForAdmin } from '../services/feedback.service';

const router = Router();

function adminOnly(_req: Request, res: Response, next: NextFunction) {
  if (!isAdminEnabled()) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
}

router.use(adminOnly);

router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/feedback', async (_req, res, next) => {
  try {
    const items = await listFeedbackForAdmin(100);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req, res) => {
  res.type('html').send(renderAdminDashboard());
});

export default router;
