// Manual verification of the split logic
const calculateSplit = (amount, participants) => {
    // Mimic the logic in expenseController.js
    const uniqueParticipantsMap = new Map();
    participants.forEach(p => {
        const id = (p.user?._id || p.user).toString();
        if (!uniqueParticipantsMap.has(id)) {
            uniqueParticipantsMap.set(id, p);
        }
    });
    const uniqueParticipants = Array.from(uniqueParticipantsMap.values());
    const memberCount = uniqueParticipants.length;
    const splitAmount = Math.round((amount / memberCount) * 100) / 100;
    let remainder = Math.round((amount - splitAmount * memberCount) * 100) / 100;

    const splits = uniqueParticipants.map((member, index) => {
        let userSplit = splitAmount;
        if (index === 0 && remainder !== 0) {
            userSplit = Math.round((splitAmount + remainder) * 100) / 100;
        }
        return {
            user: (member.user?._id || member.user),
            amount: userSplit,
        };
    });
    return splits;
};

// Test Case: 3 Unique Users, 5 Member Entries (Duplicates)
const testParticipants = [
    { user: 'user1' },
    { user: 'user2' },
    { user: 'user3' },
    { user: 'user1' }, // Duplicate
    { user: 'user2' }, // Duplicate
];

const amount = 400;
const results = calculateSplit(amount, testParticipants);

console.log('--- TEST RESULTS ---');
console.log('Total Amount:', amount);
console.log('Original Participant Count:', testParticipants.length);
console.log('Unique Participant Count:', results.length);
console.log('Splits:', JSON.stringify(results, null, 2));

const totalSplit = results.reduce((sum, s) => sum + s.amount, 0);
console.log('Sum of Splits:', totalSplit);

if (results.length === 3 && totalSplit === amount) {
    console.log('SUCCESS: Logic working correctly (Split by 3 instead of 5)');
} else {
    console.error('FAILURE: Logic incorrect');
}
