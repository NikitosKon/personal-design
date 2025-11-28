import { getDatabase, initDatabase } from './database.js';

async function testConnection() {
  try {
    await initDatabase();
    const db = await getDatabase();
    
    // Test query
    const result = await db.query('SELECT 1 as test');
    console.log('✅ Database connection successful:', result);
    
    // Test content table
    const content = await db.query('SELECT * FROM content LIMIT 1');
    console.log('✅ Content table accessible:', content);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();