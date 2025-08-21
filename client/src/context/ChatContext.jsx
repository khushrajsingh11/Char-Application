import { createContext, useContext, useEffect, useState } from "react";
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

    const {selectedConversation,setConversations} = useContext(ConversationContext);



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

      // 1. Add the new message to messages state
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // 2. Update lastMessage in conversations sidebar
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
    toast.error(error.message);
  }
};

  const subscribeToMessages = (selectedConversationId) => {
    if (!socket) return;
    socket.on("newMessage", (newMessage) => {
      if (selectedUser && newMessage.conversationId === selectedConversationId) {
        newMessage.seen = true;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        let messageId = newMessage._id;
        axios.put(`/api/messages/mark/${messageId}`);
      } else {
        setUnseenMessages((prevUnseenMessages) => ({
          ...prevUnseenMessages,
          [newMessage.senderId]: (prevUnseenMessages[newMessage.senderId] || 0) + 1,
        }));
      }
    });
  };


  const editMessageById = async (messageId, newText) => {
  if (!messageId || !newText) {
      console.error("Invalid messageId or newText");
      return;
    } 
    console.log("Editing message:", messageId, "with new text:", newText);
  try {
    const res = await axios.patch(
      `/api/messages/edit/${messageId}`,
      { newText: newText, conversationId : selectedConversation._id },
      {
        headers: {
          token: localStorage.getItem("token"),
        },
      }
    );

     if (res.data.success) {
      const updatedMessage = res.data.data;
      console.log("Message edited successfully:", updatedMessage);

      // Replace message in local messages state
      const updatedMessages = messages.map((msg) =>
        msg._id === updatedMessage._id ? updatedMessage : msg
      );

      setMessages(updatedMessages);
      setConversations((prevConversations) =>
  prevConversations.map((conv) =>
    conv._id === selectedConversation._id
      ? { ...conv, lastMessage: res.data.data } // update the lastMessage to edited message
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

    // 1. Find latest message by createdAt (or updatedAt if you prefer)
    const latestMessage = updatedMessages.reduce((latest, msg) => {
      return !latest || new Date(msg.createdAt) > new Date(latest.createdAt)
        ? msg
        : latest;
    }, null);

    // 2. Update conversations list with new lastMessage
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv._id === selectedConversation._id) {
          return {
            ...conv,
            lastMessage: latestMessage || null, // fallback to null if no messages
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
   const useMessages = (conversationId) => {
  

  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId) return;

      try {
        const { data } = await axios.get(`/api/messages/${conversationId}`);
        console.log("Fetched messages:", data);
        setMessages(data); // data will be the array of messages
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } 
    };

    fetchMessages();
  }, [selectedConversation]);

  return { messages };
};
 const fetchAllUsers = async () => {
  try {
    const token = localStorage.getItem("token"); // if protected route
    const res = await axios.get("/api/auth/getalluser", {
      headers: {
        token, // optional: if route is protected with JWT
      },
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


 

  const unsubscribeFromMessages = () => {
    if (socket) socket.off("newMessage");
  };

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser, socket]);

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
    useMessages,
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