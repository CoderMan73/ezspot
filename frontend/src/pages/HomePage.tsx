import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import vtLogo from '../assets/vt_logo.png';
import '../styles/HomePage.css';
import CasAuthButton from '../components/CasAuthButton';

type SessionUser = {
  pid: string
  email: string
  name: string
}

export default function HomePage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser])

  useEffect(() => {
    loadCurrentUser()
  }, [])

  function handleAuthClick() {
    const returnTo = encodeURIComponent('/')
    const endpoint = isAuthenticated
      ? `/api/logout?returnTo=${returnTo}`
      : `/api/login?returnTo=${returnTo}`
    window.location.href = endpoint
  }

  async function loadCurrentUser() {
    try {
      const response = await fetch('/api/currentUser', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.status === 401 || !response.ok) {
        setCurrentUser(null);
        window.location.href = '/login';
        return;
      }

      const data = await response.json();
      setCurrentUser(data.user ?? null);

      if (!data.user) {
        window.location.href = '/login';
        return;
      }

      if (data.user?.pid) {
        await fetch('/api/users/ensure-me', {
          method: 'POST',
          credentials: 'include',
        });
      }
    } catch {
      setCurrentUser(null);
      window.location.href = '/login';
    }
  }

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

    if (!selectedFile || isUploading) return;

    // lock the upload button
    setIsUploading(true);   

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Upload failed.');
      }

      const uploadData = await uploadResponse.json();
      const reportId = uploadData.report_id;

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
    } finally {
      setIsUploading(false); 
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
        <div className="sidebar-top">
          <div className="logo">
            <img src={vtLogo} alt="Virginia Tech Logo" className="logo-img" />
          </div>

          <nav className="menu">
            <button className="menu-item active" onClick={() => navigate('/')}>
              Home
            </button>

            <button className="menu-item" onClick={() => navigate('/statistics')}>
              Statistics
            </button>

            <button className="menu-item" onClick={() => navigate('/reports')}>
              Generated Reports
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          {isAuthenticated && (
            <div className="user-info">
              Welcome, <strong>{currentUser?.pid}!</strong>
            </div>
          )}

          <CasAuthButton
            mode={isAuthenticated ? 'logout' : 'login'}
            onClick={handleAuthClick}
            disabled={false}
            className="login-btn"
          />
        </div>
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
          <button 
            className="upload-btn" 
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            {isUploading ? 'Processing...' : 'Upload SPOT Report'}
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
                  disabled={isUploading}
                >
                  Choose File
                </button>
                {selectedFile && <p className="file-name">Selected: {selectedFile.name}</p>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
