import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import './FilePanel.css';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilePanel({ roomId, socket }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadFiles = useCallback(async () => {
    try {
      const { files: list } = await api.getFiles(roomId);
      setFiles(list);
    } catch (err) {
      console.error(err);
    }
  }, [roomId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (!socket) return;
    const onShared = () => loadFiles();
    socket.on('file-shared', onShared);
    return () => socket.off('file-shared', onShared);
  }, [socket, loadFiles]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { file: record } = await api.uploadFile(roomId, file);
      socket?.emit('file-shared', { file: record });
      await loadFiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function getDownloadUrl(fileId) {
    const token = localStorage.getItem('token');
    return `${api.downloadFile(fileId)}?token=${token}`;
  }

  return (
    <div className="file-panel">
      <div className="file-upload">
        <input type="file" id="file-input" onChange={handleUpload} disabled={uploading} />
        <label htmlFor="file-input">
          {uploading ? 'Uploading...' : '📁 Click to upload a file (max 25MB)'}
        </label>
        {error && <p className="error-msg">{error}</p>}
      </div>
      <div className="file-list">
        {files.length === 0 && (
          <p className="empty-state">
            No files shared yet
          </p>
        )}
        {files.map((f) => (
          <div key={f._id} className="file-item">
            <div>
              <div className="file-name">{f.originalName}</div>
              <div className="file-meta">{formatSize(f.size)} · Encrypted</div>
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                fetch(`/api/files/download/${f._id}`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                })
                  .then((r) => r.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = f.originalName;
                    a.click();
                    URL.revokeObjectURL(url);
                  });
              }}
            >
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
