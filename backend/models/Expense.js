import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: 200,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer is required'],
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group is required'],
    },
    splitType: {
      type: String,
      enum: ['equal', 'exact', 'percentage', 'shares', 'itemized'],
      default: 'equal',
    },
    splits: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        amount: {
          type: Number, // Integer in cents
          required: true,
        },
      },
    ],
    // For itemized splits
    items: [
      {
        name: { type: String, trim: true },
        amount: { type: Number }, // Integer in cents
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      }
    ],
    category: {
      type: String,
      enum: [
        'Food',
        'Travel',
        'Rent',
        'Entertainment',
        'Utilities',
        'Shopping',
        'Health',
        'Education',
        'Other',
      ],
      default: 'Other',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    receipt: {
      type: String,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast group expense lookups
expenseSchema.index({ group: 1, date: -1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
