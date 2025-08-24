import React, { useState, useContext, useRef, useEffect } from 'react';
import './ChatSection.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SendIcon from '@mui/icons-material/Send';
import PhoneIcon from '@mui/icons-material/Phone';
import VideocamIcon from '@mui/icons-material/Videocam';
import InfoIcon from '@mui/icons-material/Info';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import GroupIcon from '@mui/icons-material/Group';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ChatContext from '../../../context/ChatContext.jsx';
import { AuthContext } from '../../../context/AuthContext';
import ConversationContext from '../../../context/ConversationContext.jsx';
import { useCall } from '../../../context/CallContext.jsx';
import VideoCall from './VideoCall.jsx';
import ProfilePageF from '../../FriendsProfilePage/ProfilePageF.jsx';


const ChatSection = ({
  selectedUser,
  setSelectedUser,
  isMobile,
  onShowAddUserSidebar,
  onShowContactInfo,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [updateMessageId, setUpdateMessageId] = useState(null);
  const [originalMessage, setOriginalMessage] = useState('');
  const [showFriendProfile, setShowFriendProfile] = useState(false);


  const fileInputRef = useRef(null);
  const infoDropdownRef = useRef(null);
  const navigate = useNavigate();


  const { sendMessage, messages, deleteMessageById, editMessageById } = useContext(ChatContext);
  const { onlineUsers, authUser } = useContext(AuthContext);
  const { selectedConversation, leaveGroup } = useContext(ConversationContext);
  const {
    call,
    startCall,
    acceptCall,
    rejectCall,
    leaveCall,
    endCall,
    isStartingCall,
    isJoiningCall,
    isLeavingCall,
    localStream,
    remoteStreams,
  } = useCall();


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (infoDropdownRef.current && !infoDropdownRef.current.contains(event.target)) {
        setShowInfoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const getCurrentConversationInfo = () => {
    if (!selectedConversation) return null;
    if (selectedConversation.isGroupChat) {
      return {
        name: selectedConversation.groupName || 'Unnamed Group',
        avatar: selectedConversation.isGroupIcon || null,
        isGroup: true,
        onlineStatus: `${selectedConversation.participants.length} members`,
        conversationId: selectedConversation._id,
        groupAdmin: selectedConversation.groupAdmin,
      };
    } else {
      const otherParticipant = selectedConversation.participants?.find(
        (participant) => participant._id !== authUser._id
      );
      if (otherParticipant) {
        return {
          name: otherParticipant.fullName || otherParticipant.fullname,
          avatar: otherParticipant.profilePic || null,
          isGroup: false,
          onlineStatus: onlineUsers.includes(otherParticipant._id) ? 'Online' : 'Offline',
          userId: otherParticipant._id,
          conversationId: selectedConversation._id,
        };
      }
      if (selectedUser) {
        return {
          name: selectedUser.fullname,
          avatar: selectedUser.profilePic || null,
          isGroup: false,
          onlineStatus: onlineUsers.includes(selectedUser._id) ? 'Online' : 'Offline',
          userId: selectedUser._id,
          conversationId: selectedConversation._id,
        };
      }
    }
    return null;
  };


  const conversationInfo = getCurrentConversationInfo();


  const isGroupAdmin = () => {
    if (!conversationInfo?.isGroup || !authUser) return false;
    return conversationInfo.groupAdmin === authUser._id;
  };


  const handleNameClick = () => {
    if (!conversationInfo) return;
    const contactData = {
      name: conversationInfo.name,
      avatar: conversationInfo.avatar,
      isGroup: conversationInfo.isGroup,
      phone: conversationInfo.isGroup ? null : selectedUser?.phone,
      email: conversationInfo.isGroup ? null : selectedUser?.email,
      about: conversationInfo.isGroup ? null : selectedUser?.about,
      onlineStatus: conversationInfo.onlineStatus,
      participants: conversationInfo.isGroup ? selectedConversation?.participants : null,
      groupAdmin: conversationInfo.isGroup ? conversationInfo.groupAdmin : null,
      conversationId: conversationInfo.conversationId,
    };
    if (onShowContactInfo) onShowContactInfo(contactData);
  };


  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };


  const uploadToCloudinary = async (file) => {
    try {
      const { data: signData } = await axios.get('/api/messages/cloudinary-signature');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signData.api_key);
      formData.append('timestamp', signData.timestamp);
      formData.append('signature', signData.signature);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloud_name}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Cloudinary upload failed:', err);
      throw err;
    }
  };


  const handleImageSelect = async (e) => {
    if (isUpdateMode) return;
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


  const handleSendMessage = async () => {
    if (isUpdateMode) {
      if (messageInput.trim() && updateMessageId) {
        try {
          await editMessageById(updateMessageId, messageInput.trim());
          setIsUpdateMode(false);
          setUpdateMessageId(null);
          setOriginalMessage('');
          setMessageInput('');
          setActiveDropdown(null);
        } catch (error) {
          console.error('Error updating message:', error);
        }
      }
    } else {
      if ((messageInput.trim() || selectedImage) && selectedConversation) {
        try {
          const messageData = { text: messageInput.trim() };
          if (selectedImage) messageData.image = selectedImage;
          await sendMessage(messageData);
          setMessageInput('');
          setSelectedImage(null);
          setImagePreview(null);
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    }
  };


  const handleRemoveImage = () => {
    if (isUpdateMode) return;
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const handleBackToContacts = () => {
    setSelectedUser(null);
  };


  const handleInfoClick = (event) => {
    event.stopPropagation();
    if (conversationInfo?.isGroup) {
      setShowInfoDropdown(!showInfoDropdown);
    } else {
      setShowFriendProfile(true);
    }
  };


  const handleAddUser = () => {
    setShowInfoDropdown(false);
    if (onShowAddUserSidebar) onShowAddUserSidebar();
  };


  const handleRenameGroup = () => {
    setShowInfoDropdown(false);
    if (!conversationInfo?.isGroup) return;
    const contactData = {
      name: conversationInfo.name,
      avatar: conversationInfo.avatar,
      isGroup: true,
      onlineStatus: conversationInfo.onlineStatus,
      participants: selectedConversation?.participants,
      groupAdmin: conversationInfo.groupAdmin,
      conversationId: conversationInfo.conversationId,
      startRename: true,
    };
    if (onShowContactInfo) onShowContactInfo(contactData);
  };


  const handleLeaveGroup = () => {
    setShowInfoDropdown(false);
    const confirmMessage = `Are you sure you want to leave "${conversationInfo.name}"?`;
    if (window.confirm(confirmMessage)) {
      leaveGroup(selectedConversation._id);
    }
  };


  const handleVideoCall = async () => {
    if (!selectedConversation || isStartingCall) return;
    try {
      const result = await startCall(selectedConversation._id);
      if (!result?.success) {
        alert(result?.error || 'Failed to start call');
      }
    } catch (error) {
      alert('Failed to start call. Please try again.');
    }
  };


  const handleVoiceCall = async () => {
    if (!selectedConversation || isStartingCall) return;
    try {
      const result = await startCall(selectedConversation._id);
      if (!result?.success) {
        alert(result?.error || 'Failed to start call');
      }
    } catch (error) {
      alert('Failed to start call. Please try again.');
    }
  };


  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };


  const handleUpdateMessage = (messageId) => {
    const messageToUpdate = messages.find((msg) => msg._id === messageId);
    if (messageToUpdate) {
      setIsUpdateMode(true);
      setUpdateMessageId(messageId);
      setOriginalMessage(messageToUpdate.text);
      setMessageInput(messageToUpdate.text);
      setActiveDropdown(null);
      setSelectedImage(null);
      setImagePreview(null);
    }
  };


  const handleDeleteMessage = (messageId) => {
    deleteMessageById(messageId);
    setActiveDropdown(null);
  };


  const handleCancelUpdate = () => {
    setIsUpdateMode(false);
    setUpdateMessageId(null);
    setOriginalMessage('');
    setMessageInput('');
    setActiveDropdown(null);
  };


  const toggleDropdown = (messageId, event) => {
    if (isUpdateMode) return;
    event.stopPropagation();
    setActiveDropdown(activeDropdown === messageId ? null : messageId);
  };


  const closeDropdown = () => {
    setActiveDropdown(null);
    setShowInfoDropdown(false);
  };


  if (showFriendProfile) {
    return (
      <ProfilePageF
        friendData={conversationInfo}
        selectedUser={selectedUser}
        onClose={() => setShowFriendProfile(false)}
      />
    );
  }


  return (
    <div
      className={`chat-area ${isMobile && !conversationInfo ? 'chat-area-mobile-hidden' : ''}`}
      onClick={closeDropdown}
    >
      {conversationInfo ? (
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
                {conversationInfo.avatar ? (
                  <img
                    src={conversationInfo.avatar}
                    alt={conversationInfo.name}
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {conversationInfo.isGroup ? (
                      <GroupIcon style={{ fontSize: 24, color: '#fff' }} />
                    ) : (
                      conversationInfo.name.charAt(0).toUpperCase()
                    )}
                  </div>
                )}
              </div>
              <div className="chat-user-details">
                <h3
                  className="chat-user-name clickable-name"
                  onClick={handleNameClick}
                  style={{ cursor: 'pointer' }}
                >
                  {conversationInfo.name}
                  {conversationInfo.isGroup && (
                    <GroupIcon style={{ fontSize: 16, marginLeft: '6px', opacity: 0.7 }} />
                  )}
                </h3>
                <span className="user-status">{conversationInfo.onlineStatus}</span>
              </div>
            </div>
            <div className="chat-actions">
              <button
                className={`chat-action-btn ${isStartingCall ? 'loading' : ''}`}
                title={conversationInfo.isGroup ? "Group Voice Call" : "Voice Call"}
                onClick={handleVoiceCall}
                disabled={isStartingCall}
              >
                <PhoneIcon style={{ fontSize: 18 }} />
                {isStartingCall && <span className="loading-indicator">●</span>}
              </button>
              <button
                className={`chat-action-btn ${isStartingCall ? 'loading' : ''}`}
                title={conversationInfo.isGroup ? "Group Video Call" : "Video Call"}
                onClick={handleVideoCall}
                disabled={isStartingCall}
              >
                <VideocamIcon style={{ fontSize: 18 }} />
                {isStartingCall && <span className="loading-indicator">●</span>}
              </button>
              
              <div className="info-dropdown-container" ref={infoDropdownRef}>
                <button
                  onClick={handleInfoClick}
                  className="chat-action-btn"
                  title={conversationInfo.isGroup ? 'Group options' : 'User info'}
                >
                  <InfoIcon style={{ fontSize: 18 }} />
                </button>
                {conversationInfo.isGroup && showInfoDropdown && (
                  <div className="info-dropdown-menu">
                    {isGroupAdmin() ? (
                      <>
                        <button className="info-dropdown-item" onClick={handleAddUser}>
                          <PersonAddIcon style={{ fontSize: 16, marginRight: '8px' }} /> Add User
                        </button>
                        <button className="info-dropdown-item" onClick={handleRenameGroup}>
                          <EditIcon style={{ fontSize: 16, marginRight: '8px' }} /> Rename Group
                        </button>
                        <button className="info-dropdown-item leave-group" onClick={handleLeaveGroup}>
                          <ExitToAppIcon style={{ fontSize: 16, marginRight: '8px' }} /> Leave Group
                        </button>
                      </>
                    ) : (
                      <button className="info-dropdown-item leave-group" onClick={handleLeaveGroup}>
                        <ExitToAppIcon style={{ fontSize: 16, marginRight: '8px' }} /> Leave Group
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`messages-container ${isUpdateMode ? 'messages-disabled' : ''}`}>
            <div className="messages-list">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <div className="no-messages-content">
                    {conversationInfo.isGroup ? (
                      <GroupIcon style={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)' }} />
                    ) : (
                      <ChatIcon style={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)' }} />
                    )}
                    <p>No messages yet</p>
                    <p>Start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`message ${message.senderId === authUser._id ? 'message-sent' : 'message-received'}`}
                  >
                    <div
                      className={`message-content ${
                        message.senderId === authUser._id
                          ? 'message-content-sent'
                          : 'message-content-received'
                      }`}
                    >
                      {message.text && <p className="message-text">{message.text}</p>}
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
                      {message.senderId === authUser._id && !isUpdateMode && (
                        <>
                          <button
                            className="message-dropdown-btn"
                            onClick={(e) => toggleDropdown(message._id, e)}
                          >
                            <MoreVertIcon />
                          </button>
                          {activeDropdown === message._id && (
                            <div className="message-dropdown-menu">
                              <button onClick={() => handleUpdateMessage(message._id)}>Update</button>
                              <button onClick={() => handleDeleteMessage(message._id)}>Delete</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {imagePreview && !isUpdateMode && (
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
            {isUpdateMode && (
              <div className="edit-message-header">
                <span>Editing message</span>
                <button className="cancel-edit-btn" onClick={handleCancelUpdate}>
                  <CloseIcon style={{ fontSize: 16 }} />
                </button>
              </div>
            )}
            <div className="message-input-box">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                style={{ display: 'none' }}
                disabled={isUpdateMode}
              />
              {!isUpdateMode && (
                <button
                  className="image-btn"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  title="Attach Image"
                >
                  <ImageIcon style={{ fontSize: 20 }} />
                </button>
              )}
              <input
                type="text"
                placeholder={
                  isUpdateMode
                    ? 'Edit your message...'
                    : `Message ${conversationInfo.name}...`
                }
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="message-input"
                autoFocus={isUpdateMode}
              />
              <button
                className={`send-button ${
                  isUpdateMode
                    ? !messageInput.trim()
                      ? 'send-button-disabled'
                      : ''
                    : !messageInput.trim() && !selectedImage
                    ? 'send-button-disabled'
                    : ''
                }`}
                onClick={handleSendMessage}
                disabled={
                  isUpdateMode
                    ? !messageInput.trim()
                    : !messageInput.trim() && !selectedImage
                }
                title={isUpdateMode ? 'Update Message' : 'Send Message'}
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

      {/* FIXED: Simplified VideoCall component rendering */}
      {call.status !== 'none' && (
        <VideoCall
          conversationInfo={conversationInfo}
          onClose={() => {
            if (call.status === 'active' || call.status === 'initiating') {
              leaveCall();
            } else if (call.status === 'receiving') {
              rejectCall();
            }
          }}
        />
      )}
    </div>
  );
};

export default ChatSection;
