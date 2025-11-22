import express from 'express';
import { getPool } from '../database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const db = await getPool();
    const [rows] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    
    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ 
      sub: admin.id, 
      username: admin.username 
    }, JWT_SECRET, { expiresIn: '8h' });

    res.json({ 
      success: true, 
      token,
      user: { id: admin.id, username: admin.username }
    });
    
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
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