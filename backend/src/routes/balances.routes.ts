import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import * as balanceService from '../services/balance.service';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const balances = await balanceService.getGroupBalances(req.params.id, userId);
    res.json(balances);
  }),
);

export default router;
