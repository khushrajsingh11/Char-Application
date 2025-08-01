import React, { useState, useEffect, useContext, useRef } from 'react';
import './HomePage.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import ChatIcon from '@mui/icons-material/Chat'; 
import SearchIcon from '@mui/icons-material/Search'; 
import MoreVertIcon from '@mui/icons-material/MoreVert'; 
import SendIcon from '@mui/icons-material/Send'; 
import PhoneIcon from '@mui/icons-material/Phone'; 
import VideocamIcon from '@mui/icons-material/Videocam'; 
import InfoIcon from '@mui/icons-material/Info'; 
import PersonIcon from '@mui/icons-material/Person'; 
import LogoutIcon from '@mui/icons-material/Logout'; 
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import ChatContext from '../../../context/ChatContext.jsx';
import { AuthContext } from '../../../context/AuthContext';

const HomePage = () => {
const [showDropdown, setShowDropdown] = useState(false);
const [isMobile, setIsMobile] = useState(false);
const [searchInput, setSearchInput] = useState(''); 
const [messageInput, setMessageInput] = useState(''); 
const [selectedImage, setSelectedImage] = useState(null); 
const [imagePreview, setImagePreview] = useState(null); 
const [searchTerm, setSearchTerm] = useState("");
const [searchableUsers, setSearchableUsers] = useState([]);
const [filteredUsers, setFilteredUsers] = useState([]);

const fileInputRef = useRef(null); 
const navigate = useNavigate();

// Context


const { getUsersForSearch } = useContext(ChatContext);

const {
  users,
  selectedUser,
  setSelectedUser,
  sendMessage,
  messages,
  unseenMessages,
  getUsers,
  getMessages
} = useContext(ChatContext);

const {
  logout,
  onlineUsers,
  authUser
} = useContext(AuthContext);

// Initial data load
useEffect(() => {
  getUsers();
}, [onlineUsers, getUsers]);

// Load messages when user selected
useEffect(() => {
  if (selectedUser) {
    getMessages(selectedUser._id);
  }
}, [selectedUser]);

// Format time
const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString();

// Cloudinary Upload Handler
const uploadToCloudinary = async (file) => {
  try {
    const { data: signData } = await axios.get('/api/cloudinary-signature');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signData.api_key);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);

    const uploadRes = await axios.post(
      `https://api.cloudinary.com/v1_1/${signData.cloud_name}/auto/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return uploadRes.data;
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    throw err;
  }
};

// Handle image select and upload
const handleImageSelect = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const uploadIMG = await uploadToCloudinary(file);
    setImagePreview(uploadIMG.secure_url);
    setSelectedImage(uploadIMG.secure_url);
  } catch (error) {
    console.log(error.message);
  }
};

// Send message
const handleSendMessage = async () => {
  if ((messageInput.trim() || selectedImage) && selectedUser) {
    try {
      const messageData = {
        text: messageInput.trim(),
      };

      if (selectedImage) {
        messageData.image = selectedImage;
      }

      await sendMessage(messageData);

      setMessageInput('');
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
};

// Remove selected image
const handleRemoveImage = () => {
  setSelectedImage(null);
  setImagePreview(null);
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};

// Navigation handlers
const handleEditProfile = () => {
  setShowDropdown(false);
  alert('Profile editing functionality would go here');
  navigate('/profile');
};

const handleLogout = () => {
  setShowDropdown(false);
  alert('Logout functionality would go here');
  logout();
};

const handleBackToContacts = () => {
  setSelectedUser(null);
};

const handleFriendprofile = () => {
  navigate('/friendprofile');
};

// Keyboard send on Enter
const handleKeyPress = (e) => {
  if (e.key === 'Enter') {
    handleSendMessage();
  }
};

// Show dropdown or resize effect
useEffect(() => {
  const handleClickOutside = (event) => {
    if (showDropdown && !event.target.closest('.dropdown-container')) {
      setShowDropdown(false);
    }
  };

  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  handleResize();
  document.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('resize', handleResize);

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
    window.removeEventListener('resize', handleResize);
  };
}, [showDropdown]);

// Fetch users for search (first time only)
const handleSearchOpen = async () => {
  if (searchableUsers.length === 0) {
    const users = await getUsersForSearch();
    setSearchableUsers(users);
  }
};

// Filter users based on search input
const handleSearchChange = (e) => {
  const input = e.target.value;
  setSearchTerm(input);

  const filtered = searchableUsers.filter(user =>
    user.fullname.toLowerCase().includes(input.toLowerCase())
  );
  setFilteredUsers(filtered);
};




  return (
    <div className="container">
      <div className="chat-app">
        
        <div className={`sidebar ${isMobile && selectedUser ? 'sidebar-mobile-hidden' : isMobile ? 'sidebar-mobile-full' : ''}`}>
          
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon">
                <ChatIcon style={{ fontSize: 20 }} />
              </div>
              <span>QuickChat</span>
            </div>
            <div className="header-actions">
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

          
          <div className="search-container">
            <div className="search-box">
              <SearchIcon style={{ fontSize: 16 }} />
              <input 
                onChange={(e) => handleSearchChange(e.target.value)}
                type="text"
                placeholder="Search User..."
                className="search-input"
                value={searchInput}
              />
            </div>
          </div>

        
          <div className="contacts-list">
            {filteredUsers.map((contact) => (
              <div
                key={contact._id}
                className={`contact-item ${selectedUser?._id === contact._id ? 'contact-item-active' : ''}`}
                onClick={() => setSelectedUser(contact)}
              >
                <div className="avatar">
  {contact.profilePic ? (
    <img 
      src={contact.profilePic} 
      alt={contact.fullname}
      className="contact-avatar-image"
    />
  ) : (
    contact.fullname.charAt(0).toUpperCase()
  )}
  {onlineUsers.includes(contact._id) && <div className="online-indicator"></div>}
</div>
                <div className="contact-info">
                  <div className="contact-header">
                    <h4 className="contact-name">{contact.fullname}</h4>
                    <span className="contact-time">{contact.time}</span>
                  </div>
                  <div className="contact-message">
                    <p className="contact-message-text">{contact.lastMessage}</p>
                    {unseenMessages[contact._id] > 0 && (
                      <span className="unread-badge">{unseenMessages[contact._id]}</span>
                    )}
                  </div>
                  {onlineUsers.includes(contact._id) && (
                    <span className="contact-time" style={{ marginTop: '2px' }}>
                      {"online"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

       
        <div className={`chat-area ${isMobile && !selectedUser ? 'chat-area-mobile-hidden' : ''}`}>
          {selectedUser ? (
            <>
              
              <div className="chat-header">
                <div className="chat-user-info">
                  <button
                    className={`back-btn ${isMobile ? 'back-btn-mobile' : ''}`}
                    onClick={handleBackToContacts}
                  >
                    ←
                  </button>
                  <div className="chat-avatar">
  {selectedUser.profilePic &&
    <img 
      src={selectedUser.profilePic} 
      alt={selectedUser.fullname}
      className="avatar-image"
    />}
                  </div>
                  <div className="chat-user-details">
                    <h3 className="chat-user-name">{selectedUser.fullname}</h3>
                    <span className="user-status">
                      {onlineUsers.includes(selectedUser._id) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <div className="chat-actions">
                  <button className="chat-action-btn">
                    <PhoneIcon style={{ fontSize: 18 }} />
                  </button>
                  <button className="chat-action-btn">
                    <VideocamIcon style={{ fontSize: 18 }} />
                  </button>
                  <button  onClick={handleFriendprofile} className="chat-action-btn">
                    <InfoIcon style={{ fontSize: 18 }} />
                  </button>
                </div>
              </div>

              
              <div className="messages-container">
                <div className="messages-list">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`message ${message.senderId === authUser._id ? 'message-sent' : 'message-received'}`}
                    >
                      <div
                        className={`message-content ${
                          message.senderId === authUser._id ? 'message-content-sent' : 'message-content-received'
                        }`}
                      >
                        {message.text && (
                          <p className="message-text">{message.text}</p>
                        )}

                        {message.image && (
                          <div className="message-image">
                            <img 
                              src={message.image} 
                              alt="Shared image"
                              className="shared-image"
                            />
                          </div>
                        )}
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              
              {imagePreview && (
                <div className="image-preview-container">
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" className="preview-image" />
                    <button className="remove-image-btn" onClick={handleRemoveImage}>
                      <CloseIcon style={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>
              )}

            
              <div className="message-input-container">
                <div className="message-input-box">
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  
                  
                  <button
                    className="image-btn"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <ImageIcon style={{ fontSize: 20 }} />
                  </button>

                 
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="message-input"
                  />
                  
                 
                  <button
                    className={`send-button ${!messageInput.trim() && !selectedImage ? 'send-button-disabled' : ''}`}
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() && !selectedImage}
                  >
                    <SendIcon style={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <div className="welcome-icon">
                  <ChatIcon style={{ fontSize: 80 }} />
                </div>
                <h2 className="welcome-title">Chat anytime, anywhere</h2>
                <p className="welcome-text">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;