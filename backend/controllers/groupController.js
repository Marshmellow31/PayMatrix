import Group from '../models/Group.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendSuccess, ApiError } from '../utils/apiResponse.js';

/**
 * @desc    Create a new group
 * @route   POST /api/v1/groups
 * @access  Private
 */
export const createGroup = async (req, res, next) => {
  try {
    const { title, category, currency, simplifyDebts, defaultSplit } = req.body;

    const group = await Group.create({
      title,
      category,
      currency,
      simplifyDebts,
      defaultSplit,
      admin: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
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

    // Check if already a member
    const alreadyMember = group.members.some(
      (m) => m.user.toString() === userToAdd._id.toString()
    );

    if (alreadyMember) {
      return next(new ApiError('User is already a member of this group', 400));
    }

    group.members.push({ user: userToAdd._id, role: 'member' });
    await group.save();

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

    const memberIndex = group.members.findIndex(
      (m) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      return next(new ApiError('User is not a member of this group', 404));
    }

    group.members.splice(memberIndex, 1);
    await group.save();

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
