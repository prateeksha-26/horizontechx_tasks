import React, { useEffect, useRef, useState } from 'react';
import './VideoRecorderModal.css';

export default function VideoRecorderModal({ onClose, onSubmit }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const MAX_DURATION = 180; // 3 minutes in seconds

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 720 }, height: { ideal: 720 } },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle recording timer
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= MAX_DURATION) {
          stopRecording();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp8,opus',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const reRecord = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
    startRecording();
  };

  const handleSend = async () => {
    if (!recordedBlob) return;

    setIsLoading(true);
    try {
      await onSubmit(recordedBlob, recordingTime);
      onClose();
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = (recordingTime / MAX_DURATION) * 100;

  return (
    <div className="video-recorder-overlay" onClick={onClose}>
      <div className="video-recorder-modal" onClick={(e) => e.stopPropagation()}>
        <button className="recorder-close" onClick={onClose}>
          ✕
        </button>

        {!recordedBlob ? (
          <div className="recorder-recording">
            <h2 className="recorder-title">Leave a Video Note</h2>

            <div className="recorder-preview">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="recorder-video"
              />
            </div>

            <div className="recorder-controls">
              {isRecording ? (
                <button
                  className="record-button recording"
                  onClick={stopRecording}
                >
                  <div className="record-pulse" />
                  Stop
                </button>
              ) : (
                <button className="record-button" onClick={startRecording}>
                  <div className="record-dot" />
                  Record
                </button>
              )}
            </div>

            {isRecording && (
              <div className="recorder-timer">
                <div className="timer-display">{formatTime(recordingTime)}</div>
                <div className="timer-bar">
                  <div
                    className="timer-progress"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="timer-limit">Max 3 minutes</div>
              </div>
            )}
          </div>
        ) : (
          <div className="recorder-preview-mode">
            <h2 className="recorder-title">Preview Your Note</h2>

            <div className="recorder-preview">
              <video
                src={URL.createObjectURL(recordedBlob)}
                controls
                className="recorder-video preview"
              />
            </div>

            <div className="preview-info">
              <span className="preview-duration">
                Duration: {formatTime(recordingTime)}
              </span>
            </div>

            <div className="preview-actions">
              <button
                className="action-button re-record"
                onClick={reRecord}
                disabled={isLoading}
              >
                Re-record
              </button>
              <button
                className="action-button send"
                onClick={handleSend}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Note'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
