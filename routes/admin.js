import express from 'express';
import { db } from '../database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'secret';
const TOKEN_EXPIRES = '8h';

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const [rows] = await db.execute('SELECT * FROM admin WHERE username = ?', [username]);
    if (!rows || rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/verify
router.get('/verify', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ ok: true, user: { id: payload.sub, username: payload.username } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
