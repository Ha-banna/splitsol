import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authLimiter } from '../middleware/rateLimit';
import * as authService from '../services/auth.service';
import { badRequest } from '../utils/errors';

const router = Router();

router.use(authLimiter);

router.post(
  '/wallet/challenge',
  asyncHandler(async (req, res) => {
    const { wallet_address } = req.body;
    if (!wallet_address || typeof wallet_address !== 'string') {
      throw badRequest('wallet_address is required');
    }
    const challenge = await authService.createWalletChallenge(wallet_address);
    res.json(challenge);
  }),
);

router.post(
  '/wallet',
  asyncHandler(async (req, res) => {
    const { wallet_address, signed_message, signature } = req.body;
    if (!wallet_address || !signed_message || !signature) {
      throw badRequest('wallet_address, signed_message, and signature are required');
    }
    const result = await authService.authenticateWallet(
      wallet_address,
      signed_message,
      signature,
    );
    res.json(result);
  }),
);

router.post(
  '/email',
  asyncHandler(async (req, res) => {
    const { privy_token } = req.body;
    if (!privy_token) {
      throw badRequest('privy_token is required');
    }
    const result = await authService.authenticatePrivy(privy_token);
    res.json(result);
  }),
);

export default router;
