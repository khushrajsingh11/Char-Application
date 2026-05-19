import Conversation from "../models/Conversation.js";
import { userSocketMap } from "../server.js";

const activeCalls = new Map(); // conversationId → Set of userIds

export default (io, socket) => {
    const { userId } = socket.handshake.query;

    const autoJoinOngoingCalls = async () => {
        if (!userId) {
            console.warn(`Socket ${socket.id} connected without userId, skipping auto join`);
            return;
        }
        try {
            const ongoingConversations = await Conversation.find({
                "call.status": "ongoing",
                participants: userId
            }).select("_id");

            if (!ongoingConversations || ongoingConversations.length === 0) return;

            for (const conv of ongoingConversations) {
                joinCall({ conversationId: conv._id.toString() });
            }
            console.log(`User ${userId} auto-joined ${ongoingConversations.length} ongoing call(s)`);
        } catch (err) {
            console.error(`Error auto-joining ongoing calls for user ${userId}:`, err.message);
        }
    };

    const joinCall = ({ conversationId }) => {
        socket.join(conversationId);

        if (!activeCalls.has(conversationId)) {
            activeCalls.set(conversationId, new Set());
        }
        activeCalls.get(conversationId).add(userId);

        // Send existing participant user IDs to the new joiner
        const otherParticipantIds = Array.from(activeCalls.get(conversationId)).filter(
            id => id !== userId
        );
        socket.emit('existing-participants', { participants: otherParticipantIds });

        // Notify everyone else in the room about the new participant (by user ID)
        socket.to(conversationId).emit('participant-joined', { participantId: userId, conversationId });
    };

    const leaveCall = async ({ conversationId }) => {
        socket.leave(conversationId);

        if (activeCalls.has(conversationId)) {
            activeCalls.get(conversationId).delete(userId);
            if (activeCalls.get(conversationId).size === 0) {
                activeCalls.delete(conversationId);
                // Last participant left — end the call in DB so it never gets stuck as 'ongoing'
                try {
                    await Conversation.findByIdAndUpdate(conversationId, {
                        $set: { 'call.status': 'ended', 'call.endedAt': new Date(), 'call.participants': [] }
                    });
                } catch (err) {
                    console.error('Error ending call in DB on disconnect:', err.message);
                }
            }
        }
        socket.to(conversationId).emit('participant-left', { participantId: userId });
    };

    const rejectCall = ({ conversationId }) => {
        socket.to(conversationId).emit('call-rejected', { conversationId, rejectedBy: userId });
        if (activeCalls.has(conversationId)) activeCalls.delete(conversationId);
    };

    // Relay WebRTC offer to target user by user ID
    const relayOffer = ({ offer, to }) => {
        const targetSocketId = userSocketMap[to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('offer', { offer, from: userId });
        }
    };

    // Relay WebRTC answer to target user by user ID
    const relayAnswer = ({ answer, to }) => {
        const targetSocketId = userSocketMap[to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('answer', { answer, from: userId });
        }
    };

    // Relay ICE candidate to target user by user ID
    const relayIceCandidate = ({ candidate, to }) => {
        const targetSocketId = userSocketMap[to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', { candidate, from: userId });
        }
    };

    const handleDisconnect = () => {
        activeCalls.forEach((participants, conversationId) => {
            if (participants.has(userId)) {
                leaveCall({ conversationId });
            }
        });
    };

    socket.on('join-call', joinCall);
    socket.on('leave-call', leaveCall);
    socket.on('reject-call', rejectCall);
    socket.on('offer', relayOffer);
    socket.on('answer', relayAnswer);
    socket.on('ice-candidate', relayIceCandidate);
    socket.on('disconnect', handleDisconnect);
    autoJoinOngoingCalls();
};
