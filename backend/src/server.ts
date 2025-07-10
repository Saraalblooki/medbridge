import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

import authRouter from './routes/auth';
import appointmentsRouter from './routes/appointments';
import recordsRouter from './routes/records';
import profileRouter from './routes/profile';
import subscriptionRouter from './routes/subscription';
import { stripeWebhookHandler } from './routes/stripeWebhook';
import { moderateText } from './utils/moderation';

// Initialize Prisma
const prisma = new PrismaClient();

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
  },
});

// Basic middleware
app.use(cors());

// Stripe webhook must use raw body
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

// JSON parser for rest routes
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/subscription', subscriptionRouter);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Client should emit joinRoom with doctorId & patientId to subscribe
  socket.on('joinRoom', ({ doctorId, patientId }) => {
    if (!doctorId || !patientId) return;
    const room = `room_${doctorId}_${patientId}`;
    socket.join(room);
  });

  // Handle chat messages
  socket.on('chatMessage', async ({ doctorId, patientId, senderRole, content }) => {
    if (!doctorId || !patientId || !content) return;

    const room = `room_${doctorId}_${patientId}`;

    // AI moderation (OpenAI + banned words)
    const { flagged } = await moderateText(content);

    // Store message in DB
    try {
      await prisma.message.create({
        data: {
          doctorId,
          patientId,
          content,
          flagged,
        },
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }

    // Emit to room
    io.to(room).emit('newMessage', {
      doctorId,
      patientId,
      content: flagged ? '[Message Flagged]' : content,
      flagged,
      senderRole,
      createdAt: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});