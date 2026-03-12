import { useState, useEffect } from 'react'

function HomePage() {
    const [message, setMessage] = useState('Loading...')

    useEffect(() => {
        fetch('http://localhost:5000/api/hello')
        .then((res) => res.json())
        .then((data) => setMessage(data.message))
        .catch(() => setMessage('Failed to load backend message'))
    }, [])

    return (
        <>
        <h1>EZ SPOT</h1>
        <p>{message}</p>
        </>
    )
}

export default HomePage