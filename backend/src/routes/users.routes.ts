import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import * as userAvatarService from '../services/userAvatar.service';
import * as userService from '../services/user.service';
import { badRequest } from '../utils/errors';
import { normalizeUsername } from '../utils/username';

const router = Router();

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const user = await userService.getUserById(userId);
    res.json(user);
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { display_name, username, avatar_url, push_token } = req.body;
    const user = await userService.updateUser(userId, {
      display_name,
      username,
      avatar_url,
      push_token,
    });
    res.json(user);
  }),
);

router.post(
  '/me/avatar',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { image_base64, mime_type } = req.body;
    const user = await userAvatarService.uploadUserAvatar(userId, image_base64, mime_type);
    res.json(user);
  }),
);

router.get(
  '/username-available',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const raw = String(req.query.username ?? '');
    if (!raw.trim()) {
      throw badRequest('username query parameter is required');
    }
    try {
      const available = await userService.isUsernameAvailable(raw, userId);
      res.json({ available, username: normalizeUsername(raw) });
    } catch (err) {
      res.json({ available: false, username: null, reason: (err as Error).message });
    }
  }),
);

router.get(
  '/by-username/:username',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await userService.getUserByUsername(req.params.username);
    res.json(userService.toPublicProfile(user));
  }),
);

router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '');
    if (!q.trim()) {
      throw badRequest('Query parameter q is required');
    }
    const users = await userService.searchUsers(q);
    res.json(users.map(userService.toPublicProfile));
  }),
);

export default router;
