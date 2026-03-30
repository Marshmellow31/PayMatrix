import Expense from '../models/Expense.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';
import crypto from 'crypto';
import { calculateSplits } from '../utils/splittingEngine.js';
import { sendSuccess, ApiError } from '../utils/apiResponse.js';

export const processSyncQueue = async (req, res, next) => {
  try {
    const { operations } = req.body;
    
    if (!operations || !Array.isArray(operations)) {
      return next(new ApiError('Invalid operations array', 400));
    }

    const success = [];
    const failed = [];
    const server_updates = [];

    // Sort by timestamp FIFO
    operations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    for (const op of operations) {
      try {
        if (op.entity === 'expense') {
          if (op.type === 'create') {
            const { 
              title, amount: rawAmount, paidBy, category, date, notes, receipt, 
              participants, splitType = 'equal', splitData = {}, groupId
            } = op.payload;

            const group = await Group.findById(groupId);
            if (!group) throw new Error('Group not found');

            const payerId = paidBy || req.user._id;
            const amount = Math.round(parseFloat(rawAmount) * 100) / 100;

            let splitParticipantIds = participants || group.members.map(m => m.user.toString());
            splitParticipantIds = Array.from(new Set(splitParticipantIds.map(id => id.toString())));

            const sanitizedSplitData = { ...splitData };
            if (splitType === 'exact' && splitData.exactAmounts) {
              sanitizedSplitData.exactAmounts = {};
              Object.entries(splitData.exactAmounts).forEach(([userId, val]) => {
                sanitizedSplitData.exactAmounts[userId] = Math.round(parseFloat(val || 0) * 100) / 100;
              });
            }

            const splits = calculateSplits(amount, splitType, splitParticipantIds, payerId, sanitizedSplitData);

            const expense = await Expense.create({
              title, amount, paidBy: payerId, group: group._id, splitType, splits,
              items: splitData.items || [], category: category || 'Other',
              date: date || Date.now(), notes, receipt, syncId: op.operation_id // store for idempotency if schema supports it, otherwise it ignores it
            });

            await AuditLog.create({
              group: group._id, expense: expense._id, user: req.user._id,
              action: 'create', newState: expense.toObject(),
              changeSummary: `[SYNC] Expense "${title}" created for ${rawAmount}`,
            });

            await Activity.create({
              group: group._id, user: req.user._id, type: 'expense_added',
              message: `${req.user.name} added "${title}" (₹${rawAmount}) via Sync`,
              relatedId: expense._id, amount: amount,
            });
            
            success.push(op.operation_id);
            server_updates.push({ operation_id: op.operation_id, server_id: expense._id, entity: 'expense' });

          } else if (op.type === 'update') {
            // Last-Write-Wins with conflict logging
            const { id: expenseId, ...updateData } = op.payload;
            let expense = await Expense.findById(expenseId);
            
            if (!expense) throw new Error('Expense not found');
            
            const clientTimestamp = new Date(op.timestamp);
            const serverTimestamp = new Date(expense.updatedAt || expense.createdAt);
            const previousState = expense.toObject();

            // Check conflict
            if (serverTimestamp > clientTimestamp) {
              await AuditLog.create({
                group: expense.group, expense: expense._id, user: req.user._id,
                action: 'sync_conflict', previousState, newState: updateData,
                changeSummary: `Sync conflict detected for expense ${expense._id}. Client update applied (Last-Write-Wins).`
              });
            }

            // Apply updates
            const { title, amount: rawAmount, paidBy, category, date, notes, receipt, participants, splitType, splitData = {} } = updateData;
            if (title) expense.title = title;
            if (category) expense.category = category;
            if (date) expense.date = date;
            if (notes !== undefined) expense.notes = notes;
            if (receipt !== undefined) expense.receipt = receipt;
            if (paidBy) expense.paidBy = paidBy;

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

              const sanitizedSplitData = { ...splitData };
              if (expense.splitType === 'exact' && splitData.exactAmounts) {
                sanitizedSplitData.exactAmounts = {};
                Object.entries(splitData.exactAmounts).forEach(([userId, val]) => {
                  sanitizedSplitData.exactAmounts[userId] = Math.round(parseFloat(val || 0) * 100) / 100;
                });
              }

              const currentPayerId = paidBy || expense.paidBy;
              expense.splits = calculateSplits(expense.amount, expense.splitType, splitParticipantIds, currentPayerId, sanitizedSplitData);
              if (splitData.items) expense.items = splitData.items;
            }

            await expense.save();

            await AuditLog.create({
              group: expense.group, expense: expense._id, user: req.user._id,
              action: 'update', previousState, newState: expense.toObject(),
              changeSummary: `[SYNC] Expense "${expense.title}" updated by ${req.user.name}`,
            });

            success.push(op.operation_id);

          } else if (op.type === 'delete') {
            const { id: expenseId } = op.payload;
            const expense = await Expense.findById(expenseId);
            
            if (!expense) throw new Error('Expense not found');

            const previousState = expense.toObject();
            expense.isDeleted = true;
            expense.deletedBy = req.user._id;
            expense.deletedAt = Date.now();
            await expense.save();

            await AuditLog.create({
              group: expense.group, expense: expense._id, user: req.user._id,
              action: 'delete', previousState,
              changeSummary: `[SYNC] Expense "${expense.title}" deleted by ${req.user.name}`,
            });

            success.push(op.operation_id);
          }
        } else if (op.entity === 'group') {
          if (op.type === 'create') {
            const { title, category, currency, simplifyDebts, defaultSplit } = op.payload;
            const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

            const group = await Group.create({
              title, category, currency, simplifyDebts, defaultSplit,
              admin: req.user._id, members: [{ user: req.user._id, role: 'admin' }],
              inviteCode, syncId: op.operation_id
            });

            await Activity.create({
              group: group._id, user: req.user._id, type: 'group_created',
              message: `${req.user.name} created the group "${title}" via Sync`,
              relatedId: group._id,
            });

            success.push(op.operation_id);
            server_updates.push({ operation_id: op.operation_id, server_id: group._id, entity: 'group' });

          } else if (op.type === 'add_member') {
            const { groupId, email } = op.payload;
            const group = await Group.findById(groupId);
            if (!group) throw new Error('Group not found');
            if (group.admin.toString() !== req.user._id.toString()) throw new Error('Not admin');

            const userToAdd = await User.findOne({ email });
            if (!userToAdd) throw new Error('User not found');

            const alreadyMember = group.members.some(m => (m.user._id || m.user).toString() === userToAdd._id.toString());
            
            if (!alreadyMember) {
              group.members.push({ user: userToAdd._id, role: 'member' });
              await group.save();

              await Activity.create({
                group: group._id, user: req.user._id, type: 'member_added',
                message: `${req.user.name} added ${userToAdd.name} via Sync`,
                relatedId: userToAdd._id,
              });

              await Notification.create({
                user: userToAdd._id, type: 'member_added',
                message: `You were added to "${group.title}" by ${req.user.name}`,
                relatedGroup: group._id, triggeredBy: req.user._id,
              });
            }
            success.push(op.operation_id);
          }
        }
      } catch (err) {
        console.error(`Error processing operation ${op.operation_id}:`, err);
        failed.push({ operation_id: op.operation_id, error: err.message });
      }
    }

    sendSuccess(res, 200, 'Sync completed', { success, failed, server_updates });
  } catch (error) {
    next(new ApiError(error.message, 500));
  }
};
