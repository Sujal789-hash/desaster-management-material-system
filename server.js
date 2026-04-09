const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/materials', require('./src/routes/materials'));
app.use('/api/transactions', require('./src/routes/transactions'));

// Fallback to serve frontend index.html for Single Page Apps or simple root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.emit('realtime:ready', { t: Date.now() });
});

app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
