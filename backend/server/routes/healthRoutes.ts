import express, { Request, Response } from 'express'
import { pool } from "../db/connection"
import { ResultSetHeader } from 'mysql2';

const router = express.Router()


// simple hello route
router.get('/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from Express backend!' });
});

// simple db connection route
router.get('/health/db', async (req: Request, res: Response) =>{
  try {
    const [rows] = await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// route to ensure that the user is in the users table
router.post('/users/ensure-me', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user?.pid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await pool.query<ResultSetHeader>(
      `
      INSERT INTO users (pid, name, email)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email)
      `,
      [user.pid, user.name ?? null, user.email ?? null]
    );

    return res.status(200).json({
      message: 'User ensured successfully',
      user: {
        pid: user.pid,
        name: user.name ?? null,
        email: user.email ?? null,
      },
    });
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    return res.status(500).json({ message: 'Failed to ensure user exists' });
  }
});



export default router