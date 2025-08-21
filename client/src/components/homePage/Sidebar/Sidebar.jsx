import React, { useState, useEffect, useContext, useRef } from 'react';
import './Sidebar.css';
import { useNavigate } from 'react-router-dom';
import toast from "react-hot-toast";
import ChatIcon from '@mui/icons-material/Chat'; 
import SearchIcon from '@mui/icons-material/Search'; 
import MoreVertIcon from '@mui/icons-material/MoreVert'; 
import PersonIcon from '@mui/icons-material/Person'; 
import LogoutIcon from '@mui/icons-material/Logout'; 
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import ChatContext from '../../../context/ChatContext.jsx';
import { AuthContext } from '../../../context/AuthContext.jsx';
import ConversationContext from '../../../context/ConversationContext.jsx';
import UserSearchSidebar from './UserSearchSidebar';
import GroupCreationSidebar from './GroupCreationSidebar';
import GroupSetupSidebar from './GroupSetupSidebar';
import AddUserToGroupSidebar from './AddUserToGroupSidebar';

export const Sidebar = ({ selectedUser, setSelectedUser, isMobile, sidebarView, setSidebarView }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState([]);

  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Context
  const { getMessages, unseenMessages, messages } = useContext(ChatContext);
  const {
    logout,
    onlineUsers,
    authUser,
  } = useContext(AuthContext);

  const { 
    conversations, 
    setConversations,
    setSelectedConversation,
    selectedConversation,
    createSoloChat,
    createGroupChat,
    addUsersToGroup
  } = useContext(ConversationContext);

  // Ensure conversations is always an array
  const safeConversations = conversations || [];

  // Handle browser back navigation for sidebar views
  useEffect(() => {
    const handlePopState = (event) => {
      console.log("Browser back clicked, current view:", sidebarView);
      
      switch (sidebarView) {
        case 'userSearch':
          console.log("Going from userSearch to main");
          setSidebarView('main');
          break;
        case 'groupCreation':
          setSidebarView('userSearch');
          break;
        case 'groupSetup':
          setSidebarView('groupCreation');
          break;
        case 'addUserToGroup':
          setSidebarView('main');
          break;
        default:
          setSidebarView('main');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [sidebarView, setSidebarView]); 

  // Handle clicks outside search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchTerm('');
        setFilteredConversations([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show dropdown effect
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Navigation handlers
  const handleEditProfile = () => {
    setShowDropdown(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
  };

  // Handle Add button click - Show user search sidebar
  const handleAddClick = () => {
    setSidebarView('userSearch');
  };

  // Handle user selection from UserSearchSidebar
  const handleUserSelect = async (selectedUser) => {
    console.log("User selected:", selectedUser);
    
    try {
      // Check if individual conversation already exists
      const existingConversation = safeConversations.find(conv => {
        if (conv.isGroupChat) return false;
        
        const otherParticipant = conv.participants.find(p => p._id !== authUser._id);
        return otherParticipant && otherParticipant._id === selectedUser._id;
      });

      if (existingConversation) {
        const otherUser = existingConversation.participants.find(p => p._id !== authUser._id);
        setSelectedConversation(existingConversation);
        setSelectedUser(otherUser);
        await getMessages(existingConversation._id);
        toast.success(`Opened chat with ${selectedUser.fullname}`);
      } else {
        const newConversation = await createSoloChat(selectedUser._id);
        const otherUser = newConversation.participants.find(p => p._id !== authUser._id);
        
        setConversations(prev => {
          const prevSafe = prev || [];
          if (prevSafe.some(conv => conv._id === newConversation._id)) {
            return prevSafe;
          }
          return [newConversation, ...prevSafe];
        });
        setSelectedConversation(newConversation);
        setSelectedUser(otherUser);
        
        await getMessages(newConversation._id);
        toast.success(`Started chat with ${selectedUser.fullname}`);
      }
      
      setSidebarView('main');
      
    } catch (error) {
      console.error("Failed to start chat:", error);
      toast.error("Failed to start chat");
    }
  };

  // Handle back from UserSearchSidebar to main
  const handleBackToMain = () => {
    setSidebarView('main');
  };

  // Handle back from GroupCreationSidebar to UserSearchSidebar
  const handleBackToUserSearch = () => {
    setSidebarView('userSearch');
  };

  // Handle back from GroupSetupSidebar to GroupCreationSidebar
  const handleBackToGroupCreation = () => {
    setSidebarView('groupCreation');
  };

  // Handle back from AddUserToGroup to main
  const handleBackFromAddUserToGroup = () => {
    setSidebarView('main');
  };

  // Handle create group button click from UserSearchSidebar
  const handleCreateGroupClick = () => {
    setSidebarView('groupCreation');
  };

  // Handle navigation from GroupCreationSidebar to GroupSetupSidebar
  const handleProceedToGroupSetup = (data) => {
    console.log('Selected users for group setup:', data.selectedUsers);
    setSelectedUsersForGroup(data.selectedUsers);
    setSidebarView('groupSetup');
  };

  // Handle actual group creation from GroupSetupSidebar
  const handleFinalGroupCreate = async (groupData) => {
    try {
      console.log('Creating group:', groupData);
      
      if (createGroupChat) {
        const newGroupConversation = await createGroupChat(
          groupData.groupName, 
          groupData.selectedUsers.map(user => user._id),
          groupData.groupImage
        );
        
        setSelectedConversation(newGroupConversation);
        
        await getMessages(newGroupConversation._id);
        
        toast.success(`Group "${groupData.groupName}" created with ${groupData.selectedUsers.length + 1} members`);
      } else {
        toast.success(`Group "${groupData.groupName}" would be created with ${groupData.selectedUsers.length + 1} members`);
      }
      
      setSelectedUsersForGroup([]);
      setSidebarView('main');
      
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group');
    }
  };

  // Handle adding users to existing group
  const handleAddUsersToGroup = async (selectedUsers) => {
    try {
      console.log('Adding users to group:', selectedUsers);
      
      if (addUsersToGroup && selectedConversation) {
        for (const user of selectedUsers) {
          try {
            await addUsersToGroup(selectedConversation._id, user._id);
            toast.success(`Added ${user.fullname} to the group`);
          } catch (err) {
            console.error("Error adding user:", err);
            toast.error(`Failed to add ${user.fullname}`);
            throw err;
          }
        }
        
        setConversations(prev => 
          (prev || []).map(conv => 
            conv._id === selectedConversation._id 
              ? { ...conv, participants: [...conv.participants, ...selectedUsers] }
              : conv
          )
        );
        
        setSelectedConversation(prev => ({
          ...prev,
          participants: [...prev.participants, ...selectedUsers]
        }));
        
      } else {
        toast.success(`Would add ${selectedUsers.length} user(s) to the group`);
      }
      
      setSidebarView('main');
      
    } catch (error) {
      console.error('Failed to add users to group:', error);
      throw error;
    }
  };

  // Filter conversations based on search input
  const handleSearchChange = (e) => {
    const input = e.target.value;
    setSearchTerm(input);

    if (input === '') {
      setFilteredConversations([]);
      return;
    }

    const filtered = safeConversations.filter(conversation => {
      // For group chats, search by group name
      if (conversation.isGroupChat) {
        return conversation.groupName && 
               conversation.groupName.toLowerCase().includes(input.toLowerCase());
      } 
      // For individual chats, search by participant name
      else {
        const otherParticipant = conversation.participants.find(
          p => p._id !== authUser._id
        );
        return otherParticipant && 
               otherParticipant.fullname.toLowerCase().includes(input.toLowerCase());
      }
    });

    setFilteredConversations(filtered);
  };

  const handleConversationClick = async (conversation) => {
    // Handle group chat selection
    if (conversation.isGroupChat) {
      setSelectedUser(null);
      setSelectedConversation(conversation);
      console.log("Selected group conversation:", conversation);
    } 
    // Handle individual chat selection
    else {
      const otherParticipant = conversation.participants.find(
        p => p._id !== authUser._id
      );
      setSelectedUser(otherParticipant);
      setSelectedConversation(conversation);
      console.log("Selected individual conversation:", conversation);
    }
    
    try {
      await getMessages(conversation._id);
    } catch (error) {
      console.error("Failed to load messages:", error);
      toast.error("Failed to load messages");
    }
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (e, callback, ...args) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback(...args);
    }
  };

  // Get display name and avatar for conversation
  const getConversationDisplayInfo = (conversation) => {
    // Add safety check for undefined conversation
    if (!conversation) {
      return {
        name: 'Unknown Conversation',
        avatar: null,
        isGroup: false,
        userId: null
      };
    }

    if (conversation.isGroupChat) {
      return {
        name: conversation.groupName || 'Unnamed Group',
        avatar: conversation.isGroupIcon || null,
        isGroup: true
      };
    } else {
      const otherParticipant = conversation.participants?.find(
        p => p._id !== authUser._id
      );
      return {
        name: otherParticipant?.fullname || 'Unknown User',
        avatar: otherParticipant?.profilePic || null,
        isGroup: false,
        userId: otherParticipant?._id
      };
    }
  };

  // Check if conversation is currently selected
  const isConversationSelected = (conversation) => {
    if (!conversation) return false;
    
    if (conversation.isGroupChat) {
      return selectedConversation?._id === conversation._id;
    } else {
      const otherParticipant = conversation.participants?.find(
        p => p._id !== authUser._id
      );
      return selectedUser?._id === otherParticipant?._id;
    }
  };

  // Determine which conversations to display
  const conversationsToDisplay = searchTerm ? filteredConversations : safeConversations;

  // Conditional rendering based on sidebarView
  if (sidebarView === 'userSearch') {
    return (
      <UserSearchSidebar 
        onUserSelect={handleUserSelect}
        onBack={handleBackToMain}
        onCreateGroup={handleCreateGroupClick}
        isMobile={isMobile}
      />
    );
  }

  if (sidebarView === 'groupCreation') {
    return (
      <GroupCreationSidebar
        onBack={handleBackToUserSearch}
        onGroupCreate={handleProceedToGroupSetup}
        isMobile={isMobile}
      />
    );
  }

  if (sidebarView === 'groupSetup') {
    return (
      <GroupSetupSidebar
        selectedUsers={selectedUsersForGroup}
        onBack={handleBackToGroupCreation}
        onProceed={handleFinalGroupCreate}
        isMobile={isMobile}
      />
    );
  }

  if (sidebarView === 'addUserToGroup') {
    return (
      <AddUserToGroupSidebar
        currentConversation={selectedConversation}
        onBack={handleBackFromAddUserToGroup}
        onAddUsers={handleAddUsersToGroup}
        isMobile={isMobile}
      />
    );
  }

  // Main Sidebar View
  return (
    <div className={`sidebar ${isMobile && selectedUser ? 'sidebar-mobile-hidden' : isMobile ? 'sidebar-mobile-full' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <ChatIcon style={{ fontSize: 20 }} />
          </div>
          <span>QuickChat</span>
        </div>
        <div className="header-actions">
          <button 
            className="action-btn"
            onClick={handleAddClick}
            title="Start new chat"
          >
            <AddIcon style={{ fontSize: 16 }} />
          </button>
          <div className="dropdown-container">
            <button
              className="action-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <MoreVertIcon style={{ fontSize: 16 }} />
            </button>

            {showDropdown && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={handleEditProfile}
                >
                  <PersonIcon style={{ fontSize: 16 }} />
                  <span>Edit Profile</span>
                </button>
                <button
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  <LogoutIcon style={{ fontSize: 16 }} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="search-container" ref={searchRef}>
        <div className="search-box">
          <SearchIcon style={{ fontSize: 16 }} />
          <input 
            onChange={handleSearchChange}
            type="text"
            placeholder="Search Conversations..."
            className="search-input"
            value={searchTerm}
          />
        </div>
      </div>

      <div className="contacts-list">
        {conversationsToDisplay.length === 0 && !searchTerm && (
          <div className="no-conversations">
            <div className="no-conversations-content">
              <ChatIcon style={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)' }} />
              <p>No conversations yet</p>
              <p>Click the + button to start a new chat</p>
            </div>
          </div>
        )}

        {conversationsToDisplay
          .filter(conversation => conversation && conversation._id && conversation.participants)
          .map((conversation) => {
            const displayInfo = getConversationDisplayInfo(conversation);
            
            return (
              <div
                key={conversation._id}
                className={`contact-item ${isConversationSelected(conversation) ? 'contact-item-active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handleConversationClick(conversation)}
                onKeyDown={(e) => handleKeyDown(e, handleConversationClick, conversation)}
                style={{ cursor: 'pointer' }}
              >
                <div className="avatar">
                  {displayInfo.avatar ? (
                    <img 
                      src={displayInfo.avatar} 
                      alt={displayInfo.name}
                      className="contact-avatar-image"
                    />
                  ) : (
                    <>
                      {displayInfo.isGroup ? (
                        <GroupIcon style={{ fontSize: 15, color: '#fff' }} />
                      ) : (
                        displayInfo.name.charAt(0).toUpperCase()
                      )}
                    </>
                  )}
                  {/* Only show online indicator for individual chats */}
                  {!displayInfo.isGroup && displayInfo.userId && onlineUsers?.includes(displayInfo.userId) && (
                    <div className="online-indicator"></div>
                  )}
                </div>
                <div className="contact-info">
                  <div className="contact-header">
                    <h4 className="contact-name">
                      {displayInfo.name}
                      {displayInfo.isGroup && (
                        <GroupIcon style={{ fontSize: 14, marginLeft: '4px', opacity: 0.7 }} />
                      )}
                    </h4>
                    <span className="contact-time">
                      {conversation.lastMessage?.createdAt && 
                        formatTime(conversation.lastMessage.createdAt)}
                    </span>
                  </div>
                  <div className="contact-message">
                    <p className="contact-message-text">
                      {conversation.lastMessage?.text || 'No messages yet'}
                    </p>
                    {unseenMessages?.[conversation._id] > 0 && (
                      <span className="unread-badge">
                        {unseenMessages[conversation._id]}
                      </span>
                    )}
                  </div>
                  {/* Only show online status for individual chats */}
                  {!displayInfo.isGroup && displayInfo.userId && onlineUsers?.includes(displayInfo.userId) && (
                    <span className="contact-time" style={{ marginTop: '2px' }}>
                      online
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        
        {searchTerm && filteredConversations.length === 0 && (
          <div className="no-results">
            <p>No conversations found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
