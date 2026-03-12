import { spawn } from 'child_process'
import { Response } from 'express'


// define a type for the args
type ParserJobArgs = {
    parserPath: string
    pdfPath: string
    semester: string
    year: string
    userPid: string
    originalName: string
    reportId: number
}

// begins the parsing of the input file
export function startParserJob(args: ParserJobArgs) {
    // create the args given to the python process
    const pythonArgs = [
        args.parserPath,
        args.pdfPath,
        args.semester,
        args.year,
        args.userPid,
        args.originalName,
       // String(args.reportId)
    ]

    // call the python process
    const pythonProcess = spawn("python", pythonArgs)

    // read stdout and stderr for data
    let stdoutData = ""
    let stderrData = ""
    pythonProcess.stdout.on("data", (chunk) => {
        stdoutData += chunk.toString()
    })
    pythonProcess.stderr.on("data", (chunk) => {
        stderrData += chunk.toString()
    })
    // handle errors and close
    pythonProcess.on("error", (err) => {
        console.error("Error in Python script:", err)
    })

    pythonProcess.on("close", async (code) => {
        await handleParserCompletion(code, stdoutData, stderrData, args.reportId)
    })
}

export async function handleParserCompletion(code: number | null, stdoutData: string, stderrData: string, reportId: number) {
    // handle exit code
    if (code !== 0) {
        console.error("Error closing Python script.")
        console.error("exit code:", code)
        console.error("stderr:", stderrData)

        // NEED TO ADD HERE
        // update report_upload set processing_status = 'Failed'
        return
    }

    try {
        const parserResult = JSON.parse(stdoutData.trim())

        console.log("exit code:", code)
        console.log("stderr:", stderrData)
        console.log("report id:", reportId)
        //console.log("parser result:", parserResult)

        // NEED TO ADD HERE
        // insert spot_rows
        // insert statistics
        // update report_upload set processing_status = 'Processed'
    } catch (err) {
        console.error("Parser/DB error:", err)

        // NEED TO ADD
        // update report_upload set processing_status = 'Failed'
        // most likely remove the upload so we don't have failed rows
    }
}
