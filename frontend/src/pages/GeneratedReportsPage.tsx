import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowForward } from 'react-icons/md';
import vtLogo from '../assets/vt_logo.png';
import '../styles/GeneratedReportsPage.css';


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

export default function GeneratedReportsPage() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;

  const [allReports, setAllReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizedQuery = searchQuery.toLowerCase().trim();

  const filteredReports = allReports.filter((report) => {
    const name = report.reportName.toLowerCase();

    const normalizedName = name
      .replace(/[-_.]/g, " ")   // replace separators
      .replace(/\s+/g, " ");    // clean spaces

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
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/reports/user/joe.bloggs");
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
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const toggleAuthorExpand = (authorId: string) => {
    const newExpanded = new Set(expandedAuthors);
    if (newExpanded.has(authorId)) {
      newExpanded.delete(authorId);
    } else {
      newExpanded.add(authorId);
    }
    setExpandedAuthors(newExpanded);
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
        <div className="logo">
          <img src={vtLogo} alt="Virginia Tech Logo" className="logo-img" />
        </div>
        <nav className="menu">
          <button
            className={`menu-item ${activeMenu === 'home' ? 'active' : ''}`}
            onClick={() => navigate('/')}
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
            onClick={() => setActiveMenu('reports')}
          >
            Generated Reports
          </button>
        </nav>
        <button className="login-btn">Login with VT CAS</button>
      </aside>

      {/* Main Content */}
      <main className="main-report-content">
        <div className="reports-header">
          <h1>Generated Reports</h1>

          <div className="search-section">
            <input
              type="text"
              className="search-input"
              placeholder="Search"
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
                                onClick={() => console.log(report.id, doc.type)}
                              >
                                Download
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
      </main>
    </div>
  );
}
