import express from 'express';
import { getPool } from '../database.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /api/messages - public (contact form)
router.post('/', async (req, res) => {
  const { name, email, project, message } = req.body;
  try {
    const db = await getPool();
    const [result] = await db.query(
      `INSERT INTO messages (name, email, project_type, message) VALUES (?, ?, ?, ?)`,
      [name || null, email || null, project || null, message || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// GET /api/messages - protected
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getPool();
    const [rows] = await db.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// PUT /api/messages/:id - update status
router.put('/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  
  if (!['new','read','replied'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    const db = await getPool();
    await db.query('UPDATE messages SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/messages/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    const db = await getPool();
    await db.query('DELETE FROM messages WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;