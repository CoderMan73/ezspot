import express, { Request, Response } from 'express'
import multer from 'multer'
import { startParserJob } from "../services/parserService"
import { insertReportUpload } from '../services/reportService'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

router.post('/upload', upload.single('pdf'), async (req: Request, res: Response) => {
    // handle no file being sent
        if (!req.file) {
        return res.status(400).json({ message: "No File Uploaded." })
    }

    try {
        const parserPath = "/app/python/parser/extract_text.py"
        const pdfPath = req.file.path
        const semester = req.body.semester
        const year = req.body.year
        const userPid = req.body.userPid

        // start the report upload
        const reportId = await insertReportUpload(userPid, req.file.originalname, semester, Number(year), "Processing")

        startParserJob({
            parserPath,
            pdfPath,
            semester,
            year,
            userPid,
            originalName: req.file.originalname,
            reportId
        })

        return res.json({
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

export default router
