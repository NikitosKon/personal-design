// db-config.js
import dotenv from 'dotenv';
dotenv.config();

export const DB_TYPE = process.env.DB_TYPE || 'mysql'; // 'mysql' или 'sqlite'

console.log(`📊 Using database: ${DB_TYPE}`);