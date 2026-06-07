import { Router } from 'express';
import { isSupabaseConfigured } from '../config/env';
import activityRoutes from './activity.routes';
import authRoutes from './auth.routes';
import balancesRoutes from './balances.routes';
import expensesRoutes from './expenses.routes';
import groupsRoutes from './groups.routes';
import settlementsRoutes from './settlements.routes';
import contactsRoutes from './contacts.routes';
import feedbackRoutes from './feedback.routes';
import transfersRoutes from './transfers.routes';
import usersRoutes from './users.routes';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    name: 'SplitSOL API',
    version: '1.0.0',
    supabase: isSupabaseConfigured(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/contacts', contactsRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/transfers', transfersRoutes);
router.use('/groups', groupsRoutes);
router.use('/groups/:id/expenses', expensesRoutes);
router.use('/groups/:id/balances', balancesRoutes);
router.use('/groups/:id/settlements', settlementsRoutes);
router.use('/activity', activityRoutes);

export default router;
