import crypto from 'crypto';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import Notification from '../models/Notification.js';
import Activity from '../models/Activity.js';
import { computeGroupBalances, simplifyDebts } from '../utils/balanceEngine.js';
import { sendSuccess, ApiError } from '../utils/apiResponse.js';

/**
 * @desc    Create a new group
 * @route   POST /api/v1/groups
 * @access  Private
 */
export const createGroup = async (req, res, next) => {

  try {
    const { title, category, currency, simplifyDebts, defaultSplit } = req.body;

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const group = await Group.create({
      title,
      category,
      currency,
      simplifyDebts,
      defaultSplit,
      admin: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
      inviteCode,
    });

    // Create group activity log
    await Activity.create({
      group: group._id,
      user: req.user._id,
      type: 'group_created',
      message: `${req.user.name} created the group "${title}"`,
      relatedId: group._id,
    });


    const populatedGroup = await Group.findById(group._id).populate(
      'members.user',
      'name email avatar'
    );

    sendSuccess(res, 201, 'Group created successfully', { group: populatedGroup });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's groups
 * @route   GET /api/v1/groups
 * @access  Private
 */
export const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    sendSuccess(res, 200, 'Groups retrieved successfully', { groups });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single group details
 * @route   GET /api/v1/groups/:id
 * @access  Private
 */
export const getGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate(
      'members.user',
      'name email avatar'
    );

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    // Check if user is a member
    const isMember = group.members.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return next(new ApiError('Not authorized to view this group', 403));
    }

    sendSuccess(res, 200, 'Group retrieved successfully', { group });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update group
 * @route   PUT /api/v1/groups/:id
 * @access  Private (admin only)
 */
export const updateGroup = async (req, res, next) => {
  try {
    let group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return next(new ApiError('Only the group admin can update settings', 403));
    }

    const { title, category, currency, simplifyDebts, defaultSplit, image } = req.body;

    if (title) group.title = title;
    if (category) group.category = category;
    if (currency) group.currency = currency;
    if (simplifyDebts !== undefined) group.simplifyDebts = simplifyDebts;
    if (defaultSplit) group.defaultSplit = defaultSplit;
    if (image) group.image = image;

    await group.save();

    group = await Group.findById(group._id).populate(
      'members.user',
      'name email avatar'
    );

    sendSuccess(res, 200, 'Group updated successfully', { group });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete group
 * @route   DELETE /api/v1/groups/:id
 * @access  Private (admin only)
 */
export const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return next(new ApiError('Only the group admin can delete this group', 403));
    }

    await Group.findByIdAndDelete(req.params.id);

    sendSuccess(res, 200, 'Group deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add member to group
 * @route   POST /api/v1/groups/:id/members
 * @access  Private (admin)
 */
export const addMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return next(new ApiError('Only the group admin can add members', 403));
    }

    const { email } = req.body;

    if (!email) {
      return next(new ApiError('Please provide a member email', 400));
    }

    const userToAdd = await User.findOne({ email });

    if (!userToAdd) {
      return next(new ApiError('User with that email not found', 404));
    }

    // Check if already a member (robust check)
    const alreadyMember = group.members.some(
      (m) => (m.user._id || m.user).toString() === userToAdd._id.toString()
    );

    if (alreadyMember) {
      return next(new ApiError('User is already a member of this group', 400));
    }

    group.members.push({ user: userToAdd._id, role: 'member' });
    await group.save();

    // Create a group activity log
    await Activity.create({
      group: group._id,
      user: req.user._id,
      type: 'member_added',
      message: `${req.user.name} added ${userToAdd.name} to the group`,
      relatedId: userToAdd._id,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(`group:${group._id}`).emit('activity:new', {
        groupId: group._id,
      });
    }

    // Create notification for added user
    await Notification.create({
      user: userToAdd._id,
      type: 'member_added',
      message: `You were added to "${group.title}" by ${req.user.name}`,
      relatedGroup: group._id,
      triggeredBy: req.user._id,
    });

    const updatedGroup = await Group.findById(group._id).populate(
      'members.user',
      'name email avatar'
    );

    sendSuccess(res, 200, 'Member added successfully', { group: updatedGroup });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove member from group
 * @route   DELETE /api/v1/groups/:id/members/:userId
 * @access  Private (admin)
 */
export const removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return next(new ApiError('Only the group admin can remove members', 403));
    }

    const { userId } = req.params;

    // Cannot remove the admin
    if (userId === group.admin.toString()) {
      return next(new ApiError('Cannot remove the group admin', 400));
    }

    // NEW: Check for outstanding balances before removal
    const [expenses, settlements] = await Promise.all([
      Expense.find({ group: group._id, isDeleted: { $ne: true } }),
      Settlement.find({ group: group._id })
    ]);

    const balances = computeGroupBalances(expenses, settlements, group.members);
    const memberBalance = balances[userId] || 0;

    if (Math.abs(memberBalance) > 0.01) { // Floating point safety
      return next(new ApiError('User has outstanding balances. They must settle before removal.', 400));
    }

    const memberIndex = group.members.findIndex(
      (m) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      return next(new ApiError('User is not a member of this group', 404));
    }

    group.members.splice(memberIndex, 1);
    await group.save();

    // Create a group activity log
    await Activity.create({
      group: group._id,
      user: req.user._id,
      type: 'member_removed',
      message: `${req.user.name} removed a member from the group`,
      relatedId: userId,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(`group:${group._id}`).emit('activity:new', {
        groupId: group._id,
      });
    }

    // Create notification for removed user
    await Notification.create({
      user: userId,
      type: 'member_removed',
      message: `You were removed from "${group.title}"`,
      relatedGroup: group._id,
      triggeredBy: req.user._id,
    });

    const updatedGroup = await Group.findById(group._id).populate(
      'members.user',
      'name email avatar'
    );

    sendSuccess(res, 200, 'Member removed successfully', { group: updatedGroup });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Join group via invite code
 * @route   POST /api/v1/groups/join/:code
 * @access  Private
 */
export const joinGroupByCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    const group = await Group.findOne({ inviteCode: code });

    if (!group) {
      return next(new ApiError('Invalid invite code', 404));
    }

    // Check if already a member (robust check)
    const alreadyMember = group.members.some(
      (m) => (m.user._id || m.user).toString() === req.user._id.toString()
    );

    if (alreadyMember) {
      return next(new ApiError('You are already a member of this group', 400));
    }

    group.members.push({ user: req.user._id, role: 'member' });
    await group.save();

    // Create a group activity log
    await Activity.create({
      group: group._id,
      user: req.user._id,
      type: 'member_added',
      message: `${req.user.name} joined the group via code`,
      relatedId: req.user._id,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(`group:${group._id}`).emit('activity:new', {
        groupId: group._id,
      });
    }

    // Create notification for admin
    await Notification.create({
      user: group.admin,
      type: 'member_added',
      message: `${req.user.name} joined "${group.title}" via link`,
      relatedGroup: group._id,
      triggeredBy: req.user._id,
    });

    sendSuccess(res, 200, 'Joined group successfully', { groupId: group._id });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get group activity log
 * @route   GET /api/v1/groups/:id/activity
 * @access  Private (members only)
 */
export const getGroupActivity = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    // Check if user is a member
    const isMember = group.members.some(
      (m) => (m.user._id || m.user).toString() === req.user._id.toString()
    );

    if (!isMember) {
      return next(new ApiError('Not authorized to view this group activity', 403));
    }

    const activity = await Activity.find({ group: req.params.id })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    sendSuccess(res, 200, 'Group activity retrieved successfully', { activity });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get group balances and simplified debts
 * @route   GET /api/v1/groups/:id/balances
 * @access  Private (members only)
 */
export const getGroupBalances = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate('members.user', 'name avatar email');
    if (!group) return next(new ApiError('Group not found', 404));

    // Check membership
    const isMember = group.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return next(new ApiError('Not authorized', 403));

    // Fetch all group data
    const [expenses, settlements] = await Promise.all([
      Expense.find({ group: group._id, isDeleted: { $ne: true } }),
      Settlement.find({ group: group._id })
    ]);

    // Compute net positions
    const rawNetBalances = computeGroupBalances(expenses, settlements, group.members);
    
    // Transform into the array format the frontend expects
    const memberMap = new Map(group.members.map(m => [m.user._id.toString(), m.user]));
    const netBalances = Array.from(memberMap.values()).map(user => ({
      user,
      balance: rawNetBalances[user._id.toString()] || 0
    }));

    // Simplify debts if enabled (default true)
    let simplifiedDebts = [];
    if (group.simplifyDebts !== false) {
      const rawDebts = simplifyDebts(rawNetBalances);
      
      simplifiedDebts = rawDebts.map(debt => ({
        fromUser: memberMap.get(debt.from),
        toUser: memberMap.get(debt.to),
        amount: debt.amount
      }));
    }

    sendSuccess(res, 200, 'Balances retrieved successfully', {
      balances: netBalances,
      simplifiedDebts,
      members: group.members
    });
  } catch (error) {
    next(new ApiError(error.message, 500));
  }
};

