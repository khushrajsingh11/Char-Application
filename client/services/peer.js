// src/services/peer.js
class PeerManager {
  constructor(socket) {
    this.socket = socket;
    this.peers = new Map();
    this.localStream = null;
    this.onRemoteStream = null;
    this.onPeerRemoved = null;
    this.onConnectionStateChange = null;

    // STUN servers for NAT traversal
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    console.log('PeerManager initialized');
  }

  setLocalStream(stream) {
    console.log('Setting local stream:', stream);
    console.log('Local stream tracks:', stream.getTracks().map(t => ({
      kind: t.kind,
      enabled: t.enabled,
      id: t.id
    })));

    this.localStream = stream;
    
    // Add stream to all existing peers
    this.peers.forEach((peer, participantId) => {
      if (peer.connection && peer.connection.connectionState !== 'closed') {
        console.log(`Adding tracks to existing peer: ${participantId}`);
        stream.getTracks().forEach(track => {
          try {
            const sender = peer.connection.addTrack(track, stream);
            console.log(`Added ${track.kind} track to peer ${participantId}:`, sender);
          } catch (error) {
            console.error(`Error adding track to peer ${participantId}:`, error);
          }
        });
      }
    });
  }

  async createPeer(participantId, isInitiator = false) {
    console.log(`Creating peer for ${participantId}, initiator: ${isInitiator}`);
    
    // Remove existing peer if it exists
    if (this.peers.has(participantId)) {
      console.log(`Removing existing peer for ${participantId}`);
      this.removePeer(participantId);
    }

    const peerConnection = new RTCPeerConnection(this.configuration);
    
    const peer = {
      connection: peerConnection,
      participantId,
      isInitiator,
      dataChannel: null
    };
    
    this.peers.set(participantId, peer);

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log(`Received remote track from ${participantId}:`, event.track.kind);
      console.log('Track details:', {
        kind: event.track.kind,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        id: event.track.id
      });

      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams;
        console.log(`Remote stream received from ${participantId}:`, remoteStream);
        console.log('Remote stream tracks:', remoteStream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          id: t.id
        })));

        if (this.onRemoteStream) {
          this.onRemoteStream(participantId, remoteStream);
        }
      } else {
        console.warn(`No streams in track event from ${participantId}`);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${participantId}:`, event.candidate.type);
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: participantId
        });
      } else {
        console.log(`ICE gathering complete for ${participantId}`);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`Peer ${participantId} connection state: ${state}`);
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(participantId, state);
      }

      // Clean up if connection fails or closes
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        setTimeout(() => {
          if (peerConnection.connectionState === state) {
            console.log(`Cleaning up failed connection for ${participantId}`);
            this.removePeer(participantId);
          }
        }, 5000); // Wait 5 seconds before cleanup
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${participantId}: ${peerConnection.iceConnectionState}`);
    };

    // Handle signaling state changes
    peerConnection.onsignalingstatechange = () => {
      console.log(`Signaling state for ${participantId}: ${peerConnection.signalingState}`);
    };

    // Add local stream if available
    if (this.localStream) {
      console.log(`Adding local stream to peer ${participantId}`);
      this.localStream.getTracks().forEach(track => {
        try {
          const sender = peerConnection.addTrack(track, this.localStream);
          console.log(`Added ${track.kind} track to peer ${participantId}:`, sender);
        } catch (error) {
          console.error(`Error adding ${track.kind} track to peer ${participantId}:`, error);
        }
      });
    } else {
      console.warn(`No local stream available when creating peer for ${participantId}`);
    }

    // Create data channel for additional communication (optional)
    if (isInitiator) {
      try {
        peer.dataChannel = peerConnection.createDataChannel('chat', {
          ordered: true
        });
        console.log(`Data channel created for ${participantId}`);
      } catch (error) {
        console.error(`Error creating data channel for ${participantId}:`, error);
      }
    }

    // Handle incoming data channels
    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      console.log(`Data channel received from ${participantId}`);
      peer.dataChannel = dataChannel;
    };

    // Create offer if initiator
    if (isInitiator) {
      try {
        console.log(`Creating offer for ${participantId}`);
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        await peerConnection.setLocalDescription(offer);
        console.log(`Sending offer to ${participantId}:`, offer.type);
        
        this.socket.emit('offer', {
          offer,
          to: participantId
        });
      } catch (error) {
        console.error(`Error creating offer for ${participantId}:`, error);
      }
    }

    return peer;
  }

  async handleOffer(participantId, offer) {
    console.log(`Handling offer from ${participantId}:`, offer.type);
    
    let peer = this.peers.get(participantId);
    if (!peer) {
      console.log(`Creating new peer to handle offer from ${participantId}`);
      peer = await this.createPeer(participantId, false);
    }

    try {
      // Set remote description
      await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`Set remote description for ${participantId}`);

      // Create and send answer
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);
      
      console.log(`Sending answer to ${participantId}:`, answer.type);
      this.socket.emit('answer', {
        answer,
        to: participantId
      });
    } catch (error) {
      console.error(`Error handling offer from ${participantId}:`, error);
    }
  }

  async handleAnswer(participantId, answer) {
    console.log(`Handling answer from ${participantId}:`, answer.type);
    
    const peer = this.peers.get(participantId);
    if (peer && peer.connection.signalingState === 'have-local-offer') {
      try {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`Set remote description (answer) for ${participantId}`);
      } catch (error) {
        console.error(`Error handling answer from ${participantId}:`, error);
      }
    } else {
      console.warn(`Invalid state to handle answer from ${participantId}:`, 
        peer ? peer.connection.signalingState : 'peer not found');
    }
  }

  async handleIceCandidate(participantId, candidate) {
    console.log(`Handling ICE candidate from ${participantId}:`, candidate.type);
    
    const peer = this.peers.get(participantId);
    if (peer && peer.connection.remoteDescription) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`Added ICE candidate for ${participantId}`);
      } catch (error) {
        console.error(`Error adding ICE candidate for ${participantId}:`, error);
      }
    } else {
      console.warn(`Cannot add ICE candidate for ${participantId}: peer not ready`);
    }
  }

