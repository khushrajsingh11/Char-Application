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
    startedAt: null,
    startedBy: null
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
      console.log('Initializing PeerManager');
      peerManagerRef.current = new PeerManager(socket);

      // Handle remote stream
      peerManagerRef.current.onRemoteStream = (participantId, stream) => {
        console.log('CallContext: Remote stream received:', { participantId, stream });
        console.log('Stream tracks:', stream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          id: t.id
        })));
        
        setRemoteStreams(prev => {
          const updated = new Map(prev);
          updated.set(participantId, stream);
          console.log('CallContext: Updated remote streams count:', updated.size);
          return updated;
        });
      };

      // Handle peer removal
      peerManagerRef.current.onPeerRemoved = (participantId) => {
        console.log('CallContext: Peer removed:', participantId);
        setRemoteStreams(prev => {
          const updated = new Map(prev);
          updated.delete(participantId);
          console.log('CallContext: Remote streams after removal:', updated.size);
          return updated;
        });
      };

      // Handle connection state changes
      peerManagerRef.current.onConnectionStateChange = (participantId, state) => {
        console.log(`CallContext: Peer ${participantId} connection state: ${state}`);
        
        // Optional: Update UI based on connection state
        if (state === 'connected') {
          console.log(`Peer ${participantId} successfully connected`);
        } else if (state === 'failed' || state === 'disconnected') {
          console.warn(`Peer ${participantId} connection ${state}`);
        }
      };
    }

    return () => {
      if (peerManagerRef.current) {
        console.log('Cleaning up PeerManager');
        peerManagerRef.current.closeAllConnections();
        peerManagerRef.current = null;
      }
    };
  }, [socket]);

  // Media tracks sync with toggle states
  useEffect(() => {
    if (localStream) {
      console.log('Syncing media tracks with toggle states:', { isAudioEnabled, isVideoEnabled });
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isAudioEnabled;
      });
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoEnabled;
      });
    }
  }, [localStream, isAudioEnabled, isVideoEnabled]);

  // Update peer manager with local stream
  useEffect(() => {
    if (peerManagerRef.current && localStream) {
      console.log('Setting local stream in PeerManager');
      peerManagerRef.current.setLocalStream(localStream);
    }
  }, [localStream]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !authUser) return;

    console.log('Setting up socket event handlers');

    // Call management events
    const handleIncomingCall = ({ conversationId, callerId, callerInfo }) => {
      console.log('Incoming call:', { conversationId, callerId, callerInfo });
      setCall({
        status: 'receiving',
        conversationId,
        callerInfo,
        participants: [callerId],
        startedAt: new Date(),
        startedBy: callerId
      });
    };

    const handleParticipantJoined = ({ participantId, conversationId }) => {
      console.log('Participant joined:', { participantId, conversationId });
      
      if (participantId !== authUser._id && peerManagerRef.current) {
        // Create peer connection for the new participant
        // The current user initiates the connection
        peerManagerRef.current.createPeer(participantId, true);
      }
      
      setCall(prev => ({
        ...prev,
        participants: [...prev.participants.filter(p => p !== participantId), participantId]
      }));
    };

    const handleParticipantLeft = ({ participantId }) => {
      console.log('Participant left:', participantId);
      
      if (peerManagerRef.current) {
        peerManagerRef.current.removePeer(participantId);
      }
      
      setCall(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p !== participantId)
      }));
    };

    const handleCallEnded = ({ endedBy } = {}) => {
      console.log('Call ended by:', endedBy);
      closeAllConnections();
    };

    const handleCallRejected = ({ rejectedBy } = {}) => {
      console.log('Call rejected by:', rejectedBy);
      closeAllConnections();
    };

    // WebRTC signaling events
    const handleOffer = async ({ offer, from, to }) => {
      console.log('Received offer:', { from, to: authUser._id });
      if (peerManagerRef.current && to === authUser._id) {
        await peerManagerRef.current.handleOffer(from, offer);
      }
    };

    const handleAnswer = async ({ answer, from, to }) => {
      console.log('Received answer:', { from, to: authUser._id });
      if (peerManagerRef.current && to === authUser._id) {
        await peerManagerRef.current.handleAnswer(from, answer);
      }
    };

    const handleIceCandidate = async ({ candidate, from, to }) => {
      console.log('Received ICE candidate:', { from, to: authUser._id });
      if (peerManagerRef.current && to === authUser._id) {
        await peerManagerRef.current.handleIceCandidate(from, candidate);
      }
    };

    // Register event listeners
    socket.on('incoming-call', handleIncomingCall);
    socket.on('participant-joined', handleParticipantJoined);
    socket.on('participant-left', handleParticipantLeft);
    socket.on('call-ended', handleCallEnded);
    socket.on('end-call', handleCallEnded);
    socket.on('call-rejected', handleCallRejected);
    
    // WebRTC signaling events
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      console.log('Cleaning up socket event handlers');
      socket.off('incoming-call', handleIncomingCall);
      socket.off('participant-joined', handleParticipantJoined);
      socket.off('participant-left', handleParticipantLeft);
      socket.off('call-ended', handleCallEnded);
      socket.off('end-call', handleCallEnded);
      socket.off('call-rejected', handleCallRejected);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [socket, authUser]);

  // Cleanup on unmount
  useEffect(() => () => {
    console.log('CallProvider unmounting');
    closeAllConnections();
  }, []);

  // --- Utility Functions ---

  const resetCallState = () => {
    console.log('Resetting call state');
    setCall({ 
      status: 'none', 
      conversationId: null, 
      callerInfo: null, 
      participants: [], 
      startedAt: null, 
      startedBy: null 
    });
    setRemoteStreams(new Map());
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    setIsStartingCall(false);
    setIsJoiningCall(false);
    setIsLeavingCall(false);
  };

  const startLocalStream = async () => {
    try {
      console.log('Starting local stream with constraints:', { 
        video: isVideoEnabled, 
        audio: isAudioEnabled 
      });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isVideoEnabled, 
        audio: isAudioEnabled 
      });
      
      console.log('Local stream obtained:', stream);
      console.log('Local stream tracks:', stream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        id: t.id
      })));
      
      setLocalStream(stream);
      
      if (peerManagerRef.current) {
        peerManagerRef.current.setLocalStream(stream);
      }
      
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      console.log('Stopping local stream');
      localStream.getTracks().forEach(track => {
        console.log(`Stopping ${track.kind} track:`, track.id);
        track.stop();
      });
      setLocalStream(null);
    }
  };

  const closeAllConnections = () => {
    console.log('Closing all connections');
    stopLocalStream();
    if (peerManagerRef.current) {
      peerManagerRef.current.closeAllConnections();
    }
    resetCallState();
  };

  // --- API ---

  const getCallStatus = async (conversationId) => {
    try {
      console.log('Getting call status for:', conversationId);
      const response = await axios.get(`/api/calls/status/${conversationId}`, { 
        params: { userId: authUser._id } 
      });
      console.log('Call status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting call status:', error);
      return null;
    }
  };

  // --- Call Lifecycle ---

  const startCall = async (conversationId) => {
    if (!authUser || isStartingCall) {
      console.warn('Cannot start call: user not authenticated or already starting');
      return { success: false, error: 'Cannot start call at this time' };
    }

    try {
      console.log('Starting call for conversation:', conversationId);
      setIsStartingCall(true);
      
      setCall({ 
        status: 'initiating', 
        conversationId, 
        callerInfo: null, 
        participants: [], 
        startedAt: null,
        startedBy: authUser._id
      });

      const stream = await startLocalStream();
      if (!stream) {
        throw new Error('Failed to access media devices');
      }

      const requestData = {
        userId: authUser._id,
        callerInfo: { 
          name: authUser.fullname, 
          avatar: authUser.profilePic || null 
        }
      };

      console.log('Sending start call request:', requestData);
      const response = await axios.post(`/api/calls/start/${conversationId}`, requestData);
      
      if (response.data.success) {
        console.log('Call started successfully:', response.data);
        
        setCall(prev => ({
          ...prev,
          status: 'active',
          participants: [authUser._id],
          startedAt: response.data.callInfo?.startedAt || new Date(),
          startedBy: authUser._id
        }));

        if (socket) {
          console.log('Joining call room:', conversationId);
          socket.emit('join-call', { 
            conversationId, 
            userId: authUser._id 
          });
        }

        return { success: true };
      }

      throw new Error(response.data.message || 'Failed to start call');
    } catch (error) {
      console.error('Error starting call:', error);
      setCall({ 
        status: 'error', 
        conversationId: null, 
        callerInfo: null, 
        participants: [], 
        startedAt: null,
        startedBy: null
      });
      stopLocalStream();
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    } finally {
      setIsStartingCall(false);
    }
  };

  const acceptCall = async () => {
    if (!call.conversationId || isJoiningCall) {
      console.warn('Cannot accept call: no active call or already joining');
      return { success: false, error: 'Cannot accept call at this time' };
    }

    try {
      console.log('Accepting call:', call.conversationId);
      setIsJoiningCall(true);
      
      const stream = await startLocalStream();
      if (!stream) {
        throw new Error('Failed to access media devices');
      }

      setCall(prev => ({ ...prev, status: 'active' }));

      if (socket) {
        console.log('Joining call room after accepting:', call.conversationId);
        socket.emit('join-call', { 
          conversationId: call.conversationId, 
          userId: authUser._id 
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error accepting call:', error);
      setCall(prev => ({ ...prev, status: 'error' }));
      return { success: false, error: error.message };
    } finally {
      setIsJoiningCall(false);
    }
  };

  const rejectCall = async () => {
    if (!call.conversationId) {
      console.warn('Cannot reject call: no active call');
      return { success: false, error: 'No active call to reject' };
    }

    try {
      console.log('Rejecting call:', call.conversationId);
      
      if (socket) {
        socket.emit('reject-call', { 
          conversationId: call.conversationId, 
          userId: authUser._id 
        });
      }

      closeAllConnections();
      return { success: true };
    } catch (error) {
      console.error('Error rejecting call:', error);
      closeAllConnections();
      return { success: false, error: error.message };
    }
  };

  const leaveCall = async () => {
    if (!call.conversationId || isLeavingCall) {
      console.warn('Cannot leave call: no active call or already leaving');
      return { success: false, error: 'Cannot leave call at this time' };
    }

    try {
      console.log('Leaving call:', call.conversationId);
      setIsLeavingCall(true);
      
      // Attempt to notify server (ignore errors)
      try {
        await axios.post(`/api/calls/leave/${call.conversationId}`, { 
          userId: authUser._id 
        });
      } catch (apiError) {
        console.warn('API call to leave failed (continuing cleanup):', apiError);
      }

      if (socket) {
        socket.emit('leave-call', { 
          conversationId: call.conversationId, 
          userId: authUser._id 
        });
      }

      closeAllConnections();
      return { success: true };
    } catch (error) {
      console.error('Error leaving call:', error);
      closeAllConnections();
      return { success: false, error: error.message };
    } finally {
      setIsLeavingCall(false);
    }
  };

  const endCall = async () => {
    if (!call.conversationId) {
      console.warn('Cannot end call: no active call');
      return { success: false, error: 'No active call to end' };
    }

    try {
      console.log('Ending call:', call.conversationId);
      
      await axios.post(`/api/calls/end/${call.conversationId}`, { 
        userId: authUser._id 
      });

      if (socket) {
        socket.emit('end-call', { 
          conversationId: call.conversationId, 
          userId: authUser._id 
        });
      }

      closeAllConnections();
      return { success: true };
    } catch (error) {
      console.error('Error ending call:', error);
      closeAllConnections();
      return { success: false, error: error.message };
    }
  };

  // --- Media Control ---

  const toggleAudio = () => {
    const newState = !isAudioEnabled;
    console.log('Toggling audio:', newState);
    
    setIsAudioEnabled(newState);
    
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
    }
    
    if (peerManagerRef.current) {
      peerManagerRef.current.toggleAudio(newState);
    }
    
    return newState;
  };

  const toggleVideo = () => {
    const newState = !isVideoEnabled;
    console.log('Toggling video:', newState);
    
    setIsVideoEnabled(newState);
    
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
    }
    
    if (peerManagerRef.current) {
      peerManagerRef.current.toggleVideo(newState);
    }
    
    return newState;
  };

  // Debug function to get peer states
  const getPeerDebugInfo = () => {
    if (peerManagerRef.current) {
      return {
        peerStates: peerManagerRef.current.getPeerStates(),
        remoteStreamsCount: remoteStreams.size,
        localStreamTracks: localStream ? localStream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState
        })) : []
      };
    }
    return null;
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
    closeAllConnections,
    getPeerDebugInfo // For debugging
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};

export default CallProvider;
