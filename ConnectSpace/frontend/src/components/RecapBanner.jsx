import './RecapBanner.css';

export default function RecapBanner({ recap, onClose }) {
  if (!recap) return null;

  return (
    <div className="recap-banner">
      <div className="recap-banner-card">
        <div className="recap-banner-header">
          <div>
            <h3>Session recap generated</h3>
            <p>Share this summary with your team or revisit it later from Recaps.</p>
          </div>
          <button className="recap-banner-close" onClick={onClose}>×</button>
        </div>

        <div className="recap-banner-details">
          <div>
            <span>Room</span>
            <strong>{recap.roomName}</strong>
          </div>
          <div>
            <span>Duration</span>
            <strong>{recap.durationMinutes} min</strong>
          </div>
          <div>
            <span>Participants</span>
            <strong>{recap.participantNames.length}</strong>
          </div>
          <div>
            <span>Files shared</span>
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

      </div>
    </div>
  );
}
