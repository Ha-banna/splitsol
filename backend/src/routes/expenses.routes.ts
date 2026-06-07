import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { expenseCreateLimiter } from '../middleware/rateLimit';
import * as expenseService from '../services/expense.service';
import { badRequest } from '../utils/errors';
import { SplitType } from '../types';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const groupId = req.params.id;
    const limit = Number(req.query.limit ?? 20);
    const offset = Number(req.query.offset ?? 0);
    const result = await expenseService.listExpenses(groupId, userId, limit, offset);
    res.json(result);
  }),
);

router.post(
  '/',
  expenseCreateLimiter,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const groupId = req.params.id;
    const {
      description,
      amount,
      paid_by_user_id,
      split_type,
      date,
      note,
      splits,
    } = req.body;

    if (!description?.trim()) throw badRequest('description is required');
    if (amount == null || Number(amount) <= 0) throw badRequest('amount must be positive');
    if (!paid_by_user_id) throw badRequest('paid_by_user_id is required');
    if (!split_type) throw badRequest('split_type is required');

    const expense = await expenseService.createExpense(groupId, userId, {
      description,
      amount: Number(amount),
      paid_by_user_id,
      split_type: split_type as SplitType,
      date,
      note,
      splits,
    });
    res.status(201).json(expense);
  }),
);

router.patch(
  '/:expenseId',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { description, amount, note } = req.body;
    const expense = await expenseService.updateExpense(
      req.params.id,
      req.params.expenseId,
      userId,
      { description, amount: amount != null ? Number(amount) : undefined, note },
    );
    res.json(expense);
  }),
);

router.delete(
  '/:expenseId',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    await expenseService.deleteExpense(req.params.id, req.params.expenseId, userId);
    res.status(204).send();
  }),
);

export default router;
