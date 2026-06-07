import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import * as transferService from '../services/transfer.service';
import { badRequest } from '../utils/errors';

const router = Router();

router.use(requireAuth);

router.post(
  '/prepare',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { to_user_id, to_username, amount_usdc, note } = req.body;
    if (amount_usdc == null) throw badRequest('amount_usdc is required');
    const prepared = await transferService.preparePeerTransfer(userId, {
      to_user_id,
      to_username,
      amount_usdc: Number(amount_usdc),
      note,
    });
    res.json(prepared);
  }),
);

router.post(
  '/confirm',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { to_user_id, amount_usdc, tx_signature, note } = req.body;
    if (!to_user_id || amount_usdc == null || !tx_signature) {
      throw badRequest('to_user_id, amount_usdc, and tx_signature are required');
    }
    const result = await transferService.confirmPeerTransfer(userId, {
      to_user_id,
      amount_usdc: Number(amount_usdc),
      tx_signature,
      note,
    });
    res.json(result);
  }),
);

export default router;
