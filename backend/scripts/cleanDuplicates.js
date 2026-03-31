import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const expenseSchema = new mongoose.Schema({}, { strict: false });
const Expense = mongoose.model('Expense', expenseSchema);

async function cleanAllDuplicates() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const all = await Expense.find({ isDeleted: { $ne: true } }).sort({ createdAt: 1 });
  console.log(`Total active expenses: ${all.length}`);

  // Group by (title + amount + group) — more aggressive dedup
  const groups = {};
  for (const e of all) {
    const key = `${e.title}|${e.amount}|${e.group}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  let deleted = 0;
  for (const [key, dupes] of Object.entries(groups)) {
    if (dupes.length > 1) {
      // Keep the first (oldest), delete the rest
      console.log(`\nFound ${dupes.length} entries for: "${dupes[0].title}" ₹${dupes[0].amount}`);
      for (let i = 1; i < dupes.length; i++) {
        console.log(`  Deleting duplicate: ${dupes[i]._id} (created: ${dupes[i].createdAt})`);
        await Expense.deleteOne({ _id: dupes[i]._id });
        deleted++;
      }
      console.log(`  Kept: ${dupes[0]._id} (created: ${dupes[0].createdAt})`);
    }
  }

  console.log(`\nTotal duplicates removed: ${deleted}`);
  const remaining = await Expense.countDocuments({ isDeleted: { $ne: true } });
  console.log(`Remaining active expenses: ${remaining}`);

  await mongoose.disconnect();
  process.exit(0);
}

cleanAllDuplicates().catch(err => { console.error(err); process.exit(1); });
