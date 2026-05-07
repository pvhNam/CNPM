/* ===================================
   Authentication Routes
   =================================== */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// POST /api/register
router.post('/register', async (req, res) => {
    try {
        const { username, password, displayName } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' });
        }

        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ error: 'Tên đăng nhập phải từ 3-50 ký tự' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Mật khẩu phải ít nhất 4 ký tự' });
        }

        // Check if username exists
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const name = displayName || username;
        const [result] = await db.query(
            'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)',
            [username, passwordHash, name]
        );

        // Auto-login after register
        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.displayName = name;

        res.json({
            success: true,
            user: {
                id: result.insertId,
                username,
                displayName: name,
                wins: 0,
                losses: 0,
                draws: 0,
                totalScore: 0
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
        }

        // Find user
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        const user = rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        // Save session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.displayName = user.display_name;

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                wins: user.wins,
                losses: user.losses,
                draws: user.draws,
                totalScore: user.total_score
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/profile
router.get('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        }

        const user = rows[0];
        res.json({
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                wins: user.wins,
                losses: user.losses,
                draws: user.draws,
                totalScore: user.total_score
            }
        });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// POST /api/logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi đăng xuất' });
        }
        res.json({ success: true });
    });
});

// GET /api/leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, display_name, wins, losses, draws, total_score
             FROM users
             ORDER BY wins DESC, total_score DESC
             LIMIT 20`
        );
        res.json({ leaderboard: rows });
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/history
router.get('/history', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    try {
        const [rows] = await db.query(
            `SELECT gh.*, 
                    u1.display_name as player1_name,
                    u2.display_name as player2_name,
                    uw.display_name as winner_name
             FROM game_history gh
             JOIN users u1 ON gh.player1_id = u1.id
             JOIN users u2 ON gh.player2_id = u2.id
             LEFT JOIN users uw ON gh.winner_id = uw.id
             WHERE gh.player1_id = ? OR gh.player2_id = ?
             ORDER BY gh.played_at DESC
             LIMIT 20`,
            [req.session.userId, req.session.userId]
        );
        res.json({ history: rows });
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;
