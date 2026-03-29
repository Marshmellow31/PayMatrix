import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Group title is required'],
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      enum: ['Trip', 'Roommates', 'Events', 'Couple', 'Other'],
      default: 'Other',
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    simplifyDebts: {
      type: Boolean,
      default: true,
    },
    defaultSplit: {
      type: String,
      enum: ['equal', 'exact', 'percentage'],
      default: 'equal',
    },
    image: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast member lookups
groupSchema.index({ 'members.user': 1 });

const Group = mongoose.model('Group', groupSchema);
export default Group;
