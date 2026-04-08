import express, { Request, Response } from 'express'
import { pool } from '../db/connection'
import { RowDataPacket } from "mysql2"

const router = express.Router()

// route to get the data needed to display the current users generated reports
router.get('/reports/user', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user?.pid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        report_id,
        user_pid,
        upload_time,
        processing_status,
        filename
      FROM report_upload
      WHERE user_pid = ?
      AND processing_status = 'Processed'
      ORDER BY upload_time DESC
      `,
      [user.pid]
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

export default router