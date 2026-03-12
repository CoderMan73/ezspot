import { useState } from 'react'


function UploadPage() {

    // use file and setFile with a file or null w/ default value of null
    const [file, setFile] = useState<File | null>(null)
    // create storage state for given values
    const [semester, setSemester] = useState("")
    const [year, setYear] = useState("")
    const [userPid, setUserPid] = useState("")

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

    // try to make backend request
    try {
        const response = await fetch("http://localhost:5000/api/upload", {
            method: "POST",
            body: formData
        })

        const data = await response.json()

        console.log("Server response:", data)

    } catch (error) {
        console.error("Upload failed:", error)
    }
    
    }


    return (
        <div>
            <h1>Upload PDF</h1>
            <form onSubmit={handleSubmit}>
                <label>Semester</label>
                <input type="text" name="semester" value={semester} onChange={(e) => setSemester(e.target.value)} />
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
                <button type="submit">
                    Upload
                </button>
            </form>
        </div>
    )
}



export default UploadPage