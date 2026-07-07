import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import VideoRecorderModal from './VideoRecorderModal.jsx';
import './NotesPanel.css';

export default function NotesPanel({ socket, roomId, user }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [replyTexts, setReplyTexts] = useState({});
  const [submittingReplies, setSubmittingReplies] = useState(new Set());
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Load initial notes
  useEffect(() => {
    loadNotes();
  }, [roomId]);

  // Listen for new notes
  useEffect(() => {
    if (!socket) return;

    const onNewNote = (noteData) => {
      loadNotes();
    };

    const onNewReply = ({ noteId, reply }) => {
      setNotes((prev) =>
        prev.map((note) =>
          note._id === noteId
            ? { ...note, replies: [...(note.replies || []), reply] }
            : note
        )
      );
    };

    socket.on('new-video-note', onNewNote);
    socket.on('new-video-reply', onNewReply);

    return () => {
      socket.off('new-video-note', onNewNote);
      socket.off('new-video-reply', onNewReply);
    };
  }, [socket]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getVideoNotes(roomId);
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordingSubmit = async (blob, durationSeconds) => {
    try {
      setUploadingVideo(true);
      await api.uploadVideoNote(roomId, blob, durationSeconds, 'room');
      setShowRecorder(false);
      loadNotes();
      // Show success feedback
      if (window.showToast) {
        window.showToast('Note left for your team', 'success');
      } else {
        console.log('Video note uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading video note:', error);
      if (window.showToast) {
        window.showToast('Failed to save note', 'error');
      }
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleReplySubmit = async (noteId) => {
    const text = replyTexts[noteId];
    if (!text || !text.trim()) return;

    try {
      setSubmittingReplies((prev) => new Set([...prev, noteId]));
      await api.addVideoReply(roomId, noteId, text);
      setReplyTexts((prev) => ({ ...prev, [noteId]: '' }));
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setSubmittingReplies((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }
  };

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return d.toLocaleDateString();
  };

  const getInitial = (name) => {
    return (name || 'U')[0].toUpperCase();
  };

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <h3>Video Notes</h3>
        <button className="leave-note-btn" onClick={() => setShowRecorder(true)}>
          <span className="plus-icon">+</span>
          Leave a Note
        </button>
      </div>

      <div className="notes-list">
        {loading && <div className="notes-loading">Loading notes...</div>}

        {!loading && notes.length === 0 && (
          <div className="notes-empty">
            <div className="empty-icon">🎬</div>
            <p>No video notes yet</p>
            <p className="empty-hint">Be the first to leave a note!</p>
          </div>
        )}

        {notes.map((note) => (
          <div key={note._id} className="note-card">
            <div className="note-header">
              <div className="note-author-info">
                <div className="note-avatar">{getInitial(note.authorName)}</div>
                <div className="note-meta">
                  <div className="note-author">{note.authorName}</div>
                  <div className="note-time">{formatDate(note.createdAt)}</div>
                </div>
              </div>
              <div className="note-duration">{formatTime(note.durationSeconds)}</div>
            </div>

            <div className="note-video-container">
              <video
                src={api.getVideoStream(roomId, note._id)}
                className="note-video-thumbnail"
                onClick={() =>
                  setExpandedNoteId(
                    expandedNoteId === note._id ? null : note._id
                  )
                }
              />
              <button className="note-play-btn">
                <span>▶</span>
              </button>
            </div>

            {expandedNoteId === note._id && (
              <div className="note-expanded">
                <video
                  src={api.getVideoStream(roomId, note._id)}
                  controls
                  autoPlay
                  className="note-video-expanded"
                />
              </div>
            )}

            <div className="note-replies">
              {note.replies && note.replies.length > 0 && (
                <div className="replies-list">
                  {note.replies.map((reply, idx) => (
                    <div key={idx} className="reply-item">
                      <div className="reply-author">{reply.authorName}</div>
                      <div className="reply-text">{reply.text}</div>
                      <div className="reply-time">
                        {formatDate(reply.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="reply-input-group">
                <input
                  type="text"
                  placeholder="Reply to this note..."
                  value={replyTexts[note._id] || ''}
                  onChange={(e) =>
                    setReplyTexts((prev) => ({
                      ...prev,
                      [note._id]: e.target.value,
                    }))
                  }
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReplySubmit(note._id);
                    }
                  }}
                  className="reply-input"
                  disabled={submittingReplies.has(note._id)}
                />
                <button
                  className="reply-submit"
                  onClick={() => handleReplySubmit(note._id)}
                  disabled={
                    submittingReplies.has(note._id) ||
                    !replyTexts[note._id]?.trim()
                  }
                >
                  {submittingReplies.has(note._id) ? '...' : '→'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showRecorder && (
        <VideoRecorderModal
          onClose={() => setShowRecorder(false)}
          onSubmit={handleRecordingSubmit}
        />
      )}
    </div>
  );
}
