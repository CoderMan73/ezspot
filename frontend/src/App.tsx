import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from "./pages/HomePage"
import UploadPage from "./pages/UploadPage"
import GeneratedReportsPage from "./pages/GeneratedReportsPage"
import './App.css'




function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/reports" element={<GeneratedReportsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
