import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { groupCreateLimiter } from '../middleware/rateLimit';
import * as groupIconService from '../services/groupIcon.service';
import * as groupService from '../services/group.service';
import { badRequest } from '../utils/errors';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const groups = await groupService.listGroupsForUser(userId);
    res.json(groups);
  }),
);

router.post(
  '/',
  groupCreateLimiter,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { name, description } = req.body;
    if (!name?.trim()) throw badRequest('name is required');
    const group = await groupService.createGroup(userId, { name, description });
    res.status(201).json(group);
  }),
);

router.post(
  '/join',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { invite_code } = req.body;
    if (!invite_code) throw badRequest('invite_code is required');
    const detail = await groupService.joinGroupByInvite(userId, invite_code);
    res.json(detail);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const detail = await groupService.getGroupDetail(req.params.id, userId);
    res.json(detail);
  }),
);

router.post(
  '/:id/icon',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { image_base64, mime_type } = req.body;
    const group = await groupIconService.uploadGroupIcon(
      req.params.id,
      userId,
      image_base64,
      mime_type,
    );
    res.json(group);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { name, description, is_archived } = req.body;
    const updates: {
      name?: string;
      description?: string | null;
      is_archived?: boolean;
    } = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_archived !== undefined) updates.is_archived = is_archived;
    if (Object.keys(updates).length === 0) {
      throw badRequest('At least one field to update is required');
    }
    const group = await groupService.updateGroup(req.params.id, userId, updates);
    res.json(group);
  }),
);

router.post(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { user_id } = req.body;
    if (!user_id) {
      throw badRequest('user_id is required');
    }
    const member = await groupService.addGroupMember(req.params.id, userId, user_id);
    res.status(201).json(member);
  }),
);

router.delete(
  '/:id/members/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    await groupService.removeMember(req.params.id, userId, req.params.userId);
    res.status(204).send();
  }),
);

router.get(
  '/:id/invite-link',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const link = await groupService.getInviteLink(req.params.id, userId);
    res.json(link);
  }),
);

export default router;
