import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './ProfilePage.css';

const ProfilePage = () => {
  const [selectedImg, setSelectedImg] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { authUser, updateProfile } = useContext(AuthContext);

  useEffect(() => {
    if (authUser) {
      setName(authUser.fullname || authUser.name || '');
      setBio(authUser.bio || '');
      setSelectedImg(authUser.profilePic || null);
    }
  }, [authUser]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImg(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (!name.trim()) {
        alert('Name is required');
        return;
      }

      const profileData = {
        fullname: name.trim(),
        bio: bio.trim(),
        profilePic: selectedImg
      };

      await updateProfile(profileData);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
      <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
    </svg>
  );

  const renderBackgroundElements = () => (
    <>
      <div className="background-blobs">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
        <div className="blob-3"></div>
      </div>
      
      <div className="chat-icon-container">
        <div className="chat-bubble">
          <div className="chat-dots">
            <span className="chat-dot"></span>
            <span className="chat-dot"></span>
            <span className="chat-dot"></span>
          </div>
        </div>
      </div>
    </>
  );

  const renderImageUpload = () => (
    <div className="image-section">
      <div className="image-upload-container">
        <input
          type="file"
          id="profile-image"
          accept="image/*"
          onChange={handleImageChange}
          className="image-upload-input"
        />
        <label htmlFor="profile-image" className="image-upload-label">
          {selectedImg ? (
            <img src={selectedImg} alt="Profile" className="profile-image" />
          ) : (
            <div className="image-placeholder">
              {renderProfileIcon()}
            </div>
          )}
        </label>
      </div>
      <span className="image-upload-text">upload profile image</span>
    </div>
  );

  const renderFormFields = () => (
    <>
      <div className="input-group">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-input"
          placeholder="Your name"
        />
      </div>

      <div className="input-group">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="textarea-input"
          placeholder="Tell us about yourself"
          rows="3"
        />
      </div>

      <button 
        onClick={handleSubmit} 
        className="save-button"
        disabled={isLoading}
        style={{
          opacity: isLoading ? 0.7 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Saving...' : 'Save'}
      </button>
    </>
  );

  if (!authUser) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <p style={{ color: 'white', textAlign: 'center' }}>Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {renderBackgroundElements()}
      
      <div className="profile-card">
        <h2 className="profile-title">Profile details</h2>
        
        <div className="profile-form">
          {renderImageUpload()}
          {renderFormFields()}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
