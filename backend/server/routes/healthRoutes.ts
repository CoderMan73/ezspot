import express, { Request, Response } from 'express'
import { pool } from "../db/connection"

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



export default router