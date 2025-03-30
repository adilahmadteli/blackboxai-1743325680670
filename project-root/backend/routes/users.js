const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

// User registration
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user exists
        const existingUser = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);
        const hash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await db.runAsync(
            'INSERT INTO users (email, password_hash) VALUES (?, ?)',
            [email, hash]
        );

        // Create default wallets
        await db.runAsync(
            'INSERT INTO wallets (user_id, currency) VALUES (?, ?), (?, ?)',
            [result.lastID, 'PI', result.lastID, 'USDT']
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await db.getAsync(
            'SELECT id, email, role, status, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;