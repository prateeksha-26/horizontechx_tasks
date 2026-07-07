import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useSocket, useWebRTC } from '../hooks/useWebRTC';
import VideoTile from '../components/VideoTile';
import ChatPanel from '../components/ChatPanel';
import WhiteboardPanel from '../components/WhiteboardPanel';
import FilePanel from '../components/FilePanel';
import ForgePanel from '../components/ForgePanel';
import FocusHubPanel from '../components/FocusHubPanel';
import NotesPanel from '../components/NotesPanel';
import RecapBanner from '../components/RecapBanner';
import './MeetingRoom.css';

export default function MeetingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [mediaError, setMediaError] = useState('');
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [sessionNumber, setSessionNumber] = useState(0);

  const { socket, connected, participants, messages, sendMessage } = useSocket(roomId);
  const { remoteStreams, screenSharing, startScreenShare, stopScreenShare, toggleAudio, toggleVideo } =
    useWebRTC(socket, roomId, localStream);
  const [sessionRecap, setSessionRecap] = useState(null);

  useEffect(() => {
    api.joinRoom(roomId).then(({ room: r }) => setRoom(r)).catch(() => navigate('/'));
  }, [roomId, navigate]);

  // Listen for returning room event
  useEffect(() => {
    if (!socket) return;
    
    const handleReturningRoom = ({ sessionCount }) => {
      setSessionNumber(sessionCount);
      setShowWelcomeBack(true);
      setTimeout(() => setShowWelcomeBack(false), 4000);
    };

    socket.on('returning-room', handleReturningRoom);
    return () => socket.off('returning-room', handleReturningRoom);
  }, [socket]);

  useEffect(() => {
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
      })
      .catch(() => {
        setMediaError('Camera/microphone access denied. You can still use chat and whiteboard.');
      });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleToggleAudio() {
    const next = !audioEnabled;
    setAudioEnabled(next);
    toggleAudio(next);
  }

  function handleToggleVideo() {
    const next = !videoEnabled;
    setVideoEnabled(next);
    toggleVideo(next);
  }

  function handleScreenShare() {
    if (screenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }

  function handleLeave() {
    localStream?.getTracks().forEach((t) => t.stop());
    navigate('/');
  }

  function copyRoomId() {
    navigator.clipboard.writeText(roomId);
  }

  const participantMap = new Map(participants.map((p) => [p.socketId, p.name]));

  useEffect(() => {
    if (!socket) return;

    const handleSessionRecap = ({ recap }) => setSessionRecap(recap);
    socket.on('session-recap', handleSessionRecap);

    return () => {
      socket.off('session-recap', handleSessionRecap);
    };
  }, [socket]);

  return (
    <div className="meeting-room">
      <header className="meeting-header">
        <div className="room-info">
          <h2>{room?.name || 'Meeting'}</h2>
          <div className="room-id">
            Room ID: <code className="room-code" onClick={copyRoomId} title="Click to copy">{roomId}</code>
            {connected ? ' · Connected' : ' · Connecting...'}
          </div>
        </div>
        <div className="meeting-meta">
          <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      {mediaError && (
        <div className="media-warning">
          {mediaError}
        </div>
      )}

      <div className="meeting-body">
        <RecapBanner recap={sessionRecap} onClose={() => setSessionRecap(null)} />
        
        {showWelcomeBack && (
          <div className="welcome-back-banner">
            <div className="welcome-back-content">
              <span className="welcome-icon">↻</span>
              <span className="welcome-text">
                Picked up where you left off · Session {sessionNumber}
              </span>
            </div>
          </div>
        )}
        
        <div className="meeting-main">
          <div className="video-grid">
            {localStream && (
              <VideoTile stream={localStream} name={user?.name} isLocal muted />
            )}
            {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
              <VideoTile
                key={socketId}
                stream={stream}
                name={participantMap.get(socketId) || 'Participant'}
              />
            ))}
            {remoteStreams.size === 0 && !localStream && (
              <div className="waiting-state">
                Waiting for participants...
              </div>
            )}
          </div>

          <div className="meeting-controls">
            <button
              className={`control-btn ${audioEnabled ? '' : 'off'}`}
              onClick={handleToggleAudio}
              aria-label={audioEnabled ? 'Mute / Unmute' : 'Mute / Unmute'}
              data-tooltip={audioEnabled ? 'Mute / Unmute' : 'Mute / Unmute'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                <path d="M12 17v4" />
                <path d="M8 21h8" />
                {audioEnabled ? null : <path d="M7 7l10 10" />}
              </svg>
            </button>

            <button
              className={`control-btn ${videoEnabled ? '' : 'off'}`}
              onClick={handleToggleVideo}
              aria-label={videoEnabled ? 'Stop / Start video' : 'Stop / Start video'}
              data-tooltip={videoEnabled ? 'Stop / Start video' : 'Stop / Start video'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 7h10l4-4v18l-4-4H5z" />
                {videoEnabled ? null : <path d="M6 6l12 12" />}
              </svg>
            </button>

            <button
              className={`control-btn ${screenSharing ? 'active' : ''}`}
              onClick={handleScreenShare}
              aria-label="Share screen"
              data-tooltip="Share screen"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="12" rx="2" ry="2" />
                <path d="M8 21h8" />
                <path d="M12 17l-3-3 3-3" />
              </svg>
            </button>

            <div className="control-divider" aria-hidden="true" />

            <button
              className="control-btn leave"
              onClick={handleLeave}
              aria-label="Leave call"
              data-tooltip="Leave call"
            >
              Leave
            </button>
          </div>
        </div>

        <aside className="meeting-sidebar">
          <div className="sidebar-tabs">
              <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
              Chat
            </button>
            <button className={activeTab === 'notes' ? 'active' : ''} onClick={() => setActiveTab('notes')}>
              Notes
            </button>
            <button className={activeTab === 'whiteboard' ? 'active' : ''} onClick={() => setActiveTab('whiteboard')}>
              Board
            </button>
            <button className={activeTab === 'files' ? 'active' : ''} onClick={() => setActiveTab('files')}>
              Files
            </button>
            <button className={activeTab === 'forge' ? 'active' : ''} onClick={() => setActiveTab('forge')}>
              Forge
            </button>
            <button className={activeTab === 'focus-hub' ? 'active' : ''} onClick={() => setActiveTab('focus-hub')}>
              Focus Hub
            </button>
          </div>
          <div className="sidebar-panel">
            {activeTab === 'chat' && <ChatPanel messages={messages} onSend={sendMessage} />}
            {activeTab === 'notes' && <NotesPanel socket={socket} roomId={roomId} user={user} />}
            {activeTab === 'whiteboard' && <WhiteboardPanel socket={socket} />}
            {activeTab === 'files' && <FilePanel roomId={roomId} socket={socket} />}
            {activeTab === 'forge' && <ForgePanel socket={socket} participants={participants} user={user} roomId={roomId} />}
            {activeTab === 'focus-hub' && <FocusHubPanel socket={socket} user={user} />}
          </div>
        </aside>
      </div>
    </div>
  );
}
