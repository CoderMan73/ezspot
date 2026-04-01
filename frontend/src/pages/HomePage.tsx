import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import vtLogo from '../assets/vt_logo.png';
import '../styles/HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('home');
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUploadClick = () => {
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFile) {
      console.log('File:', selectedFile);

      try {
        const formData = new FormData();
        formData.append('pdf', selectedFile);

        // NEED TO REPLACE THIS WITH THE ACTUAL PID FROM THE USERS TABLE WHEN HOOKED UP
        formData.append('userPid', 'joe.bloggs');

        // send the upload request
        // HARD CODED LOCAL PATH NEED TO CHANGE
        const uploadResponse = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData,
        });

        // handle error in request sending
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Upload failed.');
        }

        // get response data
        const uploadData = await uploadResponse.json();
        const reportId = uploadData.report_id;

        // save the active job so the global status component can track it
        localStorage.setItem(
          'activeReportJob',
          JSON.stringify({
            reportId,
            filename: selectedFile.name,
            status: 'Processing',
          })
        );

        window.dispatchEvent(new Event('report-uploaded'));

        setShowModal(false);
        setSelectedFile(null);
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedFile(null);
  };

  const fileInputRef = (e: HTMLInputElement | null) => {
    if (e) {
      (window as any).fileInput = e;
    }
  };

  return (
    <div className="home-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <img src={vtLogo} alt="Virginia Tech Logo" className="logo-img" />
        </div>
        <nav className="menu">
          <button
            className={`menu-item ${activeMenu === 'home' ? 'active' : ''}`}
            onClick={() => setActiveMenu('home')}
          >
            Home
          </button>
          <button
            className={`menu-item ${activeMenu === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveMenu('statistics')}
          >
            Statistics
          </button>
          <button
            className={`menu-item ${activeMenu === 'reports' ? 'active' : ''}`}
            onClick={() => navigate('/reports')}
          >
            Generated Reports
          </button>
        </nav>
        <button className="login-btn">Login with VT CAS</button>
      </aside>

      {/* Main Content */}
      <main className="main-home-content">
        <div className="hero">
          <h1>COE SPOT PDF<br />Extraction System</h1>
          <p>
            Developed for Virginia Tech&apos;s College of Engineering, this system
            automatically extracts SPOT evaluation data from standardized PDF
            reports and generates filtered spreadsheets and formatted Word
            documents to support the Teaching Dean&apos;s List selection process.
          </p>
          <button className="upload-btn" onClick={handleUploadClick}>
            Upload SPOT Report
          </button>
        </div>

        {/* Steps */}
        <div className="steps-container">
          <div className="step">
            <h3>Step 1</h3>
            <h4>Upload SPOT Report</h4>
            <p>
              Select a digitally generated SPOT evaluation PDF report. The system will
              automatically begin processing the files.
            </p>
          </div>

          <div className="step">
            <h3>Step 2</h3>
            <h4>Extract &amp; Store Data</h4>
            <p>
              The system extracts instructor name, course details, enrollment totals,
              and average ratings from each report and stores the
              data securely.
            </p>
          </div>

          <div className="step">
            <h3>Step 3</h3>
            <h4>Review Instructors</h4>
            <p>
              Instructors are automatically filtered based on Teaching Dean&apos;s List requirements:
            </p>
            <ul>
              <li>Minimum 3 classes taught.</li>
              <li>More than 30 total students.</li>
              <li>Average rating of 5.2 or higher.</li>
            </ul>
          </div>

          <div className="step">
            <h3>Step 4</h3>
            <h4>Generate Documents</h4>
            <p>Download:</p>
            <ul>
              <li>A prospective teaching awards spreadsheet that displays all professors that met the Teaching Dean&apos;s List criteria.</li>
              <li>A teaching awards spreadsheet that displays the top 30 professors ordered by teaching rating.</li>
              <li>A Word document listing all qualifying instructors alphabetically including course level averages.</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload SPOT Report</h2>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Select PDF File</label>
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  required
                />
                <button
                  type="button"
                  className="custom-file-btn"
                  onClick={() => (window as any).fileInput?.click()}
                >
                  Choose File
                </button>
                {selectedFile && <p className="file-name">Selected: {selectedFile.name}</p>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn-submit">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
