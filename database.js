import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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