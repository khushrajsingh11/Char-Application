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

  // Fetch sidebar conversations on mount
 useEffect(() => {
  const fetchConversations = async () => {
    try {
      const { data } = await axios.get('/api/conversations/get/conversation');

      // Store all conversations
      setConversations(data);

      // Extract unseen message count per conversation
      const unseenMap = {};
      data.forEach(convo => {
        unseenMap[convo._id] = convo.unseenCount || 0;
      });
      setUnseenMessages(unseenMap);

    } catch (error) {
      console.error("Failed to fetch conversations:", error.message);
      toast.error("Failed to load conversations");
    }
  };

  fetchConversations();
}, []);


  // Create solo chat
  const createSoloChat = async (userId) => {
    try {
      const { data } = await axios.post(`/api/conversations/createsolo/conversation/${userId}`);
      setConversations((prev) => [data.newConversation, ...prev]);
      return data.newConversation;
    } catch (error) {
      console.error("Failed to create solo chat:", error.message);
      toast.error("Failed to start chat");
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
      const { data } = await axios.get(`/api/conversations/leavegroup/conversation/${conversationId}`);
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      if (selectedConversation?._id === conversationId) setSelectedConversation(null);
      toast.success(data.message);
    } catch (error) {
      console.error("Error leaving group:", error.message);
      toast.error("Failed to leave group");
    }
  };

  // Add user to group
  const addUserToGroup = async (conversationId, userIdToAdd) => {
    try {
      const { data } = await axios.post(`/api/conversations/adduserto/conversation/${conversationId}`, {
        conversationId,
        userIdToAdd,
      });
      setConversations((prev) =>
        prev.map((convo) => (convo._id === data._id ? data : convo))
      );
      return data;
    } catch (error) {
      console.error("Failed to add user:", error.message);
      toast.error("Failed to add user to group");
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

  // Context value to share
  const value = {
    conversations,
    setConversations,
    selectedConversation,
    setSelectedConversation,
    unseenMessages,
    setUnseenMessages,
    createSoloChat,
    createGroupChat,
    leaveGroup,
    addUserToGroup,
    renameGroup,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export default ConversationProvider;
