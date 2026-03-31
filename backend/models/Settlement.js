import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema(
  {
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer is required'],
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payee is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group is required'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast group settlement lookups
settlementSchema.index({ group: 1, createdAt: -1 });

const Settlement = mongoose.model('Settlement', settlementSchema);
export default Settlement;
