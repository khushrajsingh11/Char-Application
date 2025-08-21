import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Create the context
const ConversationContext = createContext();

// Custom hook to use context
export const useConversation = () => useContext(ConversationContext);

// Provider component
const ConversationProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
 



  // Create solo chat
  const createSoloChat = async (userId) => {
  try {
    const { data } = await axios.post(`/api/conversations/createsolo/conversation/${userId}`);
    return data.newConversation; 
  } catch (error) {
    console.error("Failed to create solo chat:", error.message);
    toast.error("Failed to start chat");
    return null;
  }
};

  // Create group chat
const createGroupChat = async (name, users, groupIcon) => {
  try {
    const { data } = await axios.post('/api/conversations/creategroup/conversation', {
      name,
      users,
      groupIcon,
    });
    console.log("Group created:", data);
   
    setConversations((prev) => [data, ...prev]);
    return data;
  } catch (error) {
    console.error("Failed to create group:", error.message);
    toast.error("Failed to create group");
  }
};

  // Leave group
  const leaveGroup = async (conversationId) => {
  try {
    const { data } = await axios.post(
     `/api/conversations/leavegroup/conversation/${conversationId}`,
      {
        headers: {
          token: localStorage.getItem("token"),
        },
      }
    );

    toast.success(data.message);

    // Filter out the conversation from local state
    setConversations((prev) =>
      prev.filter((convo) => convo._id !== conversationId)
    );

    // Optionally clear selected conversation if it's the one user left
    if (selectedConversation?._id === conversationId) {
      setSelectedConversation(null);
    }
  } catch (error) {
    console.error("Leave group failed:", error.message);
    toast.error("Failed to leave the group.");
  }
};
  // Add user to group
  const addUsersToGroup = async (conversationId, userIdToAdd) => {
    try {
      const { data } = await axios.post(
        `/api/conversations/adduserto/conversation/${conversationId}`,
        { conversationId, userIdToAdd }
      );
      setConversations((prev) =>
        prev.map((convo) => (convo._id === data._id ? data : convo))
      );
      return data;
    } catch (error) {
      const serverMessage = error?.response?.data?.message;
      console.error("Failed to add user:", serverMessage || error.message);
      toast.error(serverMessage || "Failed to add user to group");
      throw error;
    }
  };

  // Rename group
  const renameGroup = async (conversationId, newName) => {
    try {
      const { data } = await axios.post(`/api/conversations/renamegroup/conversation/${conversationId}`, {
        conversationId,
        newName,
      });
      setConversations((prev) =>
        prev.map((convo) => (convo._id === data._id ? data : convo))
      );
      return data;
    } catch (error) {
      console.error("Failed to rename group:", error.message);
      toast.error("Failed to rename group");
    }
  };

  
const checkIfConversationExists = async (userId) => {
  try {
    const { data } = await axios.get(`/api/conversations/isexist/conversation/${userId}`);
    return data;
  } catch (error) {
    console.error("Failed to check if conversation exists:", error.message);
    return false;
  }
};
const createSoloConversation = async (userId) => {
  try {
    const response = await axios.post(`/api/conversations/createsolo/conversation/${userId}`);

    if (response.status === 201 && response.data.newConversation) {
      toast.success("Chat created successfully!");
      setConversations((prev) => [response.data.newConversation, ...prev]);
      return { success: true, conversation: response.data.newConversation };
    } else {
      toast.error(response.data.message || "Failed to create chat.");
      return { success: false };
    }
  } catch (error) {
    console.error("Error creating solo chat:", error);
    toast.error("Internal server error");
    return { success: false };
  }
};



  // Context value to share
  const value = {
    conversations,
    setConversations,
    unseenMessages,
    setUnseenMessages,
    createSoloChat,
    createGroupChat,
    leaveGroup,
    addUsersToGroup,
    renameGroup,
    checkIfConversationExists,
    createSoloConversation,
    selectedConversation,
    setSelectedConversation,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export default ConversationContext;
export { ConversationProvider };
