import { useState, useEffect } from 'react'


function UploadPage() {

    // use file and setFile with a file or null w/ default value of null
    const [file, setFile] = useState<File | null>(null)
    // create storage state for given values
    const [semester, setSemester] = useState("")
    const [year, setYear] = useState("")
    const [userPid, setUserPid] = useState("")
    const [reportId, setReportId] = useState<number | null>(null)
    const [status, setStatus] = useState<string | null>(null)
    const [uploadMessage, setUploadMessage] = useState("")
    const [isUploading, setIsUploading] = useState(false)

    // create effect for changing status
    useEffect(() => {
        // handle no id or completed status
        if (!reportId || status !== 'Processing') {
            return
        }
        // create polling interval and structure
        const intervalId = setInterval(async () => {
            // attempt to poll
            try {
                // poll using poll route
                const response = await fetch(`http://localhost:5000/api/report-status/${reportId}`)
                const data = await response.json()
                // update status & message
                setStatus(data.status)
                if (data.status === "Processing") {
                    setUploadMessage("Processing report in background...")
                } else if (data.status === "Processed") {
                    setUploadMessage("Report processing complete.")
                } else if (data.status === "Failed") {
                    setUploadMessage("Report processing failed.")
                }
                // handle case where status is processed or failed
                if (data.status === "Processed" || data.status === "Failed") {
                    clearInterval(intervalId)
                }
            }
            catch (err) {
                console.error("Polling failed:", err)
                clearInterval(intervalId)
            }
        }, 3000)

        // cleanup interval
        return () => clearInterval(intervalId)
    }, [reportId, status])


    // handle submission behavior to get response from server and update state
    async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!file) {
        console.log("No File Selected.")
        return
    }

    // log for debug purposes
    console.log("Selected File: ", file)
    // create form data and append our file
    const formData = new FormData()
    formData.append("pdf", file)
    formData.append("semester", semester)
    formData.append("year", year)
    formData.append("userPid", userPid)
    // set initial state 
    setIsUploading(true)
    setUploadMessage("Uploading file...")
    setStatus(null)
    setReportId(null)

    // try to make backend request
    try {
        const response = await fetch("http://localhost:5000/api/upload", {
            method: "POST",
            body: formData
        })

        const data = await response.json()
        // update the state
        setReportId(data.report_id)
        setStatus(data.status)
        setUploadMessage("Upload accepted. Background processing started.")
        setIsUploading(false)
        // log for debugging
        console.log("Server response:", data)

    } catch (error) {
        // handle state on fail
        setUploadMessage("Upload failed.")
        setIsUploading(false)
        console.error("Upload failed:", error)
    }
    
    }


    return (
        <div>
            <h1>Upload PDF</h1>
            <form onSubmit={handleSubmit}>
                <label>Semester</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                    <option value="">Select semester</option>
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                </select>
                <label>Year</label>
                <input type="number" name="year" value={year} onChange={(e) => setYear(e.target.value)} />
                <label>User PID</label>
                <input type="text" name="username" value={userPid} onChange={(e) => setUserPid(e.target.value)} />

                <input type="file" accept=".pdf" onChange={(event) => {
                    let selectedFile = null
                    if (event.target.files) {
                        selectedFile = event.target.files[0]
                    }
                    setFile(selectedFile)
                }}
                />
                <button type="submit" disabled={isUploading || status === "Processing"}>
                    Upload
                </button>
            </form>
            {(uploadMessage || reportId || status) && (
                <div>
                    <h2>Upload Status</h2>
                    {uploadMessage && <p>{uploadMessage}</p>}
                    {reportId && <p>Report ID: {reportId}</p>}
                </div>
            )}
        </div>
    )
}



export default UploadPage