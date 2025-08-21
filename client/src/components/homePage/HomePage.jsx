import React, { useState, useEffect, useContext } from 'react';
import './HomePage.css';
import axios from 'axios';
import toast from "react-hot-toast";
import Sidebar from './Sidebar/Sidebar';
import ChatSection from './ChatSection/ChatSection';
import ContactInfo from './ChatSection/ContactInfo/ContactInfo.jsx'; // NEW COMPONENT
import ChatContext from '../../context/ChatContext.jsx';
import { AuthContext } from '../../context/AuthContext';
import ConversationContext from '../../context/ConversationContext.jsx';

const HomePage = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [sidebarView, setSidebarView] = useState('main');
  const [showContactInfo, setShowContactInfo] = useState(false); // NEW STATE
  const [contactInfoData, setContactInfoData] = useState(null); // NEW STATE

  // Context
  const { getMessages } = useContext(ChatContext);
  const {
    isMobile,
    setIsMobile,
    authUser,
    connectSocket,
    setAuthUser,
    setAuthLoading,
  } = useContext(AuthContext);

  const { 
    setConversations, 
    setUnseenMessages, 
    selectedConversation,
    setSelectedConversation
  } = useContext(ConversationContext);

  


  

  // Function to handle showing contact info
  const handleShowContactInfo = (contactData) => {
    setContactInfoData(contactData);
    setShowContactInfo(true);
  };

  // Function to hide contact info
  const handleHideContactInfo = () => {
    setShowContactInfo(false);
    setContactInfoData(null);
  };

  // Function to handle showing add user sidebar from ChatSection
  const handleShowAddUserSidebar = () => {
    setSidebarView('addUserToGroup');
  };

  // Initial data load
  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchUser = async () => {
      try {
        if (token) {
          axios.defaults.headers.common["token"] = token;
          const { data } = await axios.get("/api/auth/getuser");

          if (data.success) {
            setAuthUser(data.userData);
            connectSocket(data.userData);
          } else {
            localStorage.removeItem("token");
          }
        }
      } catch (err) {
        console.log("Auto-login failed:", err);
        localStorage.removeItem("token");
      } finally {
        setAuthLoading(false); 
      }
    };

    fetchUser();

    // Handle screen size changes
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); 
  

  // Fetch conversations
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

  // Add this useEffect in HomePage component
useEffect(() => {
  const handleBrowserBack = (event) => {
    // Check if there's a selected conversation or user to clear
    if (selectedConversation || selectedUser) {
      // Clear both states to hide ChatSection
      setSelectedConversation(null);
      setSelectedUser(null);
      
      // Prevent default browser back behavior
      event.preventDefault();
      window.history.pushState(null, null, window.location.pathname);
    }
  };

  // Listen for browser back button
  window.addEventListener('popstate', handleBrowserBack);
  
  // Push initial state to prevent actual navigation
  window.history.pushState(null, null, window.location.pathname);

  // Cleanup event listener
  return () => {
    window.removeEventListener('popstate', handleBrowserBack);
  };
}, [selectedConversation, selectedUser, setSelectedConversation]);

  // Get messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      getMessages(selectedConversation._id);
    }
  }, [selectedConversation]);

  return (
    <div className="container">
      <div className="chat-app">
        <Sidebar 
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          isMobile={isMobile}
          sidebarView={sidebarView}
          setSidebarView={setSidebarView}
        />

       {!showContactInfo && selectedConversation ? (
    <ChatSection 
      selectedUser={selectedUser}
      setSelectedUser={setSelectedUser}
      isMobile={isMobile}
      onShowAddUserSidebar={handleShowAddUserSidebar}
      onShowContactInfo={handleShowContactInfo}
    />
  ) : (
          <ContactInfo 
            contactData={contactInfoData}
            onBack={handleHideContactInfo}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
