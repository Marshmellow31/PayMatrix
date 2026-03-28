const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User'); // Ensure User model is loaded for population

// @desc    Get simplified balances for a group
// @route   GET /api/expenses/group/:id/balances
// @access  Private
exports.getGroupBalances = async (req, res) => {
  try {
    const expenses = await Expense.find({ group: req.params.id });
    const group = await Group.findById(req.params.id).populate('members', 'name email');

    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members) return res.json([]);

    // Calculate net balance for each member
    // net = (amount paid) - (amount owed)
    const balances = {};
    group.members.forEach(m => {
      if (m && m._id) {
        balances[m._id] = 0;
      }
    });

    expenses.forEach(exp => {
      // Add total paid by user
      if (exp.paidBy) {
        balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
      }
      
      // Subtract amount owed by each user in split
      if (exp.split) {
        exp.split.forEach(s => {
          if (s.user) {
            balances[s.user] = (balances[s.user] || 0) - s.amount;
          }
        });
      }
    });

    // Format for response
    const result = group.members.filter(m => m).map(m => ({
      userId: m._id,
      name: m.name,
      balance: balances[m._id] || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get Balances Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add a new expense
// @route   POST /api/expenses
// @access  Private
exports.addExpense = async (req, res) => {
  const { title, amount, group, split, category } = req.body;

  try {
    if (!group) return res.status(400).json({ message: 'Pipeline ID (Group) is required' });

    const groupExists = await Group.findById(group);

    if (!groupExists) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const expense = await Expense.create({
      title,
      amount: parseFloat(amount) || 0,
      group,
      paidBy: req.user._id,
      split,
      category,
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Add Expense Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all expenses for a group
// @route   GET /api/expenses/group/:id
// @access  Private
exports.getGroupExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ group: req.params.id })
      .populate('paidBy', 'name email')
      .populate('split.user', 'name email')
      .sort('-date');
    res.json(expenses);
  } catch (error) {
    console.error('Get Group Expenses Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all expenses for a user (across all groups)
// @route   GET /api/expenses/me
// @access  Private
exports.getUserExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({
      $or: [{ paidBy: req.user._id }, { 'split.user': req.user._id }],
    })
      .populate('group', 'name')
      .populate('paidBy', 'name email')
      .sort('-date');
    res.json(expenses);
  } catch (error) {
    console.error('Get User Expenses Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
