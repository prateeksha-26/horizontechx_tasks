import { useEffect, useRef } from 'react';

export default function VideoTile({ stream, name, isLocal, muted = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream?.getVideoTracks().some((t) => t.enabled);

  return (
    <div className={`video-tile ${isLocal ? 'local' : ''}`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={muted || isLocal} />
      ) : (
        <div className="no-video">{name?.charAt(0)?.toUpperCase() || '?'}</div>
      )}
      <span className="label">{name}{isLocal ? ' (You)' : ''}</span>
    </div>
  );
}
