import pkg from 'pg';
import dotenv from 'dotenv';
import dns from 'node:dns';
dotenv.config();

// Prefer IPv4 to avoid ENOTFOUND on environments without IPv6
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Add connection timeout and retry logic
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

export default pool;


/*import mysql2 from 'mysql2'
import dotenv from 'dotenv'
dotenv.config()



const pool = mysql2.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password : process.env.PASSWORD,
    database: process.env.DATABASE
}).promise()


export default pool*/