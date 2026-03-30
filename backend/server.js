import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';


import connectDB from './config/db.js';
import connectCloudinary from './config/cloudinary.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import settlementRoutes from './routes/settlementRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Load environment variables


// Connect to database
connectDB();

// Configure Cloudinary
connectCloudinary();

const app = express();

// --- Middleware Stack ---

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- API Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1', expenseRoutes);
app.use('/api/v1/groups', settlementRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PayMatrix API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.all('*path', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │                                         │
  │   💸 PayMatrix API Server               │
  │                                         │
  │   Port:        ${PORT}                      │
  │   Environment: ${process.env.NODE_ENV || 'development'}          │
  │   API Base:    /api/v1                  │
  │                                         │
  └─────────────────────────────────────────┘
  `);
});

export default app;
