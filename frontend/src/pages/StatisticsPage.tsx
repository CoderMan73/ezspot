import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import vtLogo from '../assets/vt_logo.png';
import '../styles/GeneratedReportsPage.css'; // Using similar styling
import CasAuthButton from '../components/CasAuthButton';

type StatisticsData = {
  instr_first_name: string;
  instr_last_name: string;
  year: number;
  rating: number;
};

type SessionUser = {
  pid: string;
  email: string;
  name: string;
};

type Professor = {
  name: string;
  data: { year: number; rating: number }[];
};

export default function StatisticsPage() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('statistics');
  const [data, setData] = useState<StatisticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const isAuthenticated = currentUser !== null;

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedProfessors, setSelectedProfessors] = useState<Set<string>>(new Set());
  const [graphProfessors, setGraphProfessors] = useState<Professor[]>([]);

  useEffect(() => {
    loadCurrentUser();
    fetchStatistics();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedProfessors.size === 0) {
      setGraphProfessors([]);
      return;
    }

    // Get unique professors
    const allProfessors = Array.from(
      new Map(
        data.map(item => [`${item.instr_first_name} ${item.instr_last_name}`, item])
      ).values()
    );

    const professorsToShow = Array.from(selectedProfessors).map(name => allProfessors.find(p => `${p.instr_first_name} ${p.instr_last_name}` === name)!).filter(Boolean);

    const profData: Professor[] = [];
    professorsToShow.forEach(prof => {
      const name = `${prof.instr_first_name} ${prof.instr_last_name}`;
      const profStats = data.filter(item => `${item.instr_first_name} ${item.instr_last_name}` === name);

      // Group by year and average ratings
      const yearMap = new Map<number, number[]>();
      profStats.forEach(item => {
        if (!yearMap.has(item.year)) yearMap.set(item.year, []);
        yearMap.get(item.year)!.push(item.rating);
      });
      const profDataPoints = Array.from(yearMap.entries()).map(([year, ratings]) => ({
        year,
        rating: ratings.reduce((a, b) => a + b, 0) / ratings.length
      })).sort((a, b) => a.year - b.year);

      profData.push({ name, data: profDataPoints });
    });

    // Sort professors by rating in the most recent year
    const maxYear = Math.max(...data.map(item => item.year));
    profData.sort((a, b) => {
      const aRating = a.data.find(d => d.year === maxYear)?.rating || 0;
      const bRating = b.data.find(d => d.year === maxYear)?.rating || 0;
      return aRating - bRating; // ascending
    });

    setGraphProfessors(profData);
  }, [selectedProfessors, data]);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/currentUser', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.status === 401) {
        setCurrentUser(null);
        return;
      }

      if (!response.ok) {
        setCurrentUser(null);
        return;
      }

      const data = await response.json();
      setCurrentUser(data.user ?? null);
    } catch {
      setCurrentUser(null);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/statistics', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.status === 401) {
        setError('Unauthorized');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError('Failed to fetch statistics');
        setLoading(false);
        return;
      }

      const stats: StatisticsData[] = await response.json();
      setData(stats);
      setLoading(false);
    } catch (err) {
      setError('Error fetching data');
      setLoading(false);
    }
  };

  const handleAuthClick = () => {
    const returnTo = encodeURIComponent('/statistics');
    const endpoint = isAuthenticated
      ? `/api/logout?returnTo=${returnTo}`
      : `/api/login?returnTo=${returnTo}`;
    window.location.href = endpoint;
  };

  // Get unique professors
  const professors = Array.from(
    new Map(
      data.map(item => [`${item.instr_first_name} ${item.instr_last_name}`, item])
    ).values()
  );

  // Filter professors based on search
  const filteredProfessors = professors.filter(prof =>
    `${prof.instr_first_name} ${prof.instr_last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginate
  const totalPages = Math.ceil(filteredProfessors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProfessors = filteredProfessors.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectProfessor = (name: string) => {
    const newSelected = new Set(selectedProfessors);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedProfessors(newSelected);
  };

  // Prepare data for chart
  const chartData = [];
  const allYears = Array.from(new Set(data.map(item => item.year))).sort();
  for (const year of allYears) {
    const entry: any = { year };
    graphProfessors.forEach(prof => {
      const rating = prof.data.find(d => d.year === year)?.rating;
      entry[prof.name] = rating;
    });
    chartData.push(entry);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
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
            className={`menu-item ${activeMenu === 'upload' ? 'active' : ''}`}
            onClick={() => navigate('/upload')}
          >
            Upload
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
        <CasAuthButton
          mode={isAuthenticated ? 'logout' : 'login'}
          onClick={handleAuthClick}
          disabled={false}
          className="login-btn"
        />
      </aside>

      {/* Main Content */}
      <main className="main-report-content">
        <div className="reports-header">
          <h1>Professor Ratings Statistics</h1>
          <div className="search-section">
            <input
              type="text"
              className="search-input"
              placeholder="Search professors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="reports-list">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Professor Name</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProfessors.map((prof, index) => {
                const name = `${prof.instr_first_name} ${prof.instr_last_name}`;
                return (
                  <tr
                    key={index}
                    className={selectedProfessors.has(name) ? 'selected-row' : ''}
                    onClick={() => handleSelectProfessor(name)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>

        {/* Graph */}
        <div style={{ marginTop: '20px' }}>
          <h2>Professor Ratings Over Years</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              {graphProfessors.map((prof, index) => (
                <Line
                  key={prof.name}
                  type="monotone"
                  dataKey={prof.name}
                  stroke={`hsl(${index * 137.5 % 360}, 70%, 50%)`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
