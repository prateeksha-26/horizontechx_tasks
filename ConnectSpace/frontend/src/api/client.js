const API_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data;
}

export const api = {
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  createRoom: (body) => request('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  getRoom: (roomId) => request(`/api/rooms/${roomId}`),
  joinRoom: (roomId) => request(`/api/rooms/${roomId}/join`, { method: 'POST' }),
  getFiles: (roomId) => request(`/api/files/${roomId}`),
  uploadFile: (roomId, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/api/files/${roomId}`, { method: 'POST', body: form });
  },
  getRecaps: () => request('/api/recaps'),
  getRecap: (recapId) => request(`/api/recaps/${recapId}`),
  downloadFile: (fileId) => `${API_URL}/api/files/download/${fileId}`,
  getUserSessions: () => request('/api/users/me/sessions'),
  getUserRooms: () => request('/api/users/me/rooms'),
  getVideoNotes: (roomId) => request(`/api/rooms/${roomId}/notes`),
  uploadVideoNote: (roomId, videoBlob, durationSeconds, attachedTo = 'room') => {
    const form = new FormData();
    form.append('video', videoBlob, 'video.webm');
    form.append('durationSeconds', durationSeconds);
    form.append('attachedTo', attachedTo);
    return request(`/api/rooms/${roomId}/notes`, { method: 'POST', body: form });
  },
  addVideoReply: (roomId, noteId, text) =>
    request(`/api/rooms/${roomId}/notes/${noteId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  getVideoStream: (roomId, noteId) => `${API_URL}/api/rooms/${roomId}/notes/${noteId}/video`,
};

export { API_URL };
