import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Assuming we run this from backend directory:
import Expense from './models/Expense.js';
import Settlement from './models/Settlement.js';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected.');

    const runMigration = async () => {
      console.log('Migrating expenses...');
      const expenses = await Expense.find({});
      for (const exp of expenses) {
        // If it looks like cents (greater than standard small amount and has no fraction)
        // We divide by 100 for all existing
        exp.amount = Math.round(exp.amount) / 100;
        
        // Update splits array
        exp.splits.forEach(split => {
          split.amount = Math.round(split.amount) / 100;
        });

        // Exact amounts
        if (exp.splitType === 'exact' && exp.splitData && exp.splitData.exactAmounts) {
           Object.keys(exp.splitData.exactAmounts).forEach(userId => {
             exp.splitData.exactAmounts[userId] = Math.round(exp.splitData.exactAmounts[userId]) / 100;
           });
           exp.markModified('splitData');
        }

        await exp.save();
      }

      console.log('Migrating settlements...');
      const settlements = await Settlement.find({});
      for (const set of settlements) {
        set.amount = Math.round(set.amount) / 100;
        await set.save();
      }
    };

    await runMigration();
    console.log('Migration complete!');
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
