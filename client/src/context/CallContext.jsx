import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import PeerManager from '../../services/peer.js';

// Create context
const CallContext = createContext();

// Custom hook for consumers
export const useCall = () => useContext(CallContext);

// Utility for setting token
const setAxiosAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['token'] = token;
  } else {
    delete axios.defaults.headers.common['token'];
  }
};

export const CallProvider = ({ children }) => {
  const { socket, authUser, token } = useContext(AuthContext);

  // Call state
  const [call, setCall] = useState({
    status: 'none',
    conversationId: null,
    callerInfo: null,
    participants: [],
    startedAt: null
  });

  // Stream/media state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  // Controls
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Loading indicators
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [isJoiningCall, setIsJoiningCall] = useState(false);
  const [isLeavingCall, setIsLeavingCall] = useState(false);

  // PeerManager reference
  const peerManagerRef = useRef(null);

  // --- Effects ---

  // Sync Axios auth header
  useEffect(() => {
    setAxiosAuthToken(token);
  }, [token]);

  // PeerManager Setup
  useEffect(() => {
    if (socket && !peerManagerRef.current) {
      peerManagerRef.current = new PeerManager(socket);

      peerManagerRef.current.onRemoteStream = (participantId, stream) => {
        setRemoteStreams(prev => new Map(prev).set(participantId, stream));
      };
      peerManagerRef.current.onPeerRemoved = (participantId) => {
        setRemoteStreams(prev => {
          const updated = new Map(prev);
          updated.delete(participantId);
          return updated;
        });
      };
      peerManagerRef.current.onConnectionStateChange = (participantId, state) => {
        // Optional: handle connection state
      };
    }
    return () => {
      if (peerManagerRef.current) {
        peerManagerRef.current.closeAllConnections();
        peerManagerRef.current = null;
      }
    };
  }, [socket]);

  // Media tracks sync with toggle states
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => (track.enabled = isAudioEnabled));
      localStream.getVideoTracks().forEach(track => (track.enabled = isVideoEnabled));
    }
  }, [localStream, isAudioEnabled, isVideoEnabled]);

  // Update peer manager with local stream
  useEffect(() => {
    if (peerManagerRef.current && localStream) {
      peerManagerRef.current.setLocalStream(localStream);
    }
  }, [localStream]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({ conversationId, callerId, callerInfo }) => {
      setCall({
        status: 'receiving',
        conversationId,
        callerInfo,
        participants: [callerId],
        startedAt: new Date()
      });
    };
    const handleParticipantJoined = ({ participantId, conversationId }) => {
      if (peerManagerRef.current && participantId !== authUser._id) {
        peerManagerRef.current.createPeer(participantId, true);
      }
      setCall(prev => ({
        ...prev,
        participants: [...prev.participants.filter(p => p !== participantId), participantId]
      }));
    };
    const handleParticipantLeft = ({ participantId }) => {
      if (peerManagerRef.current) {
        peerManagerRef.current.removePeer(participantId);
      }
      setCall(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p !== participantId)
      }));
    };
    const handleCallEnded = () => {
      closeAllConnections();
    };
    const handleCallRejected = () => {
      // Optionally handle
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('participant-joined', handleParticipantJoined);
    socket.on('participant-left', handleParticipantLeft);
    socket.on('call-ended', handleCallEnded);
    socket.on('end-call', handleCallEnded);
    socket.on('call-rejected', handleCallRejected);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('participant-joined', handleParticipantJoined);
      socket.off('participant-left', handleParticipantLeft);
      socket.off('call-ended', handleCallEnded);
      socket.off('end-call', handleCallEnded);
      socket.off('call-rejected', handleCallRejected);
    };
  }, [socket, authUser]);

  // Cleanup on unmount
  useEffect(() => () => closeAllConnections(), []);

  // --- Utility Functions ---

  const resetCallState = () => {
    setCall({ status: 'none', conversationId: null, callerInfo: null, participants: [], startedAt: null });
    setRemoteStreams(new Map());
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    setIsStartingCall(false);
    setIsJoiningCall(false);
    setIsLeavingCall(false);
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoEnabled, audio: isAudioEnabled });
      setLocalStream(stream);
      if (peerManagerRef.current) peerManagerRef.current.setLocalStream(stream);
      return stream;
    } catch (error) {
      throw new Error('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const closeAllConnections = () => {
    stopLocalStream();
    if (peerManagerRef.current) peerManagerRef.current.closeAllConnections();
    resetCallState();
  };

  // --- API ---

  const getCallStatus = async (conversationId) => {
    try {
      const response = await axios.get(`/api/calls/status/${conversationId}`, { params: { userId: authUser._id } });
      return response.data;
    } catch {
      return null;
    }
  };

  // --- Call Lifecycle ---

  const startCall = async (conversationId) => {
    if (!authUser || isStartingCall) return;
    try {
      setIsStartingCall(true);
      setCall({ status: 'initiating', conversationId, callerInfo: null, participants: [], startedAt: null });
      const stream = await startLocalStream();
      if (!stream) throw new Error('Failed to access media devices');
      const requestData = {
        userId: authUser._id,
        callerInfo: { name: authUser.fullname, avatar: authUser.profilePic || null }
      };
      const response = await axios.post(`/api/calls/start/${conversationId}`, requestData);
      if (response.data.success) {
        setCall(prev => ({
          ...prev,
          status: 'active',
          participants: [authUser._id],
          startedAt: response.data.callInfo?.startedAt || new Date()
        }));
        if (socket) {
          socket.emit('join-call', { conversationId, userId: authUser._id });
        }
        return { success: true };
      }
      throw new Error(response.data.message || 'Failed to start call');
    } catch (error) {
      setCall({ status: 'error', conversationId: null, callerInfo: null, participants: [], startedAt: null });
      stopLocalStream();
      return { success: false, error: error.response?.data?.message || error.message };
    } finally {
      setIsStartingCall(false);
    }
  };

  const acceptCall = async () => {
    if (!call.conversationId || isJoiningCall) return;
    try {
      setIsJoiningCall(true);
      const stream = await startLocalStream();
      if (!stream) throw new Error('Failed to access media devices');
      setCall(prev => ({ ...prev, status: 'active' }));
      if (socket) {
        socket.emit('join-call', { conversationId: call.conversationId, userId: authUser._id });
      }
      return { success: true };
    } catch (error) {
      setCall(prev => ({ ...prev, status: 'error' }));
      return { success: false, error: error.message };
    } finally {
      setIsJoiningCall(false);
    }
  };

  const rejectCall = async () => {
    if (!call.conversationId) return;
    try {
      if (socket) {
        socket.emit('reject-call', { conversationId: call.conversationId, userId: authUser._id });
      }
      closeAllConnections();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const leaveCall = async () => {
    if (!call.conversationId || isLeavingCall) return;
    try {
      setIsLeavingCall(true);
      try {
        await axios.post(`/api/calls/leave/${call.conversationId}`, { userId: authUser._id });
      } catch (apiError) {
        // Ignore API error, continue cleanup
      }
      if (socket) {
        socket.emit('leave-call', { conversationId: call.conversationId, userId: authUser._id });
      }
      closeAllConnections();
      return { success: true };
    } catch (error) {
      closeAllConnections();
      return { success: false, error: error.message };
    } finally {
      setIsLeavingCall(false);
    }
  };

  const endCall = async () => {
    if (!call.conversationId) return;
    try {
      await axios.post(`/api/calls/end/${call.conversationId}`, { userId: authUser._id });
      if (socket) {
        socket.emit('end-call', { conversationId: call.conversationId, userId: authUser._id });
      }
      closeAllConnections();
      return { success: true };
    } catch (error) {
      closeAllConnections();
      return { success: false, error: error.message };
    }
  };

  // --- Media Control ---

  const toggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    if (localStream) {
      localStream.getAudioTracks().forEach(track => { track.enabled = newState; });
    }
    if (peerManagerRef.current) peerManagerRef.current.toggleAudio(newState);
    return newState;
  };

  const toggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    if (localStream) {
      localStream.getVideoTracks().forEach(track => { track.enabled = newState; });
    }
    if (peerManagerRef.current) peerManagerRef.current.toggleVideo(newState);
    return newState;
  };

  // --- Context Value ---

  const value = {
    call,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    isStartingCall,
    isJoiningCall,
    isLeavingCall,
    startCall,
    acceptCall,
    rejectCall,
    leaveCall,
    endCall,
    getCallStatus,
    closeAllConnections
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};

export default CallProvider;
