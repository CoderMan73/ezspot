import { pool } from "../db/connection"

// returns the id of the created report
export async function insertReportUpload(userPid: string, filename: string, semester: string, year: number, processingStatus: string) {

    const query = `
        INSERT INTO report_upload
        (user_pid, filename, semester, year, processing_status, upload_time)
        VALUES (?, ?, ?, ?, ?, NOW())
    `

    const values = [
        userPid,
        filename,
        semester,
        year,
        processingStatus
    ]

    // type casting any, NEED TO FIX LATER
    const [result]: any = await pool.execute(query, values)

    return result.insertId
}


// insert the spot rows into the table ANY CAST AGAIN NEED TO FIX
export async function insertSpotRows(parsedRows: any, report_id: number) {
    // create query
    const query = `
        INSERT INTO spot_rows
        (report_id, first_name, last_name, instr_classification, instr_rank, crn, students_enrolled, instr_rating_mean)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    // loop over the values of the parsedRows object
    let currIndex = 0
    while (currIndex < parsedRows.length) {
        // get the row and values
        const row = parsedRows[currIndex]
        const values = [
            report_id,
            row.first_name,
            row.last_name,
            row.instr_classification,
            row.instr_rank,
            row.crn,
            row.students_enrolled,
            row.instr_rating_mean
        ]
        // commit row to db
        pool.execute(query, values)
    }

}