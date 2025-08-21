class PeerConnection {
    constructor(participantId, socket, localStream) {
        this.participantId = participantId;
        this.socket = socket;
        this.localStream = localStream;
        this.peerConnection = null;
        this.isInitiator = false;
        this.onRemoteStream = null;
        this.onConnectionStateChange = null;
        
        this.createPeerConnection();
    }

    createPeerConnection() {
        const config = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:19302" }
            ],
            iceCandidatePoolSize: 10,
        };

        this.peerConnection = new RTCPeerConnection(config);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        this.peerConnection.ontrack = (event) => {
            console.log('Remote stream received from:', this.participantId);
            this.onRemoteStream?.(event.streams[0]);
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate to:', this.participantId);
                this.socket.emit('send-ice-candidate', {
                    targetSocketId: this.participantId,
                    candidate: event.candidate
                });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${this.participantId}:`, this.peerConnection.connectionState);
            
            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.onConnectionStateChange?.('connected');
                    break;
                case 'disconnected':
                case 'failed':
                    this.onConnectionStateChange?.('disconnected');
                    break;
                case 'closed':
                    this.onConnectionStateChange?.('closed');
                    break;
            }
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            console.log(`ICE connection state with ${this.participantId}:`, this.peerConnection.iceConnectionState);
        };

        console.log('Peer connection created for:', this.participantId);
    }

    async createOffer() {
        try {
            this.isInitiator = true;
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            
            await this.peerConnection.setLocalDescription(offer);
            
            console.log('Sending offer to:', this.participantId);
            this.socket.emit('send-offer', {
                targetSocketId: this.participantId,
                sdp: offer
            });
            
            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    }

    async handleOffer(offer) {
        try {
            console.log('Handling offer from:', this.participantId);
            
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            console.log('Sending answer to:', this.participantId);
            this.socket.emit('send-answer', {
                targetSocketId: this.participantId,
                sdp: answer
            });
            
            return answer;
        } catch (error) {
            console.error('Error handling offer:', error);
            throw error;
        }
    }

    async handleAnswer(answer) {
        try {
            console.log('Handling answer from:', this.participantId);
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('Error handling answer:', error);
            throw error;
        }
    }

    async addIceCandidate(candidate) {
        try {
            console.log('Adding ICE candidate from:', this.participantId);
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    updateLocalStream(newStream) {
        if (!this.peerConnection) return;

        const senders = this.peerConnection.getSenders();
        senders.forEach(sender => {
            if (sender.track) {
                this.peerConnection.removeTrack(sender);
            }
        });

        if (newStream) {
            newStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, newStream);
            });
        }

        this.localStream = newStream;
    }

    toggleAudio(enabled) {
        console.log(`[PeerConnection ${this.participantId}] Toggling audio: ${enabled}`);
        
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
        
        if (this.peerConnection) {
            this.peerConnection.getSenders().forEach(sender => {
                if (sender.track && sender.track.kind === 'audio') {
                    sender.track.enabled = enabled;
                }
            });
        }
    }

    toggleVideo(enabled) {
        console.log(`[PeerConnection ${this.participantId}] Toggling video: ${enabled}`);
        
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
        
        if (this.peerConnection) {
            this.peerConnection.getSenders().forEach(sender => {
                if (sender.track && sender.track.kind === 'video') {
                    sender.track.enabled = enabled;
                }
            });
        }
    }

    close() {
        console.log('Closing peer connection for:', this.participantId);
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
    }

    getStats() {
        if (!this.peerConnection) return null;
        return this.peerConnection.getStats();
    }

    getConnectionState() {
        return this.peerConnection?.connectionState || 'closed';
    }
}

class PeerManager {
    constructor(socket) {
        this.socket = socket;
        this.peers = new Map();
        this.localStream = null;
        this.onRemoteStream = null;
        this.onConnectionStateChange = null;
        this.onPeerRemoved = null;
        
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('offer-received', ({ from, sdp }) => {
            this.handleOfferReceived(from, sdp);
        });

        this.socket.on('answer-received', ({ from, sdp }) => {
            this.handleAnswerReceived(from, sdp);
        });

        this.socket.on('ice-candidate-received', ({ from, candidate }) => {
            this.handleIceCandidateReceived(from, candidate);
        });

        this.socket.on('participant-left', ({ participantId }) => {
            this.removePeer(participantId);
        });
    }

    setLocalStream(stream) {
        this.localStream = stream;
        
        this.peers.forEach(peer => {
            peer.updateLocalStream(stream);
        });
    }

    createPeer(participantId, shouldCreateOffer = false) {
        if (this.peers.has(participantId)) {
            console.log('Peer already exists for:', participantId);
            return this.peers.get(participantId);
        }

        const peer = new PeerConnection(participantId, this.socket, this.localStream);
        
        peer.onRemoteStream = (stream) => {
            this.onRemoteStream?.(participantId, stream);
        };
        
        peer.onConnectionStateChange = (state) => {
            this.onConnectionStateChange?.(participantId, state);
        };

        this.peers.set(participantId, peer);

        if (shouldCreateOffer) {
            peer.createOffer().catch(console.error);
        }

        return peer;
    }

    async handleOfferReceived(from, sdp) {
        const peer = this.createPeer(from, false);
        await peer.handleOffer(sdp);
    }

    async handleAnswerReceived(from, sdp) {
        const peer = this.peers.get(from);
        if (peer) {
            await peer.handleAnswer(sdp);
        }
    }

    async handleIceCandidateReceived(from, candidate) {
        const peer = this.peers.get(from);
        if (peer) {
            await peer.addIceCandidate(candidate);
        }
    }

    removePeer(participantId) {
        const peer = this.peers.get(participantId);
        if (peer) {
            peer.close();
            this.peers.delete(participantId);
            this.onPeerRemoved?.(participantId);
        }
    }

    toggleAudio(enabled) {
        console.log(`[PeerManager] Toggling audio for all peers: ${enabled}`);
        
        this.peers.forEach(peer => {
            peer.toggleAudio(enabled);
        });
        
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    toggleVideo(enabled) {
        console.log(`[PeerManager] Toggling video for all peers: ${enabled}`);
        
        this.peers.forEach(peer => {
            peer.toggleVideo(enabled);
        });
        
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    closeAllConnections() {
        console.log('Closing all peer connections');
        
        this.peers.forEach(peer => {
            peer.close();
        });
        
        this.peers.clear();
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    getPeerStats() {
        const stats = {};
        this.peers.forEach((peer, participantId) => {
            stats[participantId] = {
                connectionState: peer.getConnectionState(),
                isInitiator: peer.isInitiator
            };
        });
        return stats;
    }
}

export { PeerConnection, PeerManager };
export default PeerManager;
