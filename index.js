import dotenv from 'dotenv';
import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ES модули не имеют __dirname, поэтому создаем его
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));
app.use('/uploads', express.static('uploads'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Инициализация базы данных
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    
    // Создаем таблицу сообщений
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      project_type TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Создаем таблицу контента
    db.run(`CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT UNIQUE NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating content table:', err);
      } else {
        console.log('Content table ready');
        
        // Начальные данные
        const initialContent = [
          { 
            title: 'hero_title', 
            content: 'We craft premium logos, posters, social content, promo videos & 3D visuals.' 
          },
          { 
            title: 'hero_subtitle', 
            content: 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.' 
          },
          { 
            title: 'services', 
            content: '[]'
          },
          { 
            title: 'portfolio', 
            content: '[]'
          },
          { 
            title: 'contact_info', 
            content: '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}' 
          }
        ];

        initialContent.forEach(item => {
          db.run(
            'INSERT OR IGNORE INTO content (title, content) VALUES (?, ?)',
            [item.title, item.content]
          );
        });
      }
    });

    // Создаем таблицу администраторов
    db.run(`CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating admin table:', err);
      } else {
        console.log('Admin table ready');
        
        // Создаем администратора по умолчанию
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        db.run(
          'INSERT OR IGNORE INTO admin (username, password) VALUES (?, ?)',
          ['admin', defaultPassword]
        );
      }
    });
  }
});

// Middleware для аутентификации
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// ==================== МАРШРУТЫ АУТЕНТИФИКАЦИИ ====================

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    db.get(
      'SELECT * FROM admin WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          success: true,
          token,
          user: { id: user.id, username: user.username }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ 
    success: true, 
    user: { id: req.user.id, username: req.user.username } 
  });
});

// ==================== МАРШРУТЫ СООБЩЕНИЙ ====================

app.get('/api/messages', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM messages ORDER BY created_at DESC',
    (err, rows) => {
      if (err) {
        console.error('Error fetching messages:', err);
        return res.status(500).json({ error: 'Failed to fetch messages' });
      }
      res.json(rows);
    }
  );
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, project, message } = req.body;

    if (!name || !email || !project) {
      return res.status(400).json({ 
        error: 'Name, email and project type are required' 
      });
    }

    db.run(
      'INSERT INTO messages (name, email, project_type, message) VALUES (?, ?, ?, ?)',
      [name, email, project, message || ''],
      function(err) {
        if (err) {
          console.error('Error saving message:', err);
          return res.status(500).json({ error: 'Failed to save message' });
        }

        console.log(`New message from ${name} (${email}): ${project}`);

        res.json({ 
          success: true, 
          message: 'Message sent successfully',
          id: this.lastID 
        });
      }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/messages/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
// Сохранение контента
app.put('/api/content/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const { content } = req.body;
        
        await dbRun(
            `INSERT OR REPLACE INTO content (title, content, updated_at) 
             VALUES (?, ?, CURRENT_TIMESTAMP)`,
            [title, content]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving content:', error);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// Получение контента (публичный доступ)
app.get('/api/public/content/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const content = await dbQuery(
            "SELECT * FROM content WHERE title = ?",
            [title]
        );
        
        res.json(content[0] || { content: '' });
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

// Получение контента (админка)
app.get('/api/content/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const content = await dbQuery(
            "SELECT * FROM content WHERE title = ?",
            [title]
        );
        
        res.json(content[0] || { content: '' });
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

// Загрузка файлов
app.post('/api/upload', async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const file = req.files.file;
        const filename = `${Date.now()}-${file.name}`;
        const uploadPath = path.join(__dirname, 'uploads', filename);
        
        // Сохраняем файл
        await file.mv(uploadPath);
        
        // Сохраняем информацию в базу
        await dbRun(
            `INSERT INTO uploads (filename, original_name, file_path, file_size, mime_type) 
             VALUES (?, ?, ?, ?, ?)`,
            [filename, file.name, `/uploads/${filename}`, file.size, file.mimetype]
        );
        
        res.json({ 
            success: true, 
            url: `/uploads/${filename}`,
            filename 
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

  db.run(
    'UPDATE messages SET status = ? WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        console.error('Error updating message:', err);
        return res.status(500).json({ error: 'Failed to update message' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Message not found' });
      }

      res.json({ success: true, message: 'Message updated' });
    }
  );
});

app.delete('/api/messages/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM messages WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        console.error('Error deleting message:', err);
        return res.status(500).json({ error: 'Failed to delete message' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Message not found' });
      }

      res.json({ success: true, message: 'Message deleted' });
    }
  );
});

// ==================== МАРШРУТЫ КОНТЕНТА ====================

app.get('/api/content/:section', authenticateToken, async (req, res) => {
  try {
    const { section } = req.params;
    
    db.get(
      'SELECT * FROM content WHERE title = ?',
      [section],
      (err, content) => {
        if (err) {
          console.error('Error fetching content:', err);
          return res.status(500).json({ error: 'Failed to fetch content' });
        }
        
        if (content) {
          res.json(content);
        } else {
          res.json({ content: '' });
        }
      }
    );
  } catch (error) {
    console.error('Error in content route:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

app.put('/api/content/:section', authenticateToken, async (req, res) => {
  try {
    const { section } = req.params;
    const { title, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    db.get(
      'SELECT * FROM content WHERE title = ?',
      [section],
      (err, existing) => {
        if (err) {
          console.error('Error checking existing content:', err);
          return res.status(500).json({ error: 'Failed to update content' });
        }

        if (existing) {
          db.run(
            'UPDATE content SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE title = ?',
            [content, section],
            function(err) {
              if (err) {
                console.error('Error updating content:', err);
                return res.status(500).json({ error: 'Failed to update content' });
              }
              res.json({ success: true });
            }
          );
        } else {
          db.run(
            'INSERT INTO content (title, content) VALUES (?, ?)',
            [section, content],
            function(err) {
              if (err) {
                console.error('Error creating content:', err);
                return res.status(500).json({ error: 'Failed to create content' });
              }
              res.json({ success: true });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

app.get('/api/public/content/:section', async (req, res) => {
  try {
    const { section } = req.params;
    
    db.get(
      'SELECT * FROM content WHERE title = ?',
      [section],
      (err, content) => {
        if (err) {
          console.error('Error fetching public content:', err);
          return res.status(500).json({ error: 'Failed to fetch content' });
        }
        
        if (content) {
          res.json(content);
        } else {
          res.json({ content: '' });
        }
      }
    );
  } catch (error) {
    console.error('Error in public content route:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

app.get('/api/admin/content', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM content ORDER BY title',
    (err, rows) => {
      if (err) {
        console.error('Error fetching all content:', err);
        return res.status(500).json({ error: 'Failed to fetch content' });
      }
      res.json(rows);
    }
  );
});

// ==================== МАРШРУТЫ ДЛЯ ЗАГРУЗКИ ФАЙЛОВ ====================

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'File upload failed' 
    });
  }
});

// ==================== ОСНОВНЫЕ МАРШРУТЫ ====================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Main site: http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});