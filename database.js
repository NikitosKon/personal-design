// database.js - ОБНОВЛЕННАЯ ВЕРСИЯ ДЛЯ RAILWAY MYSQL
import mysql from 'mysql2/promise';
<<<<<<< HEAD
import bcrypt from 'bcryptjs';
=======
>>>>>>> c2abf8ab28e883e4743a7683e8ef87fdb3bdb09c
import dotenv from 'dotenv';

dotenv.config();

let pool;

export async function initDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root', 
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'personal_design',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      reconnect: true
    });

<<<<<<< HEAD
  console.log('🔧 Initializing MySQL database connection for Railway...');

  const config = {
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'personal_design',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    reconnect: true,
    acquireTimeout: 60000,
    timeout: 60000,
    connectTimeout: 60000
  };

  // Проверяем наличие DATABASE_URL от Railway (основной способ)
  if (process.env.DATABASE_URL) {
    try {
      console.log('🔗 Using DATABASE_URL from Railway');
      const url = new URL(process.env.DATABASE_URL);
      config.host = url.hostname;
      config.port = url.port;
      config.user = url.username;
      config.password = url.password;
      config.database = url.pathname.replace(/^\//, '');
      
      console.log(`📡 MySQL Config: ${config.host}:${config.port}, DB: ${config.database}`);
    } catch (e) {
      console.log('⚠️ Error parsing DATABASE_URL, using individual config');
    }
  } else {
    console.log('ℹ️ Using individual MySQL environment variables');
    console.log(`📡 Host: ${config.host}, DB: ${config.database}`);
  }

  try {
    pool = mysql.createPool(config);
    
    // Тестируем соединение
    const testConnection = await pool.getConnection();
    console.log('✅ MySQL connection successful');
    testConnection.release();
    
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    console.error('💡 Please check your Railway MySQL configuration');
    throw error;
  }

  return pool;
=======
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    connection.release();

    // Initialize tables if they don't exist
    await initTables();
    
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    // Don't exit process, just log error
  }
>>>>>>> c2abf8ab28e883e4743a7683e8ef87fdb3bdb09c
}

async function initTables() {
  try {
    // Create content table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL UNIQUE,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

<<<<<<< HEAD
  try {
    console.log('🔄 Initializing database tables...');

    // Создаём таблицы с улучшенной обработкой ошибок
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ admins table ready');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200),
        email VARCHAR(200),
        project_type VARCHAR(200),
        message TEXT,
        status ENUM('new','read','replied') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ messages table ready');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL UNIQUE,
        content TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ content table ready');

    // Добавляем тестового админа если нет
    const [rows] = await db.execute(`SELECT COUNT(*) AS cnt FROM admins`);
    const count = rows[0].cnt;
    
    if (count === 0) {
      const hash = await bcrypt.hash('thklty13$', 10);
      await db.execute(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`, ['tykhon', hash]);
      console.log('✅ Test admin created: tykhon / thklty13$');
    } else {
      console.log('✅ Admin user exists');
    }

    // Добавляем дефолтный контент
    const defaultContent = [
      ['hero_title', 'We craft premium logos, posters, social content, promo videos & 3D visuals.'],
      ['hero_subtitle', 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.'],
      ['services', '[]'],
      ['portfolio', '[]'],
      ['contact_info', '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}']
    ];

    let insertedCount = 0;
    for (const [key, value] of defaultContent) {
      try {
        await db.execute(
          'INSERT IGNORE INTO content (title, content) VALUES (?, ?)',
          [key, value]
        );
        insertedCount++;
        console.log(`✅ Added default content: ${key}`);
      } catch (error) {
        console.log(`ℹ️ Content "${key}" already exists`);
      }
    }

    console.log(`✅ Default content initialized (${insertedCount} items)`);
    console.log('🎉 Database initialization completed successfully');

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.error('💡 Please check your database configuration on Railway');
    throw error;
  }
}

// Функция для проверки состояния базы данных
export async function checkDatabaseHealth() {
  try {
    const db = await getPool();
    const [result] = await db.execute('SELECT 1 as health_check');
    return { healthy: true, message: 'Database connection OK' };
  } catch (error) {
    return { healthy: false, message: error.message };
  }
}

// Убедитесь, что экспортируем функцию для использования в index.js
export default { getPool, initDatabase, checkDatabaseHealth };
=======
    // Create messages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        project_type VARCHAR(255),
        message TEXT,
        status ENUM('new', 'read', 'replied') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create admins table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create default admin if doesn't exist
    const [adminRows] = await pool.execute('SELECT * FROM admins WHERE username = ?', ['admin']);
    if (adminRows.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.execute(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        ['admin', hashedPassword]
      );
      console.log('✅ Default admin created: admin / admin123');
    }

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Table initialization failed:', error.message);
  }
}

export async function getPool() {
  if (!pool) {
    await initDatabase();
  }
  return pool;
}
>>>>>>> c2abf8ab28e883e4743a7683e8ef87fdb3bdb09c
