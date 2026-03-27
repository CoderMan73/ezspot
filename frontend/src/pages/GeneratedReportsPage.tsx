import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowForward } from 'react-icons/md';
import vtLogo from '../assets/vt_logo.png';
import '../styles/GeneratedReportsPage.css';

interface Report {
  id: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  created: string;
  catalogYear: string;
  documents: {
    name: string;
    url: string;
  }[];
}

export default function GeneratedReportsPage() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;

  // Sample data - replace with actual data from backend
  const allReports: Report[] = [
    {
      id: '906578923',
      author: {
        name: 'Alicia Brown',
        role: 'Enrollment Services Specialist',
        avatar: 'S'
      },
      created: '2/27/2026 11:00 AM',
      catalogYear: '2024 - 2025',
      documents: [
        { name: 'Prospective Teaching Awards List 2024 - 2025 #906578923', url: '#' },
        { name: 'Teaching Awards List 2024 - 2025 #906578923', url: '#' },
        { name: 'Teaching Dean\'s List 2024 - 2025 #906578923', url: '#' }
      ]
    }
  ];

  const filteredReports = allReports.filter((report) =>
    report.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.catalogYear.includes(searchQuery)
  );

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

  // Initialize expanded state with all authors by default
  useEffect(() => {
    const allIds = new Set(paginatedReports.map(r => r.id));
    setExpandedAuthors(allIds);
  }, [paginatedReports.length]);

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
        </div>

        <div className="reports-controls">
          <div className="filter-section">
            <label className="filter-label">
              Documents
            </label>
          </div>
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
                  Author 
                </th>
                <th className="col-created">
                  Created 
                </th>
                <th className="col-catalog">
                  Catalog Year 
                </th>
                <th className="col-id">ID</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.map((report) => (
                <>
                  <tr key={report.id} className="table-row-group">
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
                          <div className="author-role">{report.author.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>{report.created}</td>
                    <td>{report.catalogYear}</td>
                    <td>{report.id}</td>
                  </tr>
                  {expandedAuthors.has(report.id) &&
                    report.documents.map((doc, index) => (
                      <tr key={`${report.id}-${index}`} className="table-row-document">
                        <td className="document-cell" colSpan={4}>
                            <div className="document-info">
                                <MdArrowForward className="document-arrow" />
                                <div>
                                    <div className="document-name">
                                    {doc.name}
                                    </div>
                                    <a href={doc.url} className="document-download-link" download>
                                    Download
                                    </a>
                                </div>
                            </div>
                            </td>
                      </tr>
                    ))}
                </>
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
