import Settlement from '../models/Settlement.js';
import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import Notification from '../models/Notification.js';
import { sendSuccess, ApiError } from '../utils/apiResponse.js';
import { computeGroupBalances } from '../utils/balanceEngine.js';
/**
 * @desc    Get group balances
 * @route   GET /api/v1/groups/:id/balances
 * @access  Private
 */
export const getBalances = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate(
      'members.user',
      'name email avatar'
    );

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    const isMember = group.members.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return next(new ApiError('You are not a member of this group', 403));
    }

    const [expenses, settlements] = await Promise.all([
      Expense.find({ group: group._id, isDeleted: { $ne: true } }),
      Settlement.find({ group: group._id })
    ]);

    const rawBalances = computeGroupBalances(expenses, settlements, group.members);

    // Enrich with user info
    const enrichedBalances = Object.keys(rawBalances).map((userId) => {
      const member = group.members.find(
        (m) => m.user._id.toString() === userId
      );
      return {
        user: member ? member.user : { _id: userId },
        balance: rawBalances[userId],
      };
    });

    sendSuccess(res, 200, 'Balances retrieved successfully', {
      balances: enrichedBalances,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record a settlement
 * @route   POST /api/v1/groups/:id/settlements
 * @access  Private
 */
export const createSettlement = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    const isMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return next(new ApiError('You are not a member of this group', 403));
    }

    const { payee, amount, notes } = req.body;

    if (!payee || amount === undefined) {
      return next(new ApiError('Payee and amount are required', 400));
    }

    const roundedAmount = Math.round(parseFloat(amount) * 100) / 100;

    if (roundedAmount <= 0) {
      return next(new ApiError('Amount must be greater than 0', 400));
    }

    // Verify payee is a group member
    const payeeIsMember = group.members.some(
      (m) => m.user.toString() === payee.toString()
    );
    if (!payeeIsMember) {
      return next(new ApiError('Payee must be a group member', 400));
    }

    const settlement = await Settlement.create({
      payer: req.user._id,
      payee,
      amount: roundedAmount,
      group: group._id,
      notes,
    });

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar');

    // Create notification for payee
    await Notification.create({
      user: payee,
      type: 'settlement_created',
      message: `${req.user.name} paid you ₹${amount} in "${group.title}"`,
      relatedGroup: group._id,
      triggeredBy: req.user._id,
    });

    sendSuccess(res, 201, 'Settlement recorded successfully', {
      settlement: populatedSettlement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get settlement history for group
 * @route   GET /api/v1/groups/:id/settlements
 * @access  Private
 */
export const getSettlements = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    const isMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return next(new ApiError('You are not a member of this group', 403));
    }

    const settlements = await Settlement.find({ group: req.params.id })
      .populate('payer', 'name email avatar')
      .populate('payee', 'name email avatar')
      .sort({ createdAt: -1 });

    sendSuccess(res, 200, 'Settlements retrieved successfully', { settlements });
  } catch (error) {
    next(error);
  }
};
