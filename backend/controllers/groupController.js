const Group = require('../models/Group');
const User = require('../models/User'); // Required for population

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  const { name, description, category } = req.body;

  try {
    const group = await Group.create({
      name,
      description,
      category,
      admin: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json(group);
  } catch (error) {
    console.error('Create Group Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all groups for a user
// @route   GET /api/groups
// @access  Private
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate('members', 'name email');
    res.json(groups);
  } catch (error) {
    console.error('Get Groups Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Join a group using invite code
// @route   POST /api/groups/join
// @access  Private
exports.joinGroup = async (req, res) => {
  const { inviteCode } = req.body;

  try {
    const group = await Group.findOne({ inviteCode });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    group.members.push(req.user._id);
    await group.save();

    res.json(group);
  } catch (error) {
    console.error('Join Group Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
