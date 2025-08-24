import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";
import ConversationContext from "./ConversationContext.jsx";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { axios, socket } = useContext(AuthContext);
  const { selectedConversation, setConversations } = useContext(ConversationContext);

const subscribeToMessages = useCallback(() => {
  // Early return if dependencies not ready
  if (!socket || !selectedConversation?._id) return;

  const handleNewMessage = (newMessage) => {
    console.log('Received new message:', newMessage);
    
    // Validate message structure
    if (!newMessage || !newMessage.conversationId || !newMessage._id) {
      console.error('Invalid message received:', newMessage);
      return;
    }
    
    // Check if message belongs to current conversation
    if ( newMessage.conversationId === selectedConversation._id) {
      // Mark as seen and add to current conversation
      const messageWithSeen = { ...newMessage, seen: true };
      
      setMessages((prevMessages) => {
  const alreadyExists = prevMessages.some(msg => msg._id === newMessage._id);
  if (alreadyExists) return prevMessages; // avoid duplicate

  return [...prevMessages, messageWithSeen];
});
      
      // Update conversations list with new lastMessage
      setConversations((prevConversations) =>
        prevConversations.map((conv) =>
          conv._id === selectedConversation._id
            ? { ...conv, lastMessage: messageWithSeen }
            : conv
        )
      );
      
      // Mark message as read on server
      const messageId = newMessage._id;
      axios.put(`/api/messages/mark/${messageId}`)
        .then(() => console.log('Message marked as read'))
        .catch(err => console.error('Failed to mark message as read:', err));
        
    } else {
      // Message from different conversation - increment unseen counter
      setUnseenMessages((prevUnseenMessages) => ({
        ...prevUnseenMessages,
        [newMessage.senderId]: (prevUnseenMessages[newMessage.senderId] || 0) + 1,
      }));
      
      // Still update the conversations list for other conversations
      setConversations((prevConversations) =>
        prevConversations.map((conv) =>
          conv._id === newMessage.conversationId
            ? { ...conv, lastMessage: newMessage }
            : conv
        )
      );
    }
  };

  // Clean up existing listener before adding new one
  socket.off("newMessage");
  socket.on("newMessage", handleNewMessage);

  // Return cleanup function
  return () => {
    socket.off("newMessage", handleNewMessage);
  };
}, [socket, selectedUser, selectedConversation?._id]); // Removed axios and setConversations from deps

// Clean useEffect implementation
useEffect(() => {
  const cleanup = subscribeToMessages();
  
  // Ensure cleanup exists and is a function
  return cleanup || (() => {});
}, [subscribeToMessages]);

  const getUsersForSearch = async () => {
    try {
      const { data } = await axios.get("/api/auth/getallusersearch");
      return data;
    } catch (error) {
      console.error("Error fetching users:", error.message);
      toast.error("Failed to load users");
      return [];
    }
  };

  const getMessages = async (conversationId) => {
    try {
      const { data } = await axios.get(`/api/messages/getmessages/${conversationId}`);
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendMessage = async (messageData) => {
    try {
      let conversationId = selectedConversation._id.trim();
      const { data } = await axios.post(`/api/messages/send/${conversationId}`, messageData);

      if (data.success) {
        const newMessage = data.newMessage;

        // Add the new message to messages state
        setMessages((prevMessages) => [...prevMessages, newMessage]);

        // Update lastMessage in conversations sidebar
        setConversations((prevConversations) =>
          prevConversations.map((conv) =>
            conv._id === conversationId
              ? { ...conv, lastMessage: newMessage }
              : conv
          )
        );
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to send message");
      console.error(error.message);
    }
  };

  const editMessageById = async (messageId, newText) => {
    if (!messageId || !newText) {
      console.error("Invalid messageId or newText");
      return;
    }
    
    try {
      const res = await axios.patch(
        `/api/messages/edit/${messageId}`,
        { newText: newText, conversationId: selectedConversation._id },
        {
          headers: {
            token: localStorage.getItem("token"),
          },
        }
      );

      if (res.data.success) {
        const updatedMessage = res.data.data;
        
        // Replace message in local messages state
        setMessages(prevMessages =>
          prevMessages.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg
          )
        );
        
        setConversations((prevConversations) =>
          prevConversations.map((conv) =>
            conv._id === selectedConversation._id
              ? { ...conv, lastMessage: res.data.data }
              : conv
          )
        );
      } else {
        console.error("Edit failed:", res.data.message);
      }
    } catch (error) {
      console.error("Error editing message:", error.response?.data?.message || error.message);
    }
  };

  const deleteMessageById = async (messageId) => {
    try {
      const res = await axios.delete(`/api/messages/delete/${messageId}`, {
        headers: { token: localStorage.getItem("token") },
      });

      if (!res.data.success) {
        toast.error(res.data.message);
        return;
      }

      // Filter out the deleted message
      const updatedMessages = messages.filter((msg) => msg._id !== messageId);
      setMessages(updatedMessages);

      // Find latest message by createdAt
      const latestMessage = updatedMessages.reduce((latest, msg) => {
        return !latest || new Date(msg.createdAt) > new Date(latest.createdAt)
          ? msg
          : latest;
      }, null);

      // Update conversations list with new lastMessage
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv._id === selectedConversation._id) {
            return {
              ...conv,
              lastMessage: latestMessage || null,
            };
          }
          return conv;
        })
      );
    } catch (error) {
      console.error(
        error.response?.data?.message || "Failed to delete message"
      );
    }
  };

  // ✅ Fixed: Removed duplicate useMessages hook (should be separate if needed)
  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/auth/getalluser", {
        headers: { token },
      });

      if (res.data.success) {
        return res.data.users;
      } else {
        console.error("Failed to fetch users:", res.data.message);
        return [];
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  };

  const value = {
    messages,
    users,
    selectedUser,
    getMessages,
    setMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
    getUsersForSearch,
    setUsers,
    deleteMessageById,
    editMessageById,
    fetchAllUsers,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
