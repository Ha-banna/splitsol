import { Router } from 'express';
import { parseWalletAddress } from '../lib/solana-auth';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { settlementLimiter } from '../middleware/rateLimit';
import * as settlementService from '../services/settlement.service';
import { badRequest } from '../utils/errors';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const settlements = await settlementService.listSettlements(req.params.id, userId);
    res.json(settlements);
  }),
);

router.post(
  '/prepare',
  settlementLimiter,
  asyncHandler(async (req, res) => {
    const { userId, walletAddress } = req as AuthedRequest;
    const { payer_wallet_address } = req.body;
    if (!payer_wallet_address) {
      throw badRequest('payer_wallet_address is required');
    }
    if (parseWalletAddress(payer_wallet_address) !== parseWalletAddress(walletAddress)) {
      throw badRequest('payer_wallet_address must match your session wallet');
    }
    const prepared = await settlementService.prepareSettlement(
      req.params.id,
      userId,
      payer_wallet_address,
    );
    res.json(prepared);
  }),
);

router.post(
  '/confirm',
  settlementLimiter,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { tx_signature } = req.body;
    if (!tx_signature) throw badRequest('tx_signature is required');
    const result = await settlementService.confirmSettlement(
      req.params.id,
      userId,
      tx_signature,
    );
    res.json(result);
  }),
);

export default router;
