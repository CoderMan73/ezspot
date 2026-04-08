import express, { Request, Response } from 'express'
import multer from 'multer'
import { startParserJob } from "../services/parserService"
import { insertReportUpload } from '../services/reportService'
import { pool } from '../db/connection'
import { RowDataPacket } from "mysql2"

const router = express.Router()
const upload = multer({ dest: 'uploads/' })


// route to handle an uploaded report by starting the python process that inserts into db
router.post('/upload', upload.single('pdf'), async (req: Request, res: Response) => {
    // handle no file being sent
    if (!req.file) {
        return res.status(400).json({ message: "No File Uploaded." }) 
    }

    try {
        const user = (req as any).user;

        if (!user?.pid) {
            return res.status(401).json({ message: "Unauthorized" });
}
        // HARDCODED PATH, MAY NEED TO CHANGE IN CLUSTERS DEPENDING ON STRUCTURE OF CONTAINERS
        // IF WE CAN KEEP IT HARDCODED LIKE THIS, WE WOULD PROB NEED TO MOVE IT TO ENV ANYWAY
        const parserPath = "/app/python/parser/extract_text.py"
        const pdfPath = req.file.path
        const userPid = user.pid;

        // start the report upload
        const reportId = await insertReportUpload(userPid, req.file.originalname, "Processing")

        startParserJob({
            parserPath,
            pdfPath,
            userPid,
            originalName: req.file.originalname,
            reportId
        })

        return res.status(201).json({
            message: "File received.",
            report_id: reportId,
            status: "Processing"
        })
    } catch (err) {
        return res.status(500).json({
            message: "Error starting upload job.",
            error: String(err)
        })
    }
})


// route that handles polling from frontend to check status of an uploaded report
router.get('/report-status/:report_id', async (req: Request, res: Response) => {
    try {
        // make sure user is right
        const user = (req as any).user;

        if (!user?.pid) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        // get the report and make sure it is valid
        const report_id = Number(req.params.report_id)
        if (Number.isNaN(report_id)) {
            return res.status(400).json({ message: "Invalid report id." })
        }

        // query database and handle no response
        const query = `
            SELECT processing_status
            FROM report_upload
            WHERE report_id = ?
            AND user_pid = ?
        `;
        const [rows] = await pool.execute<RowDataPacket[]>(query, [report_id, user.pid]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Report not found." })
        }

        // return result
        return res.json({
            report_id,
            status: rows[0].processing_status
        })
    } catch (err) {
        return res.status(500).json({
            message: "Error fetching report status.",
            error: String(err)
        })
    }
})

export default router
