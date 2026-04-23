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

// route to get statistics data for the current user
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user?.pid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        s.instr_first_name,
        s.instr_last_name,
        s.year,
        s.rating
      FROM statistics AS s
      JOIN (
        SELECT r.report_id
        FROM report_upload AS r
        JOIN (
          SELECT filename, MAX(report_id) AS max_id
          FROM report_upload
          WHERE user_pid = ?
            AND processing_status = 'Processed'
          GROUP BY filename
        ) AS sub
        ON r.filename = sub.filename
        AND r.report_id = sub.max_id
        WHERE r.user_pid = ?
      ) AS r
      ON s.report_id = r.report_id
      `,
      [user.pid, user.pid]
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

export default router