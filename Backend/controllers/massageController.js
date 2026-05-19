import express from 'express'
import mongoose from 'mongoose';
import User from '../models/User.js'
import { io, userSocketMap} from '../server.js';
import cloudinary from '../lib/cloudinary.js';
import dotenv from 'dotenv';
let { cloud_name, api_key, api_secret } = cloudinary.config();

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";


export const getMessages = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const loggedInUserId = req.user._id;

    // Check if the user is a participant in the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [loggedInUserId] },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found or you're not a member." });
    }

    // Fetch messages from the Message model
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 });

    // Mark messages as seen
    await Message.updateMany(
      {
        conversationId,
        seen: false,
        senderId: { $ne: loggedInUserId }
      },
      { seen: true }
    );
res.status(200).json({
  success: true,
  message: "Messages fetched successfully",
  data: messages,
});
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



export const markAsSeen = async (req, res) => {
  try {
    const { messageId } = req.params; 

    const updated = await Message.findByIdAndUpdate(
      messageId,
      { seen: true },
      { new: true } 
    );

    if (!updated) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Successfully marked as seen", updatedMessage: updated });
  } catch (error) {
    console.error("Error marking message as seen:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { conversationId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ error: 'Text or image is required' });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    const newMessage = new Message({
      senderId,
      conversationId,
      text,
      image, 
    });

    conversation.lastMessage = newMessage._id;

    await Promise.all([
      newMessage.save(),
      conversation.save()
    ]);

    // ✅ Emit to all participants in the conversation
   conversation.participants.forEach(participantId => {
  if (participantId.toString() === senderId.toString()) return;
  const socketId = userSocketMap[participantId.toString()];
  if (socketId) {
    io.to(socketId).emit('newMessage', newMessage);
  }
});


    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      newMessage,
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const loggedInUserId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    if (message.senderId.toString() !== loggedInUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this message.",
      });
    }

    const conversationId = message.conversationId;

    await Message.findByIdAndDelete(messageId);

    // Find the new last message after deletion and update the conversation
    const newLastMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newLastMessage?._id || null,
    });

    // Emit to all participants so their UI updates in real-time
    const conversation = await Conversation.findById(conversationId);
    conversation.participants.forEach(participantId => {
      const socketId = userSocketMap[participantId.toString()];
      if (socketId) {
        io.to(socketId).emit('messageDeleted', {
          conversationId: conversationId.toString(),
          messageId,
          newLastMessageText: newLastMessage?.text || '',
          newLastMessageCreatedAt: newLastMessage?.createdAt || null,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Message deleted successfully.",
    });

  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newText, conversationId } = req.body;
    const loggedInUserId = req.user._id;

    if (!newText) {
      return res.status(400).json({ success: false, message: "New text is required." });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

      if (!conversationId) {
      return res.status(400).json({ success: false, message: "Conversation ID is required." });
    }


    if (message.senderId.toString() !== loggedInUserId.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to edit this message." });
    }

    message.text = newText;
    message.isEdited = true;
    await message.save();

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { lastMessage: messageId },
      { new: true }
    );

    // Emit to all participants so their UI updates in real-time
    conversation.participants.forEach(participantId => {
      const socketId = userSocketMap[participantId.toString()];
      if (socketId) {
        io.to(socketId).emit('messageEdited', {
          conversationId,
          updatedMessage: message,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Message updated successfully.",
      data: message,
    });

  } catch (error) {
    console.error("Error in editMessage: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const loggedInUserId = req.user._id;

        if (!emoji) {
            return res.status(400).json({ message: "Emoji is required." });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }
        
        // Verify the user is part of the conversation before allowing a reaction
        const conversation = await Conversation.findById(message.conversationId);
        if(!conversation.participants.includes(loggedInUserId)){
             return res.status(403).json({ message: "You are not a member of this conversation." });
        }

        const existingReactionIndex = message.reactions.findIndex(
            (reaction) => reaction.userId.toString() === loggedInUserId.toString()
        );

        if (existingReactionIndex > -1) {
            // If the user has already reacted with the same emoji, remove it (toggle off).
            if (message.reactions[existingReactionIndex].emoji === emoji) {
                message.reactions.splice(existingReactionIndex, 1);
            } else {
                // If the emoji is different, update the existing reaction.
                message.reactions[existingReactionIndex].emoji = emoji;
            }
        } else {
            // If the user hasn't reacted yet, add the new reaction.
            message.reactions.push({ userId: loggedInUserId, emoji });
        }

        await message.save();
        res.status(200).json(message);

    } catch (error) {
        console.error("Error in reactToMessage: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const getCloudinarySignature = (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { timestamp },
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      timestamp,
      signature,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error('Cloudinary signature generation error:', error);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
};
