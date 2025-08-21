import React, { useState, useRef } from 'react';
import './GroupSetupSidebar.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import GroupIcon from '@mui/icons-material/Group';
import toast from "react-hot-toast";
import axios from 'axios';
import ConversationContext from '../../../context/ConversationContext';
import { useContext } from 'react';


const GroupSetupSidebar = ({ selectedUsers, onBack, onProceed, isMobile }) => {
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState(null);
  const [groupImagePreview, setGroupImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const {setConversations} = useContext(ConversationContext)


  // Handle image selection
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
    const file = e.target.files[0];
    if (!file) return;
    try {
      const uploadIMG = await uploadToCloudinary(file);
      setGroupImagePreview(uploadIMG.secure_url);
      setGroupImage(uploadIMG.secure_url);
    } catch (error) {
      console.log(error.message);
    }
  };

  // Trigger file input
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setGroupImage(null);
    setGroupImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle final group creation
 const handleProceed = async () => {
  if (!groupName.trim()) {
    toast.error('Please enter a group name');
    return;
  }

  if (groupName.trim().length < 2) {
    toast.error('Group name must be at least 2 characters');
    return;
  }

  if (groupName.trim().length > 50) {
    toast.error('Group name must be less than 50 characters');
    return;
  }

  setLoading(true);
  try {
    // Call the parent function with complete group details for actual creation
    const data = await onProceed({
      groupName: groupName.trim(),
      groupImage: groupImage,
      selectedUsers: selectedUsers // Pass the users received from GroupCreationSidebar
    });
    setConversations((prev) => [data, ...prev]);
  } catch (error) {
    console.error('Failed to create group:', error);
    toast.error('Failed to create group');
  } finally {
    setLoading(false);
  }
};


  // Handle keyboard events for accessibility
  const handleKeyDown = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  return (
    <div className={`group-setup-sidebar ${isMobile ? 'group-setup-sidebar-mobile-full' : ''}`}>
      {/* Header */}
      <div className="group-setup-header">
        <button className="back-btn" onClick={onBack} aria-label="Go back">
          <ArrowBackIcon className="back-icon" />
        </button>
        <span className="header-title">New Group</span>
      </div>

      {/* Content */}
      <div className="group-setup-content">
        
        {/* Group Image Section */}
        <div className="group-image-section">
          <div 
            className="group-image-container" 
            onClick={handleImageClick}
            onKeyDown={(e) => handleKeyDown(e, handleImageClick)}
            tabIndex={0}
            role="button"
            aria-label="Select group photo"
          >
            {groupImagePreview ? (
              <div className="group-image-preview">
                <img 
                  src={groupImagePreview} 
                  alt="Group preview" 
                  className="group-image"
                />
                <div className="image-overlay">
                  <CameraAltIcon className="camera-icon" />
                </div>
              </div>
            ) : (
              <div className="group-image-placeholder">
                <CameraAltIcon className="camera-icon-large" />
                <span className="add-photo-text">Add Group Photo</span>
              </div>
            )}
          </div>
          
          {groupImagePreview && (
            <button 
              className="remove-image-btn" 
              onClick={handleRemoveImage}
              type="button"
              aria-label="Remove group photo"
            >
              Remove Photo
            </button>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: 'none' }}
            aria-hidden="true"
          />
        </div>

        {/* Group Name Section */}
        <div className="group-name-section">
          <div className="input-container">
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="group-name-input"
              maxLength={50}
              autoComplete="off"
              aria-label="Enter group name"
            />
            <div className="input-underline"></div>
          </div>
          <div className="character-count">
            {groupName.length}/50
          </div>
        </div>

        {/* Selected Members Preview */}
        <div className="selected-members-section">
          <div className="members-header">
            <GroupIcon className="group-icon" />
            <span>Members: {selectedUsers.length + 1}</span>
          </div>
          
          <div className="members-grid">
            {selectedUsers.slice(0, 8).map((user) => (
              <div key={user._id} className="member-card">
                <div className="member-avatar">
                  {user.profilePic ? (
                    <img 
                      src={user.profilePic} 
                      alt={user.fullname}
                      className="member-avatar-image"
                    />
                  ) : (
                    <span className="member-avatar-text">
                      {user.fullname.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="member-name" title={user.fullname}>
                  {user.fullname}
                </span>
              </div>
            ))}
            
            {selectedUsers.length > 8 && (
              <div className="member-card more-members-card">
                <div className="member-avatar more-members-avatar">
                  <span className="more-text">+{selectedUsers.length - 8}</span>
                </div>
                <span className="member-name">More</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proceed Button */}
      <div className="proceed-container">
        <button 
          className={`proceed-btn ${!groupName.trim() || loading ? 'proceed-btn-disabled' : ''}`}
          onClick={handleProceed}
          disabled={!groupName.trim() || loading}
          aria-label={loading ? 'Creating group...' : 'Create group'}
        >
          {loading ? (
            <>
              <div className="loading-spinner-small"></div>
              Creating Group...
            </>
          ) : (
            'Proceed'
          )}
        </button>
      </div>
    </div>
  );
};

export default GroupSetupSidebar;
