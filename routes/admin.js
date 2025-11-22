import express from 'express';
import { getPool } from '../database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Получаем подключение к базе
    const db = await getPool();
    
    // ИСПРАВЛЕНО: используем query вместо execute
    const [rows] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    
    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    
    // Проверяем пароль
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Создаем токен
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

export default router;

// Временный эндпоинт для отладки - УДАЛИ ПОТОМ!
router.get('/debug', async (req, res) => {
  try {
    const db = await getPool();
    
    // Проверяем таблицу admins
    const [admins] = await db.query('SELECT * FROM admins');
    
    // Проверяем структуру таблицы
    const [structure] = await db.query('DESCRIBE admins');
    
    res.json({
      admins: admins,
      table_structure: structure,
      message: admins.length > 0 ? 'Users found' : 'No users in admins table'
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});