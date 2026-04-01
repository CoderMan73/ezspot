import { pool } from "../db/connection"

// returns the id of the created report
export async function insertReportUpload(userPid: string, filename: string, processingStatus: string) {

    const query = `
        INSERT INTO report_upload
        (user_pid, filename, processing_status, upload_time)
        VALUES (?, ?, ?, NOW())
    `

    const values = [
        userPid,
        filename,
        processingStatus
    ]

    // type casting any, NEED TO FIX LATER
    const [result]: any = await pool.execute(query, values)

    return result.insertId
}