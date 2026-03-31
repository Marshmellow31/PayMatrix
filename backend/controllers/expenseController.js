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
    const { 
      title, 
      amount: rawAmount, 
      paidBy, 
      category, 
      date, 
      notes, 
      receipt, 
      participants, 
      splitType = 'equal',
      splitData = {}, // percentages, shares, exactAmounts, items
      idempotencyKey  // Added field
    } = req.body;

    // --- Idempotency Check ---
    if (idempotencyKey) {
      const existingExpense = await Expense.findOne({ idempotencyKey })
        .populate('paidBy', 'name email avatar')
        .populate('splits.user', 'name email avatar');
      if (existingExpense) {
        return sendSuccess(res, 200, 'Expense already processed', { expense: existingExpense });
      }
    }

    const group = await Group.findById(req.params.id);
    if (!group) return next(new ApiError('Group not found', 404));

    // Verify user is a group member
    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return next(new ApiError('You are not a member of this group', 403));

    const payerId = paidBy || req.user._id;
    
    // Ensure amount is 2-decimal float
    const amount = Math.round(parseFloat(rawAmount) * 100) / 100;

    // Filter and de-duplicate participants
    let splitParticipantIds = participants || group.members.map(m => m.user.toString());
    splitParticipantIds = Array.from(new Set(splitParticipantIds.map(id => id.toString())));

    // Sanitize splitData for currency amounts (convert to 2-decimal float)
    const sanitizedSplitData = { ...splitData };
    if (splitType === 'exact' && splitData.exactAmounts) {
      sanitizedSplitData.exactAmounts = {};
      Object.entries(splitData.exactAmounts).forEach(([userId, val]) => {
        sanitizedSplitData.exactAmounts[userId] = Math.round(parseFloat(val || 0) * 100) / 100;
      });
    }

    // Calculate splits via engine
    const splits = calculateSplits(amount, splitType, splitParticipantIds, payerId, sanitizedSplitData);

    const expense = await Expense.create({
      title,
      amount, // Stored as 2-decimal float
      paidBy: payerId,
      group: group._id,
      splitType,
      splits,
      items: splitData.items || [],
      category: category || 'Other',
      date: date || Date.now(),
      notes,
      receipt,
      idempotencyKey,
    });

    // Create Audit Log
    await AuditLog.create({
      group: group._id,
      expense: expense._id,
      user: req.user._id,
      action: 'create',
      newState: expense.toObject(),
      changeSummary: `Expense "${title}" created for ${rawAmount}`,
    });

    // Activity Log
    await Activity.create({
      group: group._id,
      user: req.user._id,
      type: 'expense_added',
      message: `${req.user.name} added "${title}" (₹${rawAmount})`,
      relatedId: expense._id,
      amount: amount,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    const io = req.app.get('socketio');
    if (io) {
      io.to(`group:${group._id}`).emit('expense:added', {
        expense: populatedExpense,
        groupId: group._id,
      });
      io.to(`group:${group._id}`).emit('activity:new');
    }

    sendSuccess(res, 201, 'Expense added successfully', { expense: populatedExpense });
  } catch (error) {
    next(new ApiError(error.message, 400));
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
      Expense.find({ group: req.params.id, isDeleted: { $ne: true } })
        .populate('paidBy', 'name email avatar')
        .populate('splits.user', 'name email avatar')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments({ group: req.params.id, isDeleted: { $ne: true } }),
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
    const { 
      title, 
      amount: rawAmount, 
      paidBy, 
      category, 
      date, 
      notes, 
      receipt, 
      participants, 
      splitType,
      splitData = {}
    } = req.body;

    let expense = await Expense.findById(req.params.id);
    if (!expense) return next(new ApiError('Expense not found', 404));

    const group = await Group.findById(expense.group);
    
    // Verify user is a group member (Allow non-admins as requested)
    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return next(new ApiError('You are not a member of this group', 403));

    const previousState = expense.toObject();

    // Update basic fields
    if (title) expense.title = title;
    if (category) expense.category = category;
    if (date) expense.date = date;
    if (notes !== undefined) expense.notes = notes;
    if (receipt !== undefined) expense.receipt = receipt;
    if (paidBy) expense.paidBy = paidBy;

    // Recalculate splits if amount, participants, splitType, or splitData changed
    const currAmount = Math.round(parseFloat(rawAmount) * 100) / 100;
    const amountChanged = rawAmount !== undefined && currAmount !== expense.amount;
    const participantsChanged = !!participants;
    const splitTypeChanged = !!splitType && splitType !== expense.splitType;
    const splitDataChanged = Object.keys(splitData).length > 0;

    if (amountChanged || participantsChanged || splitTypeChanged || splitDataChanged) {
      if (rawAmount !== undefined) expense.amount = currAmount;
      if (splitType) expense.splitType = splitType;

      let splitParticipantIds = participants || expense.splits.map(s => s.user.toString());
      splitParticipantIds = Array.from(new Set(splitParticipantIds.map(id => id.toString())));

      // Sanitize splitData for currency amounts (convert to 2-decimal float)
      const sanitizedSplitData = { ...splitData };
      if (expense.splitType === 'exact' && splitData.exactAmounts) {
        sanitizedSplitData.exactAmounts = {};
        Object.entries(splitData.exactAmounts).forEach(([userId, val]) => {
          sanitizedSplitData.exactAmounts[userId] = Math.round(parseFloat(val || 0) * 100) / 100;
        });
      }

      const currentPayerId = paidBy || expense.paidBy;
      // Use engine for new splits
      expense.splits = calculateSplits(expense.amount, expense.splitType, splitParticipantIds, currentPayerId, sanitizedSplitData);
      
      if (splitData.items) expense.items = splitData.items;
    }

    await expense.save();

    // Create Audit Log
    await AuditLog.create({
      group: group._id,
      expense: expense._id,
      user: req.user._id,
      action: 'update',
      previousState,
      newState: expense.toObject(),
      changeSummary: `Expense "${expense.title}" updated by ${req.user.name}`,
    });

    // Activity Log
    await Activity.create({
      group: expense.group,
      user: req.user._id,
      type: 'expense_updated',
      message: `${req.user.name} updated "${expense.title}"`,
      relatedId: expense._id,
      amount: expense.amount,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    const io = req.app.get('socketio');
    if (io) {
      io.to(`group:${expense.group}`).emit('expense:updated', {
        expense: populatedExpense,
        groupId: expense.group,
      });
      io.to(`group:${expense.group}`).emit('activity:new');
    }

    sendSuccess(res, 200, 'Expense updated successfully', { expense: populatedExpense });
  } catch (error) {
    next(new ApiError(error.message, 400));
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
    if (!expense) return next(new ApiError('Expense not found', 404));

    const group = await Group.findById(expense.group);
    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return next(new ApiError('You are not a member of this group', 403));

    const previousState = expense.toObject();

    expense.isDeleted = true;
    expense.deletedBy = req.user._id;
    expense.deletedAt = Date.now();
    await expense.save();

    // Create Audit Log
    await AuditLog.create({
      group: expense.group,
      expense: expense._id,
      user: req.user._id,
      action: 'delete',
      previousState,
      changeSummary: `Expense "${expense.title}" deleted by ${req.user.name}`,
    });

    // Activity Log
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
      io.to(`group:${expense.group}`).emit('activity:new');
    }

    sendSuccess(res, 200, 'Expense deleted successfully');
  } catch (error) {
    next(new ApiError(error.message, 400));
  }
};

/**
 * @desc    Restore a deleted expense
 * @route   PATCH /api/v1/expenses/:id/restore
 * @access  Private
 */
export const restoreExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return next(new ApiError('Expense not found', 404));

    const group = await Group.findById(expense.group);
    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return next(new ApiError('Not authorized', 403));

    if (!expense.isDeleted) return next(new ApiError('Expense is already active', 400));

    expense.isDeleted = false;
    expense.deletedBy = undefined;
    expense.deletedAt = undefined;
    await expense.save();

    // Create Audit Log
    await AuditLog.create({
      group: expense.group,
      expense: expense._id,
      user: req.user._id,
      action: 'restore',
      newState: expense.toObject(),
      changeSummary: `Expense "${expense.title}" restored by ${req.user.name}`,
    });

    // Activity Log
    await Activity.create({
      group: expense.group,
      user: req.user._id,
      type: 'expense_restored',
      message: `${req.user.name} restored the expense "${expense.title}"`,
      relatedId: expense._id,
      amount: expense.amount,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar');

    const io = req.app.get('socketio');
    if (io) {
      io.to(`group:${expense.group}`).emit('expense:added', {
        expense: populatedExpense,
        groupId: expense.group,
      });
      io.to(`group:${expense.group}`).emit('activity:new');
    }

    sendSuccess(res, 200, 'Expense restored successfully', { expense: populatedExpense });
  } catch (error) {
    next(new ApiError(error.message, 400));
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
