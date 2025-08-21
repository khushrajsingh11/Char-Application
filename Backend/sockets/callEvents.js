const activeCalls = new Map();

export default (io, socket) => {
    const { userId } = socket.handshake.query;

    const joinCall = ({ conversationId }) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} (User: ${userId}) joined call room: ${conversationId}`);

        if (!activeCalls.has(conversationId)) {
            activeCalls.set(conversationId, new Set());
        }
        activeCalls.get(conversationId).add(socket.id);

        const otherParticipants = Array.from(activeCalls.get(conversationId)).filter(
            (id) => id !== socket.id
        );

        socket.emit('existing-participants', { participants: otherParticipants });
        socket.to(conversationId).emit('new-participant', { participantId: socket.id });
    };

    const leaveCall = ({ conversationId }) => {
        socket.leave(conversationId);
        console.log(`Socket ${socket.id} (User: ${userId}) left call room: ${conversationId}`);

        if (activeCalls.has(conversationId)) {
            activeCalls.get(conversationId).delete(socket.id);
            if (activeCalls.get(conversationId).size === 0) {
                activeCalls.delete(conversationId);
            }
        }
        socket.to(conversationId).emit('participant-left', { participantId: socket.id });
    };

    const rejectCall = ({ conversationId }) => {
        console.log(`Call rejected by user ${userId} in conversation ${conversationId}`);
        
        socket.to(conversationId).emit('call-rejected', {
            conversationId,
            rejectedBy: userId
        });
        
        if (activeCalls.has(conversationId)) {
            activeCalls.delete(conversationId);
        }
    };

    const sendOffer = ({ targetSocketId, sdp }) => {
        io.to(targetSocketId).emit('offer-received', {
            from: socket.id,
            sdp,
        });
    };

    const sendAnswer = ({ targetSocketId, sdp }) => {
        io.to(targetSocketId).emit('answer-received', {
            from: socket.id,
            sdp,
        });
    };

    const sendIceCandidate = ({ targetSocketId, candidate }) => {
        io.to(targetSocketId).emit('ice-candidate-received', {
            from: socket.id,
            candidate,
        });
    };

    const handleDisconnect = () => {
        activeCalls.forEach((participants, conversationId) => {
            if (participants.has(socket.id)) {
                leaveCall({ conversationId });
            }
        });
    };

    socket.on('join-call', joinCall);
    socket.on('leave-call', leaveCall);
    socket.on('reject-call', rejectCall);
    socket.on('send-offer', sendOffer);
    socket.on('send-answer', sendAnswer);
    socket.on('send-ice-candidate', sendIceCandidate);
    socket.on('disconnect', handleDisconnect);
};
