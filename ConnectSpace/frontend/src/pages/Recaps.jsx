import { useEffect, useState } from 'react';
import { recapApi } from '../api/recaps';
import './Recaps.css';

export default function Recaps() {
  const [recaps, setRecaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    recapApi
      .list()
      .then(({ recaps }) => setRecaps(recaps))
      .catch((err) => setError(err.message || 'Could not load recaps'))
      .finally(() => setLoading(false));
  }, []);

  function copyLink(recap) {
    const url = `${window.location.origin}/room/${encodeURIComponent(recap.roomId)}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <div className="recaps-page">
      <header className="recaps-header">
        <div>
          <h1>Session Recaps</h1>
          <p>Review and share your room summaries at a glance.</p>
        </div>
      </header>

      {loading && <p>Loading recaps…</p>}
      {error && <p className="error-msg">{error}</p>}
      {!loading && !error && recaps.length === 0 && <p className="empty-state">No recaps yet.</p>}

      <div className="recaps-grid">
        {recaps.map((recap) => (
          <article key={recap._id} className="recap-card">
            <div className="recap-card-header">
              <div>
                <h2>{recap.roomName}</h2>
                <p>{new Date(recap.createdAt).toLocaleString()}</p>
              </div>
              <button className="recap-copy-btn" onClick={() => copyLink(recap)}>
                Copy link
              </button>
            </div>

            <div className="recap-metrics">
              <div>
                <span>Duration</span>
                <strong>{Math.max(0, Math.round((new Date(recap.endedAt) - new Date(recap.sessionStartedAt)) / 60000))} min</strong>
              </div>
              <div>
                <span>Participants</span>
                <strong>{recap.participantNames.length}</strong>
              </div>
              <div>
                <span>Files</span>
                <strong>{recap.fileCount}</strong>
              </div>
              <div>
                <span>Forge edits</span>
                <strong>{recap.forgeEditCount}</strong>
              </div>
              <div>
                <span>Whiteboard strokes</span>
                <strong>{recap.whiteboardStrokeCount}</strong>
              </div>
            </div>

            <div className="recap-summary empty">No summary available for this session.</div>
          </article>
        ))}
      </div>
    </div>
  );
}
