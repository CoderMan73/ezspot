import { spawn } from 'child_process'

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
    const pythonArgs = [args.parserPath, args.pdfPath, args.semester, args.year, args.userPid, args.originalName, String(args.reportId)]

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

    pythonProcess.on("close", (code) => {
        handleParserCompletion(code, stdoutData, stderrData, args.reportId)
    })
}

export function handleParserCompletion(code: number | null, stdoutData: string, stderrData: string, reportId: number) {
    // handle exit code
    if (code !== 0) {
        console.error(`[report ${reportId}] parser process failed (exit code ${code})`)
        if (stderrData.trim()) {
            console.error(stderrData.trim())
        }
        return
    }
    // try to parse result
    try {
        const parserResult = JSON.parse(stdoutData.trim())

        // handle unsuccessful return from py script
        if (!parserResult.success) {
            console.error(`[report ${reportId}] parser reported unsuccessful completion`)
            return
        }

        // handle successful run
        console.log(
            `[report ${reportId}] processed successfully: rows=${parserResult.rows_parsed}, stats=${parserResult.stats_built}`
        )
    // handle parsing error from py response
    } catch (err) {
        console.error(`[report ${reportId}] failed to parse parser stdout`)
        console.error(err)
    }
}
