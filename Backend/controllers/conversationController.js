import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";


export const createSoloChat = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newConversation = await Conversation.create({
      participants: [userId, req.user._id],
      isGroupChat: false,
    });

    res.status(201).json({
      message: "New conversation created",
      newConversation,
    });
  } catch (error) {
    console.error("Error in createSoloChat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const createGroupChat = async (req, res) => {
    try {
        const { name, users, groupIcon } = req.body;

        if (!name || !users || !Array.isArray(users) || users.length < 2) {
            return res.status(400).json({
                message: "A group name and at least two users are required."
            });
        }

        const participants = [...users, req.user._id];

        const groupChat = await Conversation.create({
            groupName: name,
            participants: participants,
            groupIcon: groupIcon || "",
            isGroupChat: true,
            groupAdmin: req.user._id,
        });

        const fullGroupChat = await Conversation.findById(groupChat._id)
            .populate("participants", "-password")
            .populate("groupAdmin", "-password");

        res.status(201).json(fullGroupChat);

    } catch (error) {
        console.error("Error in createGroupChat: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};



export const getConversationsForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        const conversations = await Conversation.find({ participants: loggedInUserId })
            .populate({
                path: "participants",
                select: "fullname profilePic",
            })
            .populate({
                path: "lastMessage",
                select: "text senderId seen createdAt",
            })
            .sort({ updatedAt: -1 });

        const conversationIds = conversations.map(convo => convo._id);

        const unseenMessages = await Message.aggregate([
            {
                $match: {
                    conversationId: { $in: conversationIds },
                    seen: false,
                    senderId: { $ne: loggedInUserId }
                }
            },
            {
                $group: {
                    _id: "$conversationId",
                    count: { $sum: 1 }
                }
            }
        ]);

        const unseenMessagesMap = unseenMessages.reduce((acc, item) => {
            acc[item._id.toString()] = item.count;
            return acc;
        }, {});

        const conversationsWithUnseenCount = conversations.map(convo => {
            return {
                ...convo.toObject(),
                unseenCount: unseenMessagesMap[convo._id.toString()] || 0,
            };
        });

        res.status(200).json(conversationsWithUnseenCount);

    } catch (error) {
        console.error("Error in getConversationsForSidebar:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const { conversationId } = req.body;
        const loggedInUserId = req.user._id;

        if (!conversationId) {
            return res.status(400).json({ message: "Conversation ID is required." });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }
        
        // Remove the user from the participants list
        const updatedConversation = await Conversation.findByIdAndUpdate(
            conversationId,
            { $pull: { participants: loggedInUserId } },
            { new: true }
        );

        // If the user who left was the admin, assign a new admin
        if (updatedConversation.groupAdmin.toString() === loggedInUserId.toString()) {
            if (updatedConversation.participants.length > 0) {
                updatedConversation.groupAdmin = updatedConversation.participants[0]; // Assign the first user as new admin
                await updatedConversation.save();
            } else {
                // Optional: If the group is empty, you might want to delete it
                await Conversation.findByIdAndDelete(conversationId);
                return res.status(200).json({ message: "You left the group, and it has been deleted as it was empty." });
            }
        }

        res.status(200).json({ message: "You have successfully left the group." });

    } catch (error) {
        console.error("Error in leaveGroup: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const addUserToGroup = async (req, res) => {
    try {
        const { conversationId, userIdToAdd } = req.body;
        const loggedInUserId = req.user._id;

        if (!conversationId || !userIdToAdd) {
            return res.status(400).json({ message: "Conversation ID and User ID to add are required." });
        }

        const [conversation, userToAdd] = await Promise.all([
            Conversation.findById(conversationId),
            User.findById(userIdToAdd)
        ]);

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }

        if (!userToAdd) {
            return res.status(404).json({ message: "User to add not found." });
        }

        if (conversation.groupAdmin.toString() !== loggedInUserId.toString()) {
            return res.status(403).json({ message: "Only the group admin can add users." });
        }

        if (conversation.participants.includes(userIdToAdd)) {
            return res.status(400).json({ message: "User is already in the group." });
        }

        // Add the user to the group
        const updatedConversation = await Conversation.findByIdAndUpdate(
            conversationId,
            { $push: { participants: userIdToAdd } },
            { new: true } // Return the updated document
        )
        .populate("participants", "-password")
        .populate("groupAdmin", "-password");

        res.status(200).json(updatedConversation);

    } catch (error) {
        console.error("Error in addUserToGroup: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const renameGroup = async (req, res) => {
    try {
        const { conversationId, newName } = req.body;
        const loggedInUserId = req.user._id;

        if (!conversationId || !newName) {
            return res.status(400).json({ message: "Conversation ID and new name are required." });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }

        if (!conversation.isGroupChat) {
            return res.status(400).json({ message: "This is not a group chat." });
        }

        // Check if the logged-in user is the group admin
        if (conversation.groupAdmin.toString() !== loggedInUserId.toString()) {
            return res.status(403).json({ message: "Only the group admin can rename the group." });
        }

        conversation.groupName = newName;
        await conversation.save();

        const updatedConversation = await Conversation.findById(conversationId)
            .populate("participants", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(updatedConversation);

    } catch (error) {
        console.error("Error in renameGroup: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

const checkAvailable = async (req, res) => {
  try {
    const { userId } = req.params;
    const loggedInUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const userToCheck = await User.findById(userId);
    if (!userToCheck) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if a solo conversation already exists
    const existingChat = await Conversation.findOne({
      isGroupChat: false,
      participants: { $all: [loggedInUserId, userId] },
    });

    if (existingChat) {
      return res.status(200).json({ available: false, message: "Conversation already exists" });
    }

    res.status(200).json({ available: true, message: "User is available for a new solo chat" });

  } catch (error) {
    console.error("Error in checkAvailable:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default checkAvailable;
