import dotenv from "dotenv";
import mysql from "mysql2/promise";

const dotenvResult = dotenv.config({ quiet: true });
const dotenvParsed = dotenvResult.parsed ?? {};

const dbHost = process.env.DB_HOST ?? dotenvParsed.DB_HOST ?? dotenvParsed.HOST ?? process.env.HOST;
const dbUser = process.env.DB_USER ?? dotenvParsed.DB_USER ?? dotenvParsed.USER ?? process.env.USER;
const dbPassword =
  process.env.DB_PASSWORD ??
  dotenvParsed.DB_PASSWORD ??
  dotenvParsed.PASSWORD ??
  process.env.PASSWORD;
const dbName =
  process.env.DB_NAME ?? dotenvParsed.DB_NAME ?? dotenvParsed.DATABASE ?? process.env.DATABASE;
const dbPort = Number(process.env.DB_PORT ?? 3306);

if (!dbHost || !dbUser || !dbName) {
  throw new Error(
    "Database env is missing. Set DB_HOST/DB_USER/DB_PASSWORD/DB_NAME (or HOST/USER/PASSWORD/DATABASE) in .env."
  );
}

export const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
