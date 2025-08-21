import { io } from '../server.js';
import Conversation from '../models/Conversation.js';
import mongoose from 'mongoose';

// --------- Utility Functions ---------
const checkPermissions = async (userId, conversationId) => {
  try {
    const conversation = await Conversation.findById(conversationId);
    return conversation?.participants.includes(userId) || false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};

const validateConversation = async (conversationId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return { valid: false, error: 'Invalid conversation ID format' };
    }
    const conversation = await Conversation.findById(conversationId);
    return conversation
      ? { valid: true, conversation }
      : { valid: false, error: 'Conversation not found' };
  } catch (error) {
    console.error('Conversation validation error:', error);
    return { valid: false, error: 'Database error' };
  }
};

const validateCallerInfo = (callerInfo) => {
  if (!callerInfo || typeof callerInfo !== 'object') {
    return { valid: false, error: 'Caller info must be an object' };
  }
  if (!callerInfo.name || typeof callerInfo.name !== 'string') {
    return { valid: false, error: 'Caller info must include a valid name' };
  }
  return { valid: true };
};

// --------- Controllers ---------
export const startCall = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, callerInfo } = req.body;

    if (!userId || !callerInfo) {
      return res.status(400).json({ success: false, message: 'User ID and caller info are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const { valid: callerInfoValid, error: callerInfoError } = validateCallerInfo(callerInfo);
    if (!callerInfoValid) {
      return res.status(400).json({ success: false, message: callerInfoError });
    }

    const { valid, error, conversation } = await validateConversation(conversationId);
    if (!valid) return res.status(404).json({ success: false, message: error });

    if (!(await checkPermissions(userId, conversationId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedConversation = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        $or: [
          { 'call.status': { $ne: 'ongoing' } },
          { 'call.status': { $exists: false } },
          { call: { $exists: false } }
        ]
      },
      {
        $set: {
          'call.status': 'ongoing',
          'call.startedBy': userId,
          'call.startedAt': new Date(),
          'call.participants': [userId],
          'call.roomId': conversationId
        }
      },
      { new: true }
    );

    if (!updatedConversation) {
      return res.status(409).json({ success: false, message: 'A call is already active in this conversation' });
    }

    io.to(conversationId).emit('incoming-call', {
      conversationId,
      callerId: userId,
      callerInfo,
      timestamp: new Date()
    });

    console.log(`Call started by user ${userId} in conversation ${conversationId}`);

    res.status(200).json({
      success: true,
      message: 'Call initiated successfully',
      conversationId,
      callInfo: updatedConversation.call
    });
  } catch (error) {
    console.error('Error starting call:', error);
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

export const joinCall = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: 'Invalid user ID format' });

    if (!(await checkPermissions(userId, conversationId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { valid, error, conversation } = await validateConversation(conversationId);
    if (!valid) return res.status(404).json({ success: false, message: error });

    if (!conversation.call || conversation.call.status !== 'ongoing') {
      return res.status(409).json({ success: false, message: 'No active call to join' });
    }

    if (conversation.call.participants.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You are already in this call' });
    }

    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { $addToSet: { 'call.participants': userId } },
      { new: true }
    );

    io.to(conversationId).emit('participant-joined', {
      conversationId,
      participantId: userId,
      timestamp: new Date()
    });

    console.log(`User ${userId} joined call in conversation ${conversationId}`);

    res.status(200).json({ success: true, message: 'Joined call successfully', callInfo: updatedConversation.call });
  } catch (error) {
    console.error('Error joining call:', error);
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

export const leaveCall = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: 'Invalid user ID format' });

    if (!(await checkPermissions(userId, conversationId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { valid, error, conversation } = await validateConversation(conversationId);
    if (!valid) return res.status(404).json({ success: false, message: error });

    if (!conversation.call || conversation.call.status !== 'ongoing') {
      return res.status(200).json({ success: true, message: 'Call already ended or does not exist' });
    }

    if (!conversation.call.participants.includes(userId)) {
      return res.status(200).json({ success: true, message: 'User was not in the call' });
    }

    const updatedParticipants = conversation.call.participants.filter(p => p.toString() !== userId.toString());

    if (updatedParticipants.length === 0) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { 'call.status': 'ended', 'call.endedAt': new Date(), 'call.participants': [] }
      });
      io.to(conversationId).emit('call-ended', { conversationId, reason: 'no_participants', timestamp: new Date() });
    } else {
      await Conversation.findByIdAndUpdate(conversationId, { $set: { 'call.participants': updatedParticipants } });
      io.to(conversationId).emit('participant-left', { conversationId, participantId: userId, timestamp: new Date() });
    }

    console.log(`User ${userId} left call in conversation ${conversationId}`);
    res.status(200).json({ success: true, message: 'Left call successfully' });
  } catch (error) {
    console.error('Error leaving call:', error);
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

export const endCall = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: 'Invalid user ID format' });

    if (!(await checkPermissions(userId, conversationId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { valid, error, conversation } = await validateConversation(conversationId);
    if (!valid) return res.status(404).json({ success: false, message: error });

    if (!conversation.call || conversation.call.status !== 'ongoing') {
      return res.status(409).json({ success: false, message: 'No active call to end' });
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      'call.status': 'ended',
      'call.endedBy': userId,
      'call.endedAt': new Date(),
      'call.participants': []
    });

    io.to(conversationId).emit('call-ended', { conversationId, endedBy: userId, reason: 'ended_by_user', timestamp: new Date() });

    console.log(`Call ended by user ${userId} in conversation ${conversationId}`);
    res.status(200).json({ success: true, message: 'Call ended successfully' });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

export const getCallStatus = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;

    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    if (userId && !(await checkPermissions(userId, conversationId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { valid, error, conversation } = await validateConversation(conversationId);
    if (!valid) return res.status(404).json({ success: false, message: error });

    const callStatus = conversation.call || { status: 'none', participants: [], startedBy: null, startedAt: null };
    res.status(200).json({ success: true, callStatus });
  } catch (error) {
    console.error('Error getting call status:', error);
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};
