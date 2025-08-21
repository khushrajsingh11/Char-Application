import React, { useRef, useEffect } from 'react';
import { useCall } from "../../../context/CallContext";
import './VideoCall.css';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';

const VideoCall = ({ conversationInfo, onClose }) => {
  const {
    call,
    localStream,
    remoteStreams,
    leaveCall,
    endCall,
    acceptCall,
    rejectCall,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    Array.from(remoteStreams.entries()).forEach(([id, stream]) => {
      const ref = remoteVideoRefs.current.get(id);
      if (ref) ref.srcObject = stream;
    });
  }, [remoteStreams]);

  const handleToggleMute = () => {
    toggleAudio();
  };

  const handleToggleVideo = () => {
    toggleVideo();
  };

  const handleEndCall = () => {
    if (call.status === "active" && call.participants && call.participants[0] === call.startedBy) {
      endCall();
    } else {
      leaveCall();
    }
    onClose();
  };

  if (call.status === "none") return null;

  return (
    <div className="video-call-overlay">
      <div className="video-call-container">
        <div className="video-call-header">
          <div className="call-info">
            <h3>{conversationInfo?.name || "Call"}</h3>
            <span className="call-status">
              {call.status === "initiating" && "Calling..."}
              {call.status === "receiving" && "Incoming call..."}
              {call.status === "active" && "Connected"}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="video-area">
          <div className="remote-video-group">
            {remoteStreams.size === 0 &&
              <div className="no-remote-video">
                <p>Waiting for other participant...</p>
              </div>
            }
            {Array.from(remoteStreams.entries()).map(([id]) => (
              <video
                key={id}
                ref={el => el && remoteVideoRefs.current.set(id, el)}
                autoPlay
                playsInline
                className="remote-video"
              />
            ))}
          </div>
          <div className="local-video-container">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />
          </div>
        </div>
        <div className="call-controls">
          <button
            className={`control-btn ${!isAudioEnabled ? 'control-btn-active' : ''}`}
            onClick={handleToggleMute}
            title={!isAudioEnabled ? 'Unmute' : 'Mute'}
          >
            {!isAudioEnabled ? <MicOffIcon /> : <MicIcon />}
          </button>
          <button
            className={`control-btn ${!isVideoEnabled ? 'control-btn-active' : ''}`}
            onClick={handleToggleVideo}
            title={!isVideoEnabled ? 'Turn on camera' : 'Turn off camera'}
          >
            {!isVideoEnabled ? <VideocamOffIcon /> : <VideocamIcon />}
          </button>
          <button
            className="control-btn control-btn-end"
            onClick={handleEndCall}
            title="End call"
          >
            <CallEndIcon />
          </button>
        </div>
        {call.status === "receiving" && (
          <div className="incoming-call-overlay">
            <div className="incoming-call-content">
              <h3>Incoming Call</h3>
              <p>{call.callerInfo?.name || "Unknown"}</p>
              <div className="incoming-call-controls">
                <button className="accept-btn" onClick={acceptCall}>Accept</button>
                <button className="reject-btn" onClick={rejectCall}>Decline</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
