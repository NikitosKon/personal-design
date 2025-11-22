import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import uploadRoutes from './routes/upload.js';
import contentRoutes from './routes/content.js';
import messagesRoutes from './routes/messages.js';
import { initDatabase, db } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage как fallback
let messages = [];
let content = {};
let admins = [{ id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10) }];
let useMySQL = false;
let pool;

// Default content
const defaultContent = {
  hero_title: 'We craft premium logos, posters, social content, promo videos & 3D visuals.',
  hero_subtitle: 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.',
  services: '[]',
  portfolio: '[]',
  contact_info: '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}'
};

// Пробуем подключиться к MySQL
async function initDatabase() {
  try {
    console.log('🔧 Testing MySQL connection...');
    
    const mysqlUrl = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;
    console.log('MySQL URL:', mysqlUrl ? 'Set' : 'Not set');
    
    if (mysqlUrl) {
      pool = mysql.createPool({
        uri: mysqlUrl,
        connectionLimit: 10,
        ssl: { rejectUnauthorized: false },
        acquireTimeout: 10000
      });
      
      // Тестируем подключение
      await pool.execute('SELECT 1');
      useMySQL = true;
      console.log('✅ MySQL connected successfully');
      
      // Создаем таблицы если используем MySQL
      await createMySQLTables();
    } else {
      console.log('❌ No MySQL URL found, using in-memory storage');
      Object.assign(content, defaultContent);
    }
  } catch (error) {
    console.log('❌ MySQL connection failed, using in-memory storage');
    console.log('Error:', error.message);
    Object.assign(content, defaultContent);
  }
}

async function createMySQLTables() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        project_type VARCHAR(255) NOT NULL,
        message TEXT,
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) UNIQUE NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Default content
    const defaultContent = [
      ['hero_title', 'We craft premium logos, posters, social content, promo videos & 3D visuals.'],
      ['hero_subtitle', 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.'],
      ['services', '[]'],
      ['portfolio', '[]'],
      ['contact_info', '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}']
    ];

    for (const [title, content] of defaultContent) {
      await pool.execute(
        'INSERT IGNORE INTO content (title, content) VALUES (?, ?)',
        [title, content]
      );
    }

    // Default admin
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.execute(
      'INSERT IGNORE INTO admin (username, password) VALUES (?, ?)',
      ['admin', hash]
    );

    console.log('✅ MySQL tables initialized');
  } catch (error) {
    console.error('Error creating MySQL tables:', error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));
app.use('/uploads', express.static('uploads'));

// Multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('🔐 Auth check:', { 
        hasAuthHeader: !!authHeader,
        tokenPresent: !!token,
        path: req.path 
    });
    
    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ Token verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        console.log('✅ Token verified for user:', user.username);
        req.user = user;
        next();
    });
};

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// CORS middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    let user;
    if (useMySQL) {
      const [rows] = await pool.execute('SELECT * FROM admin WHERE username = ?', [username]);
      user = rows[0];
    } else {
      user = admins.find(a => a.username === username);
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Messages
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    let result;
    if (useMySQL) {
      const [rows] = await pool.execute('SELECT * FROM messages ORDER BY created_at DESC');
      result = rows;
    } else {
      result = messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, project, message } = req.body;
    if (!name || !email || !project) return res.status(400).json({ error: 'Name, email and project required' });

    if (useMySQL) {
      const [result] = await pool.execute(
        'INSERT INTO messages (name, email, project_type, message) VALUES (?, ?, ?, ?)',
        [name, email, project, message || '']
      );
      res.json({ success: true, message: 'Message sent', id: result.insertId });
    } else {
      const newMessage = {
        id: Date.now(),
        name,
        email, 
        project_type: project,
        message: message || '',
        status: 'new',
        created_at: new Date().toISOString()
      };
      messages.push(newMessage);
      res.json({ success: true, message: 'Message sent', id: newMessage.id });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Content
app.get('/api/content/:section', authenticateToken, async (req, res) => {
    try {
        const section = req.params.section;
        console.log('📥 Fetching content for section:', section);
        
        let result;
        if (useMySQL) {
            const [rows] = await pool.execute('SELECT * FROM content WHERE title = ?', [section]);
            result = rows[0] || { content: '' };
        } else {
            result = { content: content[section] || '' };
        }
        
        console.log('📤 Sending content:', { section, content: result.content });
        res.json(result);
    } catch (error) {
        console.error('❌ Error fetching content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

app.put('/api/content/:section', authenticateToken, async (req, res) => {
    try {
        const section = req.params.section;
        const { content: newContent } = req.body;
        
        console.log('💾 Saving content for section:', section);
        console.log('Content data:', newContent);
        
        if (newContent === undefined || newContent === null) {
            return res.status(400).json({ error: 'Content required' });
        }

        if (useMySQL) {
            await pool.execute(
                'INSERT INTO content (title, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?, updated_at = CURRENT_TIMESTAMP',
                [section, newContent, newContent]
            );
        } else {
            content[section] = newContent;
        }

        console.log('✅ Content saved successfully');
        res.json({ success: true, message: 'Content updated' });
    } catch (error) {
        console.error('❌ Error updating content:', error);
        res.status(500).json({ error: 'Failed to update content' });
    }
});

app.get('/api/public/content/:section', async (req, res) => {
  try {
    let result;
    if (useMySQL) {
      const [rows] = await pool.execute('SELECT * FROM content WHERE title = ?', [req.params.section]);
      result = rows[0] || { content: '' };
    } else {
      result = { content: content[req.params.section] || '' };
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

app.get('/api/admin/content', authenticateToken, async (req, res) => {
  try {
    let result;
    if (useMySQL) {
      const [rows] = await pool.execute('SELECT * FROM content ORDER BY title');
      result = rows;
    } else {
      result = Object.entries(content).map(([title, content]) => ({ title, content }));
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Upload
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }

        console.log('📁 File uploaded:', req.file.filename);
        
        const fileUrl = `/uploads/${req.file.filename}`;
        
        res.json({ 
            success: true, 
            url: fileUrl, 
            filename: req.file.filename,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Upload failed' 
        });
    }
});

app.get('/api/public/content/:section', async (req, res) => {
    try {
        const section = req.params.section;
        console.log('🌐 Public request for section:', section);
        
        let result;
        if (useMySQL) {
            const [rows] = await pool.execute('SELECT * FROM content WHERE title = ?', [section]);
            result = rows[0] || { content: '' };
        } else {
            result = { content: content[section] || '' };
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching public content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

app.get('/api/admin/content', authenticateToken, async (req, res) => {
    try {
        let result;
        if (useMySQL) {
            const [rows] = await pool.execute('SELECT * FROM content ORDER BY title');
            result = rows;
        } else {
            result = Object.entries(content).map(([title, content]) => ({ title, content }));
        }
        res.json(result);
    } catch (error) {
        console.error('Error fetching admin content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/api/test', async (req, res) => {
  try {
    let messagesCount = 0;
    if (useMySQL) {
      const [rows] = await pool.execute('SELECT COUNT(*) as count FROM messages');
      messagesCount = rows[0].count;
    } else {
      messagesCount = messages.length;
    }
    
    res.json({ 
      message: 'Server working!', 
      timestamp: new Date().toISOString(),
      storage: useMySQL ? 'MySQL' : 'In-memory',
      messagesCount: messagesCount
    });
  } catch (error) {
    res.json({ message: 'Server working!', storage: 'In-memory' });
  }
});

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Main site: http://localhost:${PORT}`);
    console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
    console.log(`🗄️ Database: ${useMySQL ? 'MySQL' : 'In-memory'}`);
  });
});