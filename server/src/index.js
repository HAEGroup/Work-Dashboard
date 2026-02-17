require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contacts');
const activityRoutes = require('./routes/activities');
const emailRoutes = require('./routes/emails');
const calendarRoutes = require('./routes/calendar');
const taskRoutes = require('./routes/tasks');
const chatRoutes = require('./routes/chat');
const marketingRoutes = require('./routes/marketing');
const weatherRoutes = require('./routes/weather');
const rentvineRoutes = require('./routes/rentvine');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const setupChat = require('./services/chatSocket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/rentvine', rentvineRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup WebSocket for chat
setupChat(io);

const PORT = process.env.SERVER_PORT || 5000;
server.listen(PORT, () => {
  console.log(`Red Rock Dashboard server running on port ${PORT}`);
});
