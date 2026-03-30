import mysql from 'mysql2'
import dotenv from 'dotenv'

// create connection pool to access db
export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true
}).promise();

// repeatedly attempts to connect to mySQL server until connection is established
export async function waitForDatabase(retries = 10, delay = 3000) {
    while (retries) {
        try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        console.log("Database connection established");
        return;
        } catch (err) {
        console.log("Database not ready, retrying...");
        retries--;
        await new Promise(res => setTimeout(res, delay));
        }
    }

    throw new Error("Unable to connect to database after retries");
}