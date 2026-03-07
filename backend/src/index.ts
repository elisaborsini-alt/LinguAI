import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './api/middleware/errorHandler';
import { rateLimiter } from './api/middleware/rateLimiter';

// Routes
import authRoutes from './api/routes/auth';
import userRoutes from './api/routes/user';
import conversationRoutes from './api/routes/conversation';
import memoryRoutes from './api/routes/memory';
import progressRoutes from './api/routes/progress';
import reportRoutes from './api/routes/reports';
import scenarioRoutes from './api/routes/scenarios';
import pronunciationRoutes from './api/routes/pronunciation';
import placementRoutes from './api/routes/placement';
import languageRoutes from './api/routes/languages';

// Socket handlers
import { setupVoiceSocket } from './services/voice/voiceSocketHandler';

const app = express();
const httpServer = createServer(app);

// Socket.IO for real-time voice communication
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*', // Configure properly in production
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: '*', // Configure properly in production
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/pronunciation', pronunciationRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/languages', languageRoutes);

// Static file serving for uploads (voice snapshots, recordings)
app.use('/uploads/voice-snapshots', express.static(path.join(process.cwd(), 'uploads', 'voice-snapshots')));

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Setup Socket.IO handlers for voice
setupVoiceSocket(io);

// Start server
const PORT = config.server.port;

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.server.nodeEnv}`);
  logger.info(`🔌 WebSocket ready for voice connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, io };
