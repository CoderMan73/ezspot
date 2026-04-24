import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from "./pages/HomePage"
import StatisticsPage from "./pages/StatisticsPage"
import GeneratedReportsPage from "./pages/GeneratedReportsPage"
import GlobalUploadStatus from "./components/GlobalUploadStatus"
import LoginPage from "./pages/LoginPage"
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/reports" element={<GeneratedReportsPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
      </Routes>

      <GlobalUploadStatus />
    </BrowserRouter>
  )
}

export default App