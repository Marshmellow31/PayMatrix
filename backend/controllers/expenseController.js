// @desc    Get simplified balances for a group
// @route   GET /api/expenses/group/:id/balances
// @access  Private
exports.getGroupBalances = async (req, res) => {
  try {
    const expenses = await Expense.find({ group: req.params.id });
    const group = await Group.findById(req.params.id).populate('members', 'name email');

    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Calculate net balance for each member
    // net = (amount paid) - (amount owed)
    const balances = {};
    group.members.forEach(m => (balances[m._id] = 0));

    expenses.forEach(exp => {
      // Add total paid by user
      balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
      
      // Subtract amount owed by each user in split
      exp.split.forEach(s => {
        balances[s.user] = (balances[s.user] || 0) - s.amount;
      });
    });

    // Format for response
    const result = group.members.map(m => ({
      userId: m._id,
      name: m.name,
      balance: balances[m._id],
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// @route   POST /api/expenses
// @access  Private
exports.addExpense = async (req, res) => {
  const { title, amount, group, split, category } = req.body;

  try {
    const groupExists = await Group.findById(group);

    if (!groupExists) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const expense = await Expense.create({
      title,
      amount,
      group,
      paidBy: req.user._id,
      split,
      category,
    });

    res.status(201).json(expense);
  } catch (error) {
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
      .populate('split.user', 'name email');
    res.json(expenses);
  } catch (error) {
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
      .sort('-date');
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
