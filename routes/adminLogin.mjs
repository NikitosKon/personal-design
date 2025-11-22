import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';

const router = express.Router();
const db = new sqlite3.Database('database.sqlite');

const SECRET = 'some_super_secret_key'; // можно вынести в .env

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM admin WHERE username = ?', [username], async (err, row) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!row) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, row.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        // Генерация токена
        const token = jwt.sign({ id: row.id, username: row.username }, SECRET, { expiresIn: '2h' });
        res.json({ success: true, token });
    });
});

export default router;
