import Expense from '../models/Expense.js';
import Group from '../models/Group.js';
import Notification from '../models/Notification.js';
import Activity from '../models/Activity.js';
import AuditLog from '../models/AuditLog.js';
import { calculateSplits, SplitTypes } from '../utils/splittingEngine.js';
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

    const { title, amount, paidBy, category, date, notes, receipt, participants } = req.body;

    // Use paidBy from body or default to current user
    const payerId = paidBy || req.user._id;

    // Verify payer is a group member
    const payerIsMember = group.members.some(
      (m) => m.user.toString() === payerId.toString()
    );
    if (!payerIsMember) {
      return next(new ApiError('Payer must be a group member', 400));
    }

    // Determine who is involved in the split
    let splitParticipants = group.members;
    if (participants && Array.isArray(participants) && participants.length > 0) {
      // Filter group members to only include those in the participants list
      splitParticipants = group.members.filter(m => 
        participants.includes(m.user.toString())
      );
    }

    // De-duplicate participants to ensure accurate split count
    const uniqueParticipantsMap = new Map();
    splitParticipants.forEach(m => {
      const id = (m.user?._id || m.user).toString();
      if (!uniqueParticipantsMap.has(id)) {
        uniqueParticipantsMap.set(id, m);
      }
    });
    const uniqueParticipants = Array.from(uniqueParticipantsMap.values());

    if (uniqueParticipants.length === 0) {
      return next(new ApiError('At least one valid group member must be selected for the split', 400));
    }

    // Compute equal split across unique selected participants
    const memberCount = uniqueParticipants.length;
    const splitAmount = Math.round((amount / memberCount) * 100) / 100;

    // Handle rounding difference
    let remainder = Math.round((amount - splitAmount * memberCount) * 100) / 100;

    const splits = uniqueParticipants.map((member, index) => {
      let userSplit = splitAmount;
      if (index === 0 && remainder !== 0) {
        userSplit = Math.round((splitAmount + remainder) * 100) / 100;
      }
      return {
        user: (member.user?._id || member.user),
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

    // Create a group activity log
    await Activity.create({
      group: group._id,
      user: req.user._id,
      type: 'expense_added',
      message: `${req.user.name} added "${title}" (${amount}) in "${group.title}"`,
      relatedId: expense._id,
      amount: amount,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(`group:${group._id}`).emit('expense:added', {
        expense: populatedExpense,
        groupId: group._id,
      });
      // Emit activity update
      io.to(`group:${group._id}`).emit('activity:new', {
        groupId: group._id,
      });
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
        .sort({ date: -1, createdAt: -1 })
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

    const { title, amount, paidBy, category, date, notes, receipt, participants } = req.body;

    if (title) expense.title = title;
    if (category) expense.category = category;
    if (date) expense.date = date;
    if (notes !== undefined) expense.notes = notes;
    if (receipt !== undefined) expense.receipt = receipt;
    if (paidBy) expense.paidBy = paidBy;

    // Recalculate splits if amount OR participants changed
    if ((amount && amount !== expense.amount) || participants) {
      if (amount) expense.amount = amount;

      let splitParticipants = [];
      if (participants && Array.isArray(participants) && participants.length > 0) {
        // Use provided participants
        splitParticipants = group.members.filter(m => 
          participants.includes(m.user.toString())
        );
      } else {
        // Maintain existing unique participants if they are still group members
        const currentParticipantIds = expense.splits.map(s => (s.user?._id || s.user).toString());
        splitParticipants = group.members.filter(m => 
          currentParticipantIds.includes((m.user?._id || m.user).toString())
        );
      }

      // De-duplicate
      const uniqueParticipantsMap = new Map();
      splitParticipants.forEach(m => {
        const id = (m.user?._id || m.user).toString();
        if (!uniqueParticipantsMap.has(id)) {
          uniqueParticipantsMap.set(id, m);
        }
      });
      let uniqueParticipants = Array.from(uniqueParticipantsMap.values());

      // Default back to all members if somehow no participants were found
      if (uniqueParticipants.length === 0) {
          const allMembersMap = new Map();
          group.members.forEach(m => {
              const id = (m.user?._id || m.user).toString();
              if (!allMembersMap.has(id)) allMembersMap.set(id, m);
          });
          uniqueParticipants = Array.from(allMembersMap.values());
      }

      const memberCount = uniqueParticipants.length;
      const splitAmount = Math.round((expense.amount / memberCount) * 100) / 100;
      let remainder = Math.round((expense.amount - splitAmount * memberCount) * 100) / 100;

      expense.splits = uniqueParticipants.map((member, index) => {
        let userSplit = splitAmount;
        if (index === 0 && remainder !== 0) {
          userSplit = Math.round((splitAmount + remainder) * 100) / 100;
        }
        return { user: (member.user?._id || member.user), amount: userSplit };
      });
    }

    await expense.save();

    // Create a group activity log
    await Activity.create({
      group: expense.group,
      user: req.user._id,
      type: 'expense_updated',
      message: `${req.user.name} updated "${expense.title}" now (${expense.amount})`,
      relatedId: expense._id,
      amount: expense.amount,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    const io = req.app.get('socketio');
    if (io) {
      io.to(`group:${expense.group}`).emit('expense:updated', {
        expense: updatedExpense,
        groupId: expense.group,
      });
      io.to(`group:${expense.group}`).emit('activity:new', {
        groupId: expense.group,
      });
    }

    sendSuccess(res, 200, 'Expense updated successfully', { expense: populatedExpense });
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

    // Create a group activity log
    await Activity.create({
      group: expense.group,
      user: req.user._id,
      type: 'expense_deleted',
      message: `${req.user.name} removed expense "${expense.title}"`,
      relatedId: expense._id,
      amount: expense.amount,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(`group:${expense.group}`).emit('expense:deleted', {
        expenseId: expense._id,
        groupId: expense.group,
      });
      io.to(`group:${expense.group}`).emit('activity:new', {
        groupId: expense.group,
      });
    }

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

/**
 * @desc    Get spending trends (last 30 days)
 * @route   GET /api/v1/expenses/trends
 * @access  Private
 */
export const getSpendingTrends = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days, 10) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await Expense.aggregate([
      {
        $match: {
          'splits.user': userId,
          date: { $gte: startDate },
        },
      },
      { $unwind: '$splits' },
      { $match: { 'splits.user': userId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$splits.amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    sendSuccess(res, 200, 'Spending trends retrieved', { trends });
  } catch (error) {
    next(error);
  }
};
