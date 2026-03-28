const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'PayMatrix Backend is running' });
});

// Database Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/paymatrix';

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
