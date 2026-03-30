import Expense from '../models/Expense.js';
import Group from '../models/Group.js';
import Notification from '../models/Notification.js';
import { sendSuccess, ApiError } from '../utils/apiResponse.js';

/**
 * @desc    Add expense to group
 * @route   POST /api/v1/groups/:id/expenses
 * @access  Private
 */
export const addExpense = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ApiError('Group not found', 404));
    }

    // Verify user is a group member
    const isMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return next(new ApiError('You are not a member of this group', 403));
    }

    const { title, amount, paidBy, category, date, notes, receipt } = req.body;

    // Use paidBy from body or default to current user
    const payerId = paidBy || req.user._id;

    // Verify payer is a group member
    const payerIsMember = group.members.some(
      (m) => m.user.toString() === payerId.toString()
    );
    if (!payerIsMember) {
      return next(new ApiError('Payer must be a group member', 400));
    }

    // Compute equal split across all group members
    const memberCount = group.members.length;
    const splitAmount = Math.round((amount / memberCount) * 100) / 100;

    // Handle rounding difference
    let remainder = Math.round((amount - splitAmount * memberCount) * 100) / 100;

    const splits = group.members.map((member, index) => {
      let userSplit = splitAmount;
      if (index === 0 && remainder !== 0) {
        userSplit = Math.round((splitAmount + remainder) * 100) / 100;
      }
      return {
        user: member.user,
        amount: userSplit,
      };
    });

    const expense = await Expense.create({
      title,
      amount,
      paidBy: payerId,
      group: group._id,
      splitType: 'equal',
      splits,
      category: category || 'Other',
      date: date || Date.now(),
      notes,
      receipt,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    // Create notifications for all group members except the creator
    const notifications = group.members
      .filter((m) => m.user.toString() !== req.user._id.toString())
      .map((m) => ({
        user: m.user,
        type: 'expense_added',
        message: `${req.user.name} added "${title}" (${amount}) in "${group.title}"`,
        relatedGroup: group._id,
        relatedExpense: expense._id,
        triggeredBy: req.user._id,
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    sendSuccess(res, 201, 'Expense added successfully', { expense: populatedExpense });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get group expenses
 * @route   GET /api/v1/groups/:id/expenses
 * @access  Private
 */
export const getExpenses = async (req, res, next) => {
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

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      Expense.find({ group: req.params.id })
        .populate('paidBy', 'name email avatar')
        .populate('splits.user', 'name email avatar')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments({ group: req.params.id }),
    ]);

    sendSuccess(res, 200, 'Expenses retrieved successfully', {
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single expense
 * @route   GET /api/v1/expenses/:id
 * @access  Private
 */
export const getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .populate('group', 'title');

    if (!expense) {
      return next(new ApiError('Expense not found', 404));
    }

    sendSuccess(res, 200, 'Expense retrieved successfully', { expense });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update expense
 * @route   PUT /api/v1/expenses/:id
 * @access  Private
 */
export const updateExpense = async (req, res, next) => {
  try {
    let expense = await Expense.findById(req.params.id);

    if (!expense) {
      return next(new ApiError('Expense not found', 404));
    }

    const group = await Group.findById(expense.group);

    const { title, amount, paidBy, category, date, notes, receipt } = req.body;

    if (title) expense.title = title;
    if (category) expense.category = category;
    if (date) expense.date = date;
    if (notes !== undefined) expense.notes = notes;
    if (receipt !== undefined) expense.receipt = receipt;
    if (paidBy) expense.paidBy = paidBy;

    // Recalculate splits if amount changed
    if (amount && amount !== expense.amount) {
      expense.amount = amount;

      const memberCount = group.members.length;
      const splitAmount = Math.round((amount / memberCount) * 100) / 100;
      let remainder = Math.round((amount - splitAmount * memberCount) * 100) / 100;

      expense.splits = group.members.map((member, index) => {
        let userSplit = splitAmount;
        if (index === 0 && remainder !== 0) {
          userSplit = Math.round((splitAmount + remainder) * 100) / 100;
        }
        return { user: member.user, amount: userSplit };
      });
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    sendSuccess(res, 200, 'Expense updated successfully', { expense: updatedExpense });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete expense
 * @route   DELETE /api/v1/expenses/:id
 * @access  Private
 */
export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return next(new ApiError('Expense not found', 404));
    }

    await Expense.findByIdAndDelete(req.params.id);

    sendSuccess(res, 200, 'Expense deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get financial summary (Owe/Owed/Categories)
 * @route   GET /api/v1/expenses/summary
 * @access  Private
 */
export const getFinancialSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Aggregate You Are Owed (Others owe you)
    const owedToMe = await Expense.aggregate([
      { $match: { paidBy: userId } },
      { $unwind: '$splits' },
      { $match: { 'splits.user': { $ne: userId } } },
      { $group: { _id: null, total: { $sum: '$splits.amount' } } },
    ]);

    // Aggregate You Owe (You owe others)
    const iOwe = await Expense.aggregate([
      { $match: { paidBy: { $ne: userId }, 'splits.user': userId } },
      { $unwind: '$splits' },
      { $match: { 'splits.user': userId } },
      { $group: { _id: null, total: { $sum: '$splits.amount' } } },
    ]);

    // Category Breakdown (Overall spending)
    const categories = await Expense.aggregate([
      { $match: { 'splits.user': userId } },
      { $unwind: '$splits' },
      { $match: { 'splits.user': userId } },
      { $group: { _id: '$category', amount: { $sum: '$splits.amount' } } },
      { $sort: { amount: -1 } },
    ]);

    const totalOwed = owedToMe[0]?.total || 0;
    const totalOwe = iOwe[0]?.total || 0;
    const netBalance = totalOwed - totalOwe;

    sendSuccess(res, 200, 'Financial summary retrieved', {
      totalOwed,
      totalOwe,
      netBalance,
      categories,
    });
  } catch (error) {
    next(error);
  }
};
