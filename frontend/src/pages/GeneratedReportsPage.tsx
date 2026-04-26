import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowForward } from 'react-icons/md';
import type { DeansListFormData } from '../components/DeansListModal';
import vtLogo from '../assets/vt_logo.png';
import '../styles/GeneratedReportsPage.css';
import CasAuthButton from '../components/CasAuthButton';
import DeansListModal from '../components/DeansListModal';


interface Report {
  id: string;
  reportName: string;
  author: {
    name: string;
    avatar?: string;
  };
  created: string;
  documents: {  
    name: string;
    subtitle: string;
    type: string;
  }[];
}

type SessionUser = {
  pid: string;
  email: string;
  name: string;
}

export default function GeneratedReportsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set());
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  const [deansListModalOpen, setDeansListModalOpen] = useState(false);
  const [deansListModalReportId, setDeansListModalReportId] = useState<string | null>(null);
  const [deansListModalReportName, setDeansListModalReportName] = useState<string | null>(null);
  const [deansListGenerating, setDeansListGenerating] = useState(false);
  const itemsPerPage = 10;

  
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const isAuthenticated = currentUser !== null;

  

  const normalizedQuery = searchQuery.toLowerCase().trim();

  const filteredReports = allReports.filter((report) => {
    const name = report.reportName.toLowerCase();

    const normalizedName = name
      .replace(/[-_.]/g, " ")    
      .replace(/\s+/g, " ");   

    return (
      report.author.name.toLowerCase().includes(normalizedQuery) ||
      name.includes(normalizedQuery) ||
      normalizedName.includes(normalizedQuery)
    );
  });

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/currentUser', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.status === 401 || !response.ok) {
          setCurrentUser(null);
          setLoading(false);
          window.location.href = '/login'; 
          return;
        }

        const data = await response.json();
        setCurrentUser(data.user ?? null);

        if (!data.user) {
          setLoading(false);
          window.location.href = '/login';
          return;
        }

      } catch {
        setCurrentUser(null);
        setLoading(false);
        window.location.href = '/login';
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    if (!currentUser.pid) return;

    const fetchReports = async () => {
      try {
        const res = await fetch(`/api/reports/user`, {
          method: 'GET',
          credentials: 'include',
        });

        const data = await res.json();

        const mappedReports: Report[] = data.map((row: any) => ({
          id: String(row.report_id),
          reportName: String(row.filename),
          author: {
            name: row.user_pid,
          },
          created: new Date(row.upload_time).toLocaleString(),
          documents: [
            {
              name: `Prospective Teaching Awards List`,
              subtitle: `Sheet containing data from all entries in the report.`,
              type: "prospective-awards"
            },
            {
              name: `Top 30 Teaching Awards List`,
              subtitle: `Sheet containing the top 30 highest rated professors in the report.`,
              type: "teaching-awards"
            },
            {
              name: `Teaching Dean's List`,
              subtitle: `Document containing all professors on the Dean's List from this report ordered alphabetically.`,
              type: "deans-list"
            }
          ]
        }));

        setAllReports(mappedReports);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();

    // Listen for completion events from the GlobalUploadStatus component
    window.addEventListener('report-processed', fetchReports);

    return () => {
      window.removeEventListener('report-processed', fetchReports);
    };
  }, [currentUser]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  function handleAuthClick() {
    const returnTo = encodeURIComponent('/reports'); 
    const endpoint = isAuthenticated
      ? `/api/logout?returnTo=${returnTo}`
      : `/api/login?returnTo=${returnTo}`;
    window.location.href = endpoint;
  }

  const toggleAuthorExpand = (authorId: string) => {
    const newExpanded = new Set(expandedAuthors);
    if (newExpanded.has(authorId)) {
      newExpanded.delete(authorId);
    } else {
      newExpanded.add(authorId);
    }
    setExpandedAuthors(newExpanded);
  };

  const getExportEndpoint = (docType: string) => {
    if (docType === 'prospective-awards') {
      return '/api/export/prospective';
    }

    if (docType === 'teaching-awards') {
      return '/api/export/top30';
    }

    if (docType === 'deans-list') {
      return '/api/export/deans-list';
    }

    return null;
  };

  const getDownloadFileName = (reportName: string, docType: string) => {
    const baseReportName = reportName.replace(/\.pdf$/i, '');

    if (docType === 'prospective-awards') {
      return `${baseReportName}-prospective.xlsx`;
    }

    if (docType === 'teaching-awards') {
      return `${baseReportName}-top30.xlsx`;
    }

    if (docType === 'deans-list') {
      return `${baseReportName}-deans-list.docx`;
    }

    return `${baseReportName}.xlsx`;
  };

  const handleDocumentDownload = async (reportId: string, reportName: string, docType: string) => {
    // Special handling for Dean's List: open modal instead of immediate download
    if (docType === 'deans-list') {
      setDeansListModalReportId(reportId);
      setDeansListModalReportName(reportName);
      setDeansListModalOpen(true);
      return;
    }

    const endpoint = getExportEndpoint(docType);

    if (!endpoint) {
      console.warn(`No export endpoint configured for document type: ${docType}`);
      return;
    }

    const downloadKey = `${reportId}-${docType}`;
    setDownloadingDocument(downloadKey);

    try {
      const response = await fetch(`${endpoint}?reportId=${encodeURIComponent(reportId)}`);

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = getDownloadFileName(reportName, docType);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(`Failed to download ${docType} for report ${reportId}:`, error);
    } finally {
      setDownloadingDocument(null);
    }
  };

  const handleDeansListGenerate = async (formData: DeansListFormData) => {
    if (!deansListModalReportId) {
      console.error('Report ID not set for Dean\'s List generation');
      return;
    }

    setDeansListGenerating(true);

    try {
      const response = await fetch(`/api/export/deans-list?reportId=${encodeURIComponent(deansListModalReportId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = getDownloadFileName(deansListModalReportName || 'report', 'deans-list');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Failed to generate Dean\'s List:', error);
      alert('Failed to generate Dean\'s List. Please try again.');
    } finally {
      setDeansListGenerating(false);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
  

    return pages;
  };

  if (loading) {
  return <div>Loading...</div>;
  }

  return (
    <div className="home-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <img src={vtLogo} alt="Virginia Tech Logo" className="logo-img" />
          </div>

          <nav className="menu">
            <button className="menu-item" onClick={() => navigate('/')}>
              Home
            </button>

            <button className="menu-item" onClick={() => navigate('/statistics')}>
              Statistics
            </button>

            <button className="menu-item active" onClick={() => navigate('/reports')}>
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
      <main className="main-report-content">
        <div className="reports-header">
          <h1>Generated Reports</h1>

          <div className="search-section">
            <input
              type="text"
              className="search-input"
              placeholder="Search Report Name"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        {/* Reports Table */}
        <div className="table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th className="col-author">
                  Generated By
                </th>
                <th className="col-created">
                  Created 
                </th>
                <th className="col-id">Report Name</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.map((report) => (
                <React.Fragment key={report.id}>
                  <tr className="table-row-group">
                    <td className="row-author-cell">
                      <div className="author-info">
                        <button
                          className={`expand-arrow ${expandedAuthors.has(report.id) ? 'expanded' : ''}`}
                          onClick={() => toggleAuthorExpand(report.id)}
                          aria-label="Expand documents"
                        >
                          <MdArrowForward />
                        </button>
                        <div className="author-details">
                          <div className="author-name">{report.author.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>{report.created}</td>
                    <td>{report.reportName}</td>
                  </tr>

                  {expandedAuthors.has(report.id) &&
                    report.documents.map((doc, index) => (
                      <tr key={`${report.id}-${index}`} className="table-row-document">
                        <td className="document-cell" colSpan={3}>
                          <div className="document-info">
                            <MdArrowForward className="document-arrow" />
                            <div>
                              <div className="document-name">
                                {doc.name}
                              </div>
                              <div className="document-subtitle">
                                {doc.subtitle}
                              </div>
                              <button
                                className="document-download-link"
                                onClick={() => handleDocumentDownload(report.id, report.reportName, doc.type)}
                                disabled={downloadingDocument === `${report.id}-${doc.type}`}
                              >
                                {downloadingDocument === `${report.id}-${doc.type}` ? 'Downloading...' : 'Download'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredReports.length > 0 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              ← Previous
            </button>

            <div className="page-numbers">
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  className={`page-number ${
                    page === currentPage ? 'active' : ''
                  } ${typeof page !== 'number' ? 'ellipsis' : ''}`}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={typeof page !== 'number'}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </main>

      <DeansListModal
        isOpen={deansListModalOpen}
        reportId={deansListModalReportId || ''}
        reportName={deansListModalReportName || ''}
        onClose={() => {
          setDeansListModalOpen(false);
          setDeansListModalReportId(null);
          setDeansListModalReportName(null);
        }}
        onGenerate={handleDeansListGenerate}
        isLoading={deansListGenerating}
      />
    </div>
  );
}
