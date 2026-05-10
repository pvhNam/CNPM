/* ===================================
   Main Server - Express + Socket.IO
   =================================== */

// Load biến môi trường từ .env khi chạy local.
// Trên Render, env đã được inject sẵn nên dotenv không ảnh hưởng.
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const GameManager = require('./game-manager');

const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: true, credentials: true, methods: ['GET', 'POST'] }
});

const gameManager = new GameManager();

// Render (và các PaaS khác) đứng sau reverse proxy -> cần trust proxy
// để cookie `secure: true` hoạt động và req.protocol trả về 'https'.
app.set('trust proxy', 1);

// ===== Middleware =====
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!process.env.SESSION_SECRET) {
    console.error('❌ Thiếu biến môi trường: SESSION_SECRET');
    process.exit(1);
}

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,              // HTTPS bắt buộc trên Render
        httpOnly: true,
        sameSite: isProduction ? 'lax' : 'lax',
        maxAge: 24 * 60 * 60 * 1000        // 24 hours
    }
});

app.use(sessionMiddleware);

// Share session with Socket.IO
io.engine.use(sessionMiddleware);

// Serve static files from parent directory (where index.html is)
app.use(express.static(path.join(__dirname, '..')));

// ===== API Routes =====
app.use('/api', authRoutes);

// ===== Socket.IO =====
io.on('connection', (socket) => {
    console.log(`🔗 Socket connected: ${socket.id}`);

    // Find match
    socket.on('find_match', (userData) => {
        gameManager.findMatch(socket, userData);
    });

    // Cancel match
    socket.on('cancel_match', () => {
        gameManager.cancelMatch(socket);
    });

    // Player makes a move
    socket.on('make_move', (data) => {
        gameManager.handleMove(socket, data);
    });

    // Game over
    socket.on('game_over', (data) => {
        gameManager.handleGameOver(socket, data);
    });

    // Player leaves game
    socket.on('leave_game', () => {
        gameManager.handleLeaveGame(socket);
    });

    // Disconnect
    socket.on('disconnect', () => {
        gameManager.handleDisconnect(socket);
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║     🎮  Ô Ăn Quan Server Started     ║');
    console.log(`║     🌐  Port: ${PORT}                      ║`);
    console.log('║     📡  WebSocket ready               ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
});