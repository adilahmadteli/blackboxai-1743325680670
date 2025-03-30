require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization
const initializeDatabase = async () => {
    try {
        await db.runAsync(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user',
            status TEXT CHECK(status IN ('active', 'blocked')) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // ... (other table creation queries from your original server.js)

        // Create default admin
        const admin = await db.getAsync("SELECT * FROM users WHERE email = ?", [process.env.ADMIN_EMAIL]);
        if (!admin) {
            const bcrypt = require('bcryptjs');
                        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
            if (!process.env.ADMIN_PASSWORD) {
                throw new Error('ADMIN_PASSWORD is not set in .env file');
            }
            const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, saltRounds);

            await db.runAsync("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)", 
                [process.env.ADMIN_EMAIL, hash, 'admin']);
            console.log('Default admin user created');
        }
    } catch (error) {
        console.error('Database initialization error:', error);
    }
};

initializeDatabase();

// Routes
app.use('/api/auth', require('./routes/auth'));
// ... (other route mounts)

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.get(['/', '/user/*', '/admin/*'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/shared/base.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});