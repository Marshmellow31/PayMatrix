import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import { sendSuccess, ApiError } from '../utils/apiResponse.js';

/**
 * @desc    Search for users to add as friends
 * @route   GET /api/v1/friends/search
 * @access  Private
 */
export const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return next(new ApiError('Please provide a search query', 400));
    }

    // Search by name or email, excluding self
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ],
        },
      ],
    })
    .select('name email avatar')
    .limit(10);

    sendSuccess(res, 200, 'Users found', { users });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a friend request
 * @route   POST /api/v1/friends/request
 * @access  Private
 */
export const sendFriendRequest = async (req, res, next) => {
  try {
    const { receiverId } = req.body;

    if (receiverId === req.user._id.toString()) {
      return next(new ApiError('You cannot add yourself as a friend', 400));
    }

    // Check if dynamic user exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return next(new ApiError('User not found', 404));
    }

    // Check if already friends
    const sender = await User.findById(req.user._id);
    if (sender.friends.includes(receiverId)) {
      return next(new ApiError('You are already friends', 400));
    }

    // Check for existing request
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id },
      ],
    });

    if (existingRequest) {
      return next(new ApiError('A friend request already exists', 400));
    }

    const friendRequest = await FriendRequest.create({
      sender: req.user._id,
      receiver: receiverId,
    });

    sendSuccess(res, 201, 'Friend request sent', { friendRequest });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get sent and received friend requests
 * @route   GET /api/v1/friends/requests
 * @access  Private
 */
export const getFriendRequests = async (req, res, next) => {
  try {
    const incoming = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending',
    }).populate('sender', 'name email avatar');

    const outgoing = await FriendRequest.find({
      sender: req.user._id,
      status: 'pending',
    }).populate('receiver', 'name email avatar');

    sendSuccess(res, 200, 'Friend requests retrieved', { incoming, outgoing });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Respond to friend request
 * @route   PUT /api/v1/friends/request/:id
 * @access  Private
 */
export const respondToRequest = async (req, res, next) => {
  try {
    const { status } = req.body; // 'accepted' or 'declined'
    const requestId = req.params.id;

    if (!['accepted', 'declined'].includes(status)) {
      return next(new ApiError('Invalid status', 400));
    }

    const request = await FriendRequest.findById(requestId);
    if (!request || request.receiver.toString() !== req.user._id.toString()) {
      return next(new ApiError('Request not found or unauthorized', 404));
    }

    if (status === 'accepted') {
      // Add to both users' friends lists
      await Promise.all([
        User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } }),
        User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } }),
      ]);
      
      request.status = 'accepted';
      await request.save();
      // Optionally delete the request after accepting
      // await request.deleteOne();
    } else {
      request.status = 'declined';
      await request.save();
    }

    sendSuccess(res, 200, `Friend request ${status}`, { status });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all friends
 * @route   GET /api/v1/friends
 * @access  Private
 */
export const getFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name email avatar');
    sendSuccess(res, 200, 'Friends list retrieved', { friends: user.friends });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed analytics for a specific friend
 * @route   GET /api/v1/friends/:friendId/analytics
 * @access  Private
 */
export const getFriendAnalytics = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    // Verify friendship
    const currentUser = await User.findById(userId);
    if (!currentUser.friends.includes(friendId)) {
      return next(new ApiError('User is not in your friends list', 403));
    }

    // Find all mutual expenses
    const expenses = await Expense.find({
      isDeleted: false,
      $and: [
        {
          $or: [
            { paidBy: userId },
            { 'splits.user': userId }
          ]
        },
        {
          $or: [
            { paidBy: friendId },
            { 'splits.user': friendId }
          ]
        }
      ]
    }).populate('paidBy', 'name').populate('group', 'title');

    // Find all mutual settlements
    const settlements = await Settlement.find({
      $or: [
        { payer: userId, payee: friendId },
        { payer: friendId, payee: userId }
      ]
    }).populate('group', 'title');

    // Calculate Net Balance
    let netBalance = 0; // Negative means current user owes friend, Positive means friend owes current user
    let turnover = 0;

    expenses.forEach(exp => {
      const amount = exp.amount;
      turnover += amount;

      if (exp.paidBy._id.toString() === userId.toString()) {
        // Current user paid, friend might owe part of it
        const friendSplit = exp.splits.find(s => s.user.toString() === friendId.toString());
        if (friendSplit) {
          netBalance += friendSplit.amount;
        }
      } else if (exp.paidBy._id.toString() === friendId.toString()) {
        // Friend paid, current user might owe part of it
        const userSplit = exp.splits.find(s => s.user.toString() === userId.toString());
        if (userSplit) {
          netBalance -= userSplit.amount;
        }
      }
    });

    settlements.forEach(set => {
      turnover += set.amount;
      if (set.payer.toString() === userId.toString()) {
        // Current user paid friend, reducing debt
        netBalance += set.amount;
      } else {
        // Friend paid current user, reducing what they owe
        netBalance -= set.amount;
      }
    });

    sendSuccess(res, 200, 'Friend analytics retrieved', {
      netBalance,
      turnover,
      expenseCount: expenses.length,
      settlementCount: settlements.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get analytics for the entire friend network
 * @route   GET /api/v1/friends/network/analytics
 * @access  Private
 */
export const getNetworkAnalytics = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name email avatar');
    const friends = user.friends;

    const networkAnalytics = await Promise.all(
      friends.map(async (friend) => {
        // Find all mutual expenses where both are involved
        const expenses = await Expense.find({
          isDeleted: false,
          $and: [
            { $or: [{ paidBy: req.user._id }, { 'splits.user': req.user._id }] },
            { $or: [{ paidBy: friend._id }, { 'splits.user': friend._id }] }
          ]
        });

        // Find all mutual settlements
        const settlements = await Settlement.find({
          $or: [
            { payer: req.user._id, payee: friend._id },
            { payer: friend._id, payee: req.user._id }
          ]
        });

        let netBalance = 0;
        let turnover = 0;

        expenses.forEach(exp => {
          turnover += exp.amount;
          if (exp.paidBy.toString() === req.user._id.toString()) {
            const friendSplit = exp.splits.find(s => s.user.toString() === friend._id.toString());
            if (friendSplit) netBalance += friendSplit.amount;
          } else if (exp.paidBy.toString() === friend._id.toString()) {
            const userSplit = exp.splits.find(s => s.user.toString() === req.user._id.toString());
            if (userSplit) netBalance -= userSplit.amount;
          }
        });

        settlements.forEach(set => {
          turnover += set.amount;
          if (set.payer.toString() === req.user._id.toString()) {
            netBalance += set.amount;
          } else {
            netBalance -= set.amount;
          }
        });

        return {
          friend: {
            _id: friend._id,
            name: friend.name,
            email: friend.email,
            avatar: friend.avatar
          },
          netBalance,
          turnover
        };
      })
    );

    sendSuccess(res, 200, 'Network analytics retrieved', { networkAnalytics });
  } catch (error) {
    next(error);
  }
};

