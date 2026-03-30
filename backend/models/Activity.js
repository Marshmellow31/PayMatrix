import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'expense_added',
        'expense_updated',
        'expense_deleted',
        'member_added',
        'member_removed',
        'group_created',
        'settlement_added',
        'expense_restored',
        'member_left',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    amount: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast group activity lookups
activitySchema.index({ group: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
