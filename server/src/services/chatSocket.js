const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const onlineUsers = new Map();

function broadcastOnlineUsers(io) {
  const users = Array.from(onlineUsers.keys());
  io.emit('online_users', users);
}

function setupChatSocket(io) {
  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.query.token ||
      (socket.handshake.headers.authorization &&
        socket.handshake.headers.authorization.split(' ')[1]);

    if (!token) {
      return next(new Error('Authentication error: token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId || decoded.id;
      socket.username = decoded.username || decoded.name;
      next();
    } catch (err) {
      return next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, username } = socket;
    console.log(`User connected: ${username} (${userId}) - socket ${socket.id}`);

    onlineUsers.set(userId, socket.id);
    broadcastOnlineUsers(io);

    socket.on('join_channel', (channelId) => {
      if (!channelId) return;
      socket.join(`channel:${channelId}`);
      console.log(`User ${username} joined channel ${channelId}`);
    });

    socket.on('leave_channel', (channelId) => {
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
      console.log(`User ${username} left channel ${channelId}`);
    });

    socket.on('send_message', async (data, callback) => {
      const { channelId, content } = data || {};

      if (!channelId || !content) {
        if (callback) callback({ error: 'channelId and content are required' });
        return;
      }

      try {
        const result = await pool.query(
          `INSERT INTO chat_messages (channel_id, user_id, username, content, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id, channel_id, user_id, username, content, created_at`,
          [channelId, userId, username, content]
        );

        const message = result.rows[0];

        io.to(`channel:${channelId}`).emit('new_message', message);

        if (callback) callback({ success: true, message });
      } catch (err) {
        console.error('Error saving message:', err.message);
        if (callback) callback({ error: 'Failed to save message' });
      }
    });

    socket.on('typing', (data) => {
      const { channelId } = data || {};

      if (!channelId) return;

      socket.to(`channel:${channelId}`).emit('typing', {
        userId,
        username,
        channelId,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${username} (${userId}) - reason: ${reason}`);
      onlineUsers.delete(userId);
      broadcastOnlineUsers(io);
    });
  });
}

module.exports = setupChatSocket;
