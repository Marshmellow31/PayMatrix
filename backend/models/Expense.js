const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide an expense title'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  split: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      amount: {
        type: Number,
      },
    },
  ],
  category: {
    type: String,
    default: 'Other',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  isSettled: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Expense', expenseSchema);
