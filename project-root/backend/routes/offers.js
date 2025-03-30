const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Create new offer
router.post('/', auth, async (req, res) => {
    try {
        const { type, currency, price, amount } = req.body;

        // Validate input
        if (!type || !currency || !price || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (price <= 0 || amount <= 0) {
            return res.status(400).json({ error: 'Price and amount must be positive' });
        }

        // For sell offers, check wallet balance
        if (type === 'sell') {
            const wallet = await db.getAsync(
                'SELECT balance FROM wallets WHERE user_id = ? AND currency = ?',
                [req.user.id, currency]
            );

            if (!wallet || wallet.balance < amount) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
        }

        // Create offer
        const result = await db.runAsync(
            'INSERT INTO offers (user_id, type, currency, price, amount) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, type, currency, price, amount]
        );

        res.status(201).json({ 
            message: 'Offer created successfully',
            offerId: result.lastID
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all active offers
router.get('/', async (req, res) => {
    try {
        const { currency, type } = req.query;
        let query = `SELECT o.*, u.email as user_email 
                     FROM offers o
                     JOIN users u ON o.user_id = u.id
                     WHERE o.status = 'active'`;
        const params = [];

        if (currency) {
            query += ' AND o.currency = ?';
            params.push(currency);
        }

        if (type) {
            query += ' AND o.type = ?';
            params.push(type);
        }

        query += ' ORDER BY o.created_at DESC';

        const offers = await db.allAsync(query, params);
        res.json(offers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;