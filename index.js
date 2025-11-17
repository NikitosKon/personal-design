import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, './public'))); // Твой основной сайт
app.use('/admin', express.static(join(__dirname, './admin'))); // Админ-панель

// Инициализация базы данных
const db = new sqlite3.Database('./database.db');

// Создание таблиц
// Создание таблиц
db.serialize(() => {
  console.log('🔄 Создаем таблицу messages...');
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    project_type TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, function(err) {
    if (err) {
      console.error('❌ Ошибка создания messages:', err.message);
    } else {
      console.log('✅ Таблица messages создана');
    }
  });

  console.log('🔄 Создаем таблицу admins...');
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`, function(err) {
    if (err) {
      console.error('❌ Ошибка создания admins:', err.message);
    } else {
      console.log('✅ Таблица admins создана');
    }
  });

  // Остальной код создания администраторов...
  const adminPassword = process.env.ADMIN_PASSWORD;
  const admin2Password = process.env.ADMIN2_PASSWORD;
  // ... и т.д.

  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD не установлен');
    process.exit(1);
  }

  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  const hashedPassword2 = bcrypt.hashSync(admin2Password || 'admin456', 10);

  // Первый администратор
  db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, 
    ['admin', hashedPassword], function(err) {
      if (err) {
        console.error('❌ Ошибка создания админа:', err);
      } else {
        console.log('✅ Админ admin настроен');
      }
    });

  // Второй администратор  
  db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, 
    ['admin2', hashedPassword2], function(err) {
      if (err) {
        console.error('❌ Ошибка создания второго админа:', err);
      } else {
        console.log('✅ Админ admin2 настроен');
      }
    });
}); // ← ЗАКРЫВАЕМ db.serialize ЗДЕСЬ


// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => { // ✅ УБРАЛ запасной секрет
    if (err) {
      return res.status(403).json({ error: 'Неверный токен' });
    }
    req.user = user;
    next();
  });
}; // ✅ ЗАКРЫВАЕМ authenticateToken
// API Routes

// Отправка сообщения из формы
app.post('/api/contact', (req, res) => {
  const { name, email, project, message } = req.body;

  if (!name || !email || !project) {
    return res.status(400).json({ error: 'Заполните обязательные поля' });
  }

  db.run(
    `INSERT INTO messages (name, email, project_type, message) VALUES (?, ?, ?, ?)`,
    [name, email, project, message],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при сохранении сообщения' });
      }
      res.json({ 
        success: true, 
        message: 'Сообщение успешно отправлено!',
        id: this.lastID 
      });
    }
  );
});

// Получение всех сообщений (только для админа)
app.get('/api/messages', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM messages ORDER BY created_at DESC`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при получении сообщений' });
    }
    res.json(rows);
  });
});

// Обновление статуса сообщения
app.put('/api/messages/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run(
    `UPDATE messages SET status = ? WHERE id = ?`,
    [status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при обновлении сообщения' });
      }
      res.json({ success: true, message: 'Статус обновлен' });
    }
  );
});

// Удаление сообщения
app.delete('/api/messages/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM messages WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при удалении сообщения' });
    }
    res.json({ success: true, message: 'Сообщение удалено' });
  });
});

// Аутентификация администратора
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM admins WHERE username = ?`, [username], (err, admin) => {
    if (err || !admin) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    if (bcrypt.compareSync(password, admin.password)) {
      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        process.env.JWT_SECRET, // ✅ УБРАЛ '|| 'your-secret-key''
        { expiresIn: '24h' }
      );
      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: 'Неверные учетные данные' });
    }
  });
});

// Проверка аутентификации
app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Debug routes - удали их после настройки!
app.get('/api/debug', (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ tables: tables.map(t => t.name) });
  });
});

app.get('/api/debug/messages', (req, res) => {
  db.all("SELECT * FROM messages", (err, messages) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(messages);
  });
});

// Таблица для контента сайта
db.run(`CREATE TABLE IF NOT EXISTS site_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT,
  image_url TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Добавляем начальные данные
const initialContent = [
  { section: 'hero_title', title: 'Hero Title', content: 'We craft premium logos, posters, social content, promo videos & 3D visuals.' },
  { section: 'hero_subtitle', title: 'Hero Subtitle', content: 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.' },
  { section: 'services', title: 'Services Section', content: JSON.stringify([
  { id: 1, title: 'Logo & Branding', description: 'Logo, typography, color and asset systems.', icon: 'fas fa-pen-nib' },
  { id: 2, title: 'Graphic Design', description: 'Posters, banners, social content and ad creatives.', icon: 'fas fa-image' },
  { id: 3, title: 'Video Editing', description: 'Short-form ads, promos and product videos for socials.', icon: 'fas fa-film' },
  { id: 4, title: '3D Visualization', description: 'Product renders, mockups and animated presentations.', icon: 'fas fa-cube' }
])},
  { section: 'portfolio', title: 'Portfolio Section', content: JSON.stringify([
    { id: 1, title: 'Logo for CoffeeHub', description: 'Modern mark — applied across packaging and web.' },
    { id: 2, title: 'Restaurant Menu', description: 'Clean layout focused on appetite and conversion.' },
    { id: 3, title: 'Instagram Campaign', description: 'Coherent visual system for multi-platform ads and posts.' }
  ])},
  { section: 'contact_info', title: 'Contact Information', content: JSON.stringify({
    email: 'hello@personaldesign.com',
    phone: '+353 1 234 5678',
    address: 'Dublin, Ireland',
    social: ['instagram', 'facebook', 'linkedin', 'behance']
  })}
];

initialContent.forEach(item => {
  db.run(`INSERT OR IGNORE INTO site_content (section, title, content) VALUES (?, ?, ?)`,
    [item.section, item.title, item.content]);
});

// ==================== API ДЛЯ УПРАВЛЕНИЯ КОНТЕНТОМ ====================

// Получение контента сайта
app.get('/api/content', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM site_content`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при получении контента' });
    }
    res.json(rows);
  });
});

// Маршрут для просмотра логов (только для админа)
app.get('/api/admin/logs', authenticateToken, (req, res) => {
  // Логи из базы данных
  db.all(`SELECT * FROM messages ORDER BY created_at DESC LIMIT 100`, (err, messages) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения логов' });
    }
    
    // Системные логи (можно добавить логирование действий)
    const systemLogs = [
      { type: 'info', message: `Сервер запущен на порту ${PORT}`, timestamp: new Date() },
      { type: 'info', message: `Всего сообщений в базе: ${messages.length}`, timestamp: new Date() }
    ];
    
    res.json({
      system: systemLogs,
      messages: messages,
      serverInfo: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date()
      }
    });
  });
});

// Обновление контента сайта
app.put('/api/content/:section', authenticateToken, (req, res) => {
  const { section } = req.params;
  const { title, content } = req.body;

  db.run(
    `UPDATE site_content SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE section = ?`,
    [title, content, section],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при обновлении контента' });
      }
      res.json({ success: true, message: 'Контент обновлен' });
    }
  );
});

// Публичное API для получения контента сайта
app.get('/api/public/content', (req, res) => {
  db.all(`SELECT section, content FROM site_content`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при получении контента' });
    }
    
    const content = {};
    rows.forEach(row => {
      // Пытаемся распарсить JSON, если не получается - оставляем как строку
      try {
        content[row.section] = JSON.parse(row.content);
      } catch {
        content[row.section] = row.content;
      }
    });
    
    res.json(content);
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Основной сайт: http://localhost:${PORT}`);
  console.log(`Админ-панель: http://localhost:${PORT}/admin`);
});
