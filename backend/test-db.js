import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Expense from './models/Expense.js';
import Settlement from './models/Settlement.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {}).then(async () => {
    const groupId = '69caa00eb17e31bd9805a718'; 
    const allExp = await Expense.find({ group: groupId, isDeleted: { $ne: true } });
    
    let netBalances = {};
    const initOrGet = (id) => { if (netBalances[id] === undefined) netBalances[id] = 0; return netBalances[id]; };
    
    let logLines = [];
    allExp.forEach(expense => {
        const payerId = expense.paidBy.toString();
        logLines.push(`Expense: ${expense.title} | Paid: ${payerId} | Amt: ${expense.amount}`);
        
        expense.splits.forEach(split => {
            const splitUserId = split.user.toString();
            const amount = parseFloat(split.amount || 0);
            
            logLines.push(`  Split: ${splitUserId} = ${amount}`);
            
            if (payerId !== splitUserId) {
                netBalances[payerId] = (netBalances[payerId] || 0) + amount;
                netBalances[splitUserId] = (netBalances[splitUserId] || 0) - amount;
            }
        });
    });
    
    fs.writeFileSync('clean-debug.json', JSON.stringify({ logLines, netBalances }, null, 2));
    process.exit(0);
});