removePeer(peerId) {
  if (!this.peers.has(peerId)) {
    // Silently ignore if peer doesn't exist
    return false;
  }
  
  try {
    const peer = this.peers.get(peerId);
    if (peer && peer.close) {
      peer.close();
    }
    this.peers.delete(peerId);
    
    if (this.onPeerRemoved) {
      this.onPeerRemoved(peerId);
    }
    
    return true;
  } catch (error) {
    console.error(`Error removing peer ${peerId}:`, error);
    return false;
  }
}

  toggleAudio(enabled) {
    console.log(`Toggling audio: ${enabled}`);
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`Audio track ${track.id} enabled: ${track.enabled}`);
      });
    }

    // Update all peer connections
    this.peers.forEach((peer, participantId) => {
      if (peer.connection) {
        const senders = peer.connection.getSenders();
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = enabled;
            console.log(`Updated audio track for peer ${participantId}: ${enabled}`);
          }
        });
      }
    });
  }

  toggleVideo(enabled) {
    console.log(`Toggling video: ${enabled}`);
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`Video track ${track.id} enabled: ${track.enabled}`);
      });
    }

    // Update all peer connections
    this.peers.forEach((peer, participantId) => {
      if (peer.connection) {
        const senders = peer.connection.getSenders();
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === 'video') {
            sender.track.enabled = enabled;
            console.log(`Updated video track for peer ${participantId}: ${enabled}`);
          }
        });
      }
    });
  }

  // Get connection stats for debugging
  async getConnectionStats(participantId) {
    const peer = this.peers.get(participantId);
    if (peer && peer.connection) {
      try {
        const stats = await peer.connection.getStats();
        return stats;
      } catch (error) {
        console.error(`Error getting stats for ${participantId}:`, error);
        return null;
      }
    }
    return null;
  }

  // Get all peer connection states
  getPeerStates() {
    const states = {};
    this.peers.forEach((peer, participantId) => {
      states[participantId] = {
        connectionState: peer.connection.connectionState,
        iceConnectionState: peer.connection.iceConnectionState,
        signalingState: peer.connection.signalingState,
        iceGatheringState: peer.connection.iceGatheringState
      };
    });
    return states;
  }

  closeAllConnections() {
    console.log('Closing all peer connections');
    console.log(`Total peers to close: ${this.peers.size}`);
    
    this.peers.forEach((peer, participantId) => {
      console.log(`Closing connection for ${participantId}`);
      
      // Close data channel
      if (peer.dataChannel) {
        peer.dataChannel.close();
      }
      
      // Close peer connection
      if (peer.connection) {
        peer.connection.close();
      }
    });
    
    this.peers.clear();
    this.localStream = null;
    console.log('All peer connections closed');
  }
}

export default PeerManager;
