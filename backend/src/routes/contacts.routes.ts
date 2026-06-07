import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import * as contactService from '../services/contact.service';
import { badRequest } from '../utils/errors';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const contacts = await contactService.listContacts(userId);
    res.json({ contacts });
  }),
);

router.get(
  '/requests/received',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const requests = await contactService.listIncomingFriendRequests(userId);
    res.json({ requests });
  }),
);

router.get(
  '/requests/sent',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const requests = await contactService.listOutgoingFriendRequests(userId);
    res.json({ requests });
  }),
);

router.post(
  '/requests',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { user_id, username } = req.body;
    if (!user_id && !username) {
      throw badRequest('user_id or username is required');
    }
    const result = await contactService.sendFriendRequest(userId, { user_id, username });
    if ('contact_user_id' in result) {
      res.status(200).json({ contact: result, auto_accepted: true });
      return;
    }
    res.status(201).json({ request: result });
  }),
);

router.post(
  '/requests/:requestId/accept',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const contact = await contactService.acceptFriendRequest(req.params.requestId, userId);
    res.json({ contact });
  }),
);

router.post(
  '/requests/:requestId/decline',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    await contactService.declineFriendRequest(req.params.requestId, userId);
    res.status(204).send();
  }),
);

router.delete(
  '/requests/:requestId',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    await contactService.cancelFriendRequest(req.params.requestId, userId);
    res.status(204).send();
  }),
);

router.delete(
  '/:contactUserId',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    await contactService.removeContact(userId, req.params.contactUserId);
    res.status(204).send();
  }),
);

export default router;
