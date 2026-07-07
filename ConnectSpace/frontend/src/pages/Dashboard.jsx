import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentRooms, setRecentRooms] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [unreadNotesCount, setUnreadNotesCount] = useState({});

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [sessionRes, roomsRes] = await Promise.all([
        api.getUserSessions(),
        api.getUserRooms(),
      ]);
      setRecentSessions(sessionRes.sessions || []);

      const rooms = roomsRes.rooms || [];
      setRecentRooms(rooms);

      // Load unread notes count for each room
      const notesCountMap = {};
      const notesPromises = rooms.map((room) =>
        api.getVideoNotes(room.roomId)
          .then((res) => {
            notesCountMap[room.roomId] = res.unreadCount || 0;
          })
          .catch(() => {
            notesCountMap[room.roomId] = 0;
          })
      );

      await Promise.all(notesPromises);
      setUnreadNotesCount(notesCountMap);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    setError('');
    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }
    setLoading(true);
    try {
      const { room } = await api.createRoom({ name: roomName });
      navigate(`/room/${room.roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom(e) {
    e.preventDefault();
    setError('');
    if (!joinCode.trim()) {
      setError('Room code is required');
      return;
    }
    setLoading(true);
    try {
      await api.joinRoom(joinCode.trim());
      navigate(`/room/${joinCode.trim()}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const userInitial = user?.name?.charAt(0).toUpperCase() || 'U';
  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const getDuration = (start, end) => {
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  };

  return (
    <div className="dashboard">
      {/* Background gradients */}
      <div className="dashboard-backdrop" />
      <div className="dashboard-grid-overlay" />

      {/* Top Navigation */}
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
          <div className="orbit-logo-small">
            <span className="orbit-core-small" />
            <span className="orbit-dot-small" />
          </div>
          <div className="brand-name-small">ConnectSpace</div>
        </div>

        <div className="navbar-right">
          <div className="navbar-menu">
            <button className="recap-btn" onClick={() => navigate('/recaps')}>
              Recaps
            </button>
            <div className="user-avatar-wrapper">
              <button className="user-avatar" onClick={() => setShowUserMenu(!showUserMenu)}>
                {userInitial}
              </button>
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="dropdown-header">{user?.name}</div>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Hero Section */}
        <section className="dashboard-hero">
          <h1 className="hero-title">Your Space</h1>

          {/* Launch Room Card */}
          <div className="hero-launch-card">
            <form onSubmit={handleCreateRoom} className="launch-form">
              <div className="launch-input-wrapper">
                <input
                  type="text"
                  placeholder="Enter room name..."
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="launch-input"
                  maxLength={50}
                />
                <button type="submit" className="launch-button" disabled={loading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  {loading ? 'Launching...' : 'Launch Room'}
                </button>
              </div>
            </form>
          </div>

          {/* Join with code */}
          <div className="hero-join-row">
            <span className="join-label">Or join with a code:</span>
            <form onSubmit={handleJoinRoom} className="join-form">
              <input
                type="text"
                placeholder="Enter room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="join-input"
              />
              <button type="submit" className="join-button" disabled={loading}>
                Join
              </button>
            </form>
          </div>

          {error && <p className="dashboard-error">{error}</p>}
        </section>

        {/* Recent Spaces */}
        {recentRooms.length > 0 && (
          <section className="dashboard-spaces">
            <h2 className="section-title">Recent Spaces</h2>
            <div className="spaces-scroll">
              {recentRooms.map((room) => (
                <div key={room.roomId} className="space-card">
                  {unreadNotesCount[room.roomId] > 0 && (
                    <div className="space-notes-badge">
                      <div className="badge-glow" />
                      <span className="badge-count">{unreadNotesCount[room.roomId]}</span>
                    </div>
                  )}
                  <div className="space-thumbnail">
                    {room.whiteboardSnapshot ? (
                      <img 
                        src={`data:image/png;base64,${room.whiteboardSnapshot.slice(0, 50)}`}
                        alt={room.name}
                        className="thumbnail-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className="thumbnail-gradient" />
                  </div>
                  
                  <div className="space-info">
                    <h3 className="space-name">{room.name}</h3>
                    <div className="space-meta">
                      <span className="space-date">
                        {new Date(room.lastActiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="space-sessions">{room.sessionCount} session{room.sessionCount !== 1 ? 's' : ''}</span>
                    </div>
                    
                    {room.participantCount > 0 && (
                      <div className="space-avatars">
                        {Array.from({ length: Math.min(3, room.participantCount) }).map((_, i) => (
                          <div key={i} className="avatar-mini" title={`Participant ${i + 1}`}>
                            {String.fromCharCode(65 + (i % 26))}
                          </div>
                        ))}
                        {room.participantCount > 3 && (
                          <div className="avatar-mini">+{room.participantCount - 3}</div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    className="space-rejoin"
                    onClick={() => navigate(`/room/${room.roomId}`)}
                  >
                    Rejoin
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Sessions */}
        <section className="dashboard-sessions">
          <h2 className="section-title">Recent Sessions</h2>
          {sessionsLoading ? (
            <div className="loading-state">Loading sessions...</div>
          ) : recentSessions.length > 0 ? (
            <div className="sessions-scroll">
              {recentSessions.map((session) => (
                <div key={session._id} className="session-card">
                  <div className="session-card-header">
                    <h3 className="session-name">{session.name}</h3>
                    <span className="session-date">{formatDate(session.endedAt)}</span>
                  </div>
                  <div className="session-stats">
                    <div className="stat-item">
                      <span className="stat-label">Duration</span>
                      <span className="stat-value">{getDuration(session.sessionStartedAt, session.endedAt)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Participants</span>
                      <span className="stat-value">{session.participants?.length || 0}</span>
                    </div>
                  </div>
                  <button
                    className="session-rejoin"
                    onClick={() => navigate(`/room/${session.roomId}`)}
                  >
                    Rejoin
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-content">
                <div className="empty-state-icon">✨</div>
                <p className="empty-state-text">Your first session is one click away</p>
                <p className="empty-state-subtext">Create a new room above to get started</p>
              </div>
            </div>
          )}
        </section>

        {/* Features Grid */}
        <section className="dashboard-features">
          <h2 className="section-title">Power Your Collaboration</h2>
          <div className="features-grid">
            <div className="feature-card forge-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8 5 3 12l5 7" /><path d="M16 5l5 7-5 7" /></svg>
              </div>
              <h3 className="feature-name">Forge</h3>
              <p className="feature-desc">Real-time collaborative code editor for your team.</p>
            </div>
            <div className="feature-card whiteboard-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
              </div>
              <h3 className="feature-name">Whiteboard</h3>
              <p className="feature-desc">Draw and sketch ideas together in real time.</p>
            </div>
            <div className="feature-card files-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              </div>
              <h3 className="feature-name">Files</h3>
              <p className="feature-desc">Share encrypted files securely with your team.</p>
            </div>
          </div>
          <div className="features-grid-row2">
            <div className="feature-card focus-hub-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>
              </div>
              <h3 className="feature-name">Focus Hub</h3>
              <p className="feature-desc">Polls, timer, notes, and agenda for focused sessions.</p>
            </div>
            <div className="feature-card echo-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /><circle cx="12" cy="12" r="6" opacity="0.6" /><circle cx="12" cy="12" r="10" opacity="0.3" /></svg>
              </div>
              <h3 className="feature-name">Echo</h3>
              <p className="feature-desc">Auto-generated session recaps with highlights.</p>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
