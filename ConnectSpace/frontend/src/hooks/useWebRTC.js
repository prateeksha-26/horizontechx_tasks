import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(socket, roomId, localStream) {
  const peersRef = useRef(new Map());
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [screenSharing, setScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);

  const updateRemoteStreams = useCallback(() => {
    const streams = new Map();
    peersRef.current.forEach((peer, socketId) => {
      const receivers = peer.getReceivers();
      const tracks = receivers.map((r) => r.track).filter(Boolean);
      if (tracks.length > 0) {
        const stream = new MediaStream(tracks);
        streams.set(socketId, stream);
      }
    });
    setRemoteStreams(new Map(streams));
  }, []);

  const createPeerConnection = useCallback(
    (targetSocketId, isInitiator) => {
      if (peersRef.current.has(targetSocketId)) {
        return peersRef.current.get(targetSocketId);
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.ontrack = () => {
        updateRemoteStreams();
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          peersRef.current.delete(targetSocketId);
          updateRemoteStreams();
        }
      };

      peersRef.current.set(targetSocketId, pc);

      if (isInitiator && socket) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('offer', {
              targetSocketId,
              offer: pc.localDescription,
            });
          })
          .catch(console.error);
      }

      return pc;
    },
    [socket, localStream, updateRemoteStreams]
  );

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleExistingUsers = ({ users }) => {
      users.forEach(({ socketId }) => {
        createPeerConnection(socketId, true);
      });
    };

    const handleUserJoined = ({ socketId }) => {
      createPeerConnection(socketId, false);
    };

    const handleUserLeft = ({ socketId }) => {
      const pc = peersRef.current.get(socketId);
      if (pc) {
        pc.close();
        peersRef.current.delete(socketId);
        updateRemoteStreams();
      }
    };

    const handleOffer = async ({ offer, senderSocketId }) => {
      const pc = createPeerConnection(senderSocketId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { targetSocketId: senderSocketId, answer: pc.localDescription });
    };

    const handleAnswer = async ({ answer, senderSocketId }) => {
      const pc = peersRef.current.get(senderSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ candidate, senderSocketId }) => {
      const pc = peersRef.current.get(senderSocketId);
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on('existing-users', handleExistingUsers);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.off('existing-users', handleExistingUsers);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [socket, roomId, createPeerConnection, updateRemoteStreams]);

  useEffect(() => {
    if (!localStream) return;
    peersRef.current.forEach((pc) => {
      const senders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = screenStream;
      setScreenSharing(true);
      socket?.emit('screen-share-started');

      const screenTrack = screenStream.getVideoTracks()[0];
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = () => stopScreenShare();
      return screenStream;
    } catch (err) {
      console.error('Screen share failed:', err);
      return null;
    }
  }, [socket]);

  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setScreenSharing(false);
    socket?.emit('screen-share-stopped');

    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
      }
    }
  }, [socket, localStream]);

  const toggleAudio = useCallback(
    (enabled) => {
      localStream?.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
      socket?.emit('toggle-media', {
        audio: enabled,
        video: localStream?.getVideoTracks()[0]?.enabled,
      });
    },
    [localStream, socket]
  );

  const toggleVideo = useCallback(
    (enabled) => {
      localStream?.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
      socket?.emit('toggle-media', {
        audio: localStream?.getAudioTracks()[0]?.enabled,
        video: enabled,
      });
    },
    [localStream, socket]
  );

  useEffect(() => {
    return () => {
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    remoteStreams,
    screenSharing,
    startScreenShare,
    stopScreenShare,
    toggleAudio,
    toggleVideo,
  };
}

export function useSocket(roomId) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return;

    const s = io(API_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setConnected(true);
      s.emit('join-room', { roomId });
    });

    s.on('disconnect', () => setConnected(false));
    s.on('room-users', ({ participants: p }) => setParticipants(p));
    s.on('chat-message', (msg) => setMessages((prev) => [...prev, msg]));

    setSocket(s);

    return () => {
      s.emit('leave-room');
      s.disconnect();
      setSocket(null);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (message) => {
      socket?.emit('chat-message', { message });
    },
    [socket]
  );

  return { socket, connected, participants, messages, sendMessage };
}
