import React, { useState, useEffect, useContext } from 'react';
import './AddUserToGroupSidebar.css';
import axios from 'axios';
import toast from "react-hot-toast";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';
import { AuthContext } from '../../../context/AuthContext';
import ConversationContext from '../../../context/ConversationContext';


const AddUserToGroupSidebar = ({ currentConversation, onBack, onAddUsers, isMobile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);


  const { authUser } = useContext(AuthContext);
  const { addUserToGroup } = useContext(ConversationContext);


  // Get current participants IDs for filtering
  const currentParticipantIds = currentConversation?.participants?.map(p => p._id) || [];


  useEffect(() => {
    fetchAvailableUsers();
  }, []);


  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim()) {
      const filtered = allUsers.filter(user =>
        user.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(allUsers);
    }
  }, [searchTerm, allUsers]);


  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/auth/getalluser');

      const availableUsers = data.users.filter(user => 
        !currentParticipantIds.includes(user._id) &&
        user._id !== authUser._id
      );

      setAllUsers(availableUsers);
      setFilteredUsers(availableUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };


  const handleUserToggle = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAddUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.warning("Please select at least one user.");
      return;
    }

    try {
      // Only call the parent's onAddUsers callback
      await onAddUsers(selectedUsers);
      
      // Update the local state after successful addition
      const addedUserIds = selectedUsers.map(user => user._id);
      
      // Remove successfully added users from both states
      setAllUsers(prev => prev.filter(user => !addedUserIds.includes(user._id)));
      setFilteredUsers(prev => prev.filter(user => !addedUserIds.includes(user._id)));
      
      // Clear selected users
      setSelectedUsers([]);
      
    } catch (error) {
      console.error("Error adding users:", error);
      toast.error("Failed to add users to group");
    }
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (e, callback, ...args) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback(...args);
    }
  };


  return (
    <div className={`add-user-sidebar ${isMobile ? 'add-user-sidebar-mobile' : ''}`}>
      {/* Header */}
      <div className="add-user-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowBackIcon style={{ fontSize: 20 }} />
        </button>
        <div className="add-user-title">
          <h3>Add Members</h3>
          <p>
            <GroupIcon style={{ fontSize: 14, marginRight: '4px', opacity: 0.7 }} />
            {currentConversation?.groupName || 'Group'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="add-user-search">
        <div className="search-box">
          <SearchIcon style={{ fontSize: 18 }} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Selected users summary */}
      {selectedUsers.length > 0 && (
        <div className="selected-users-summary">
          <div className="selected-count">
            <CheckCircleIcon style={{ fontSize: 16, marginRight: '6px', color: '#4CAF50' }} />
            <span>{selectedUsers.length} user(s) selected</span>
          </div>
          <div className="selected-users-preview">
            {selectedUsers.slice(0, 3).map((user, index) => (
              <div key={user._id} className="selected-user-chip">
                <div className="selected-user-avatar">
                  {user.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt={user.fullname}
                      className="chip-avatar-image"
                    />
                  ) : (
                    user.fullname.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="selected-user-name">
                  {user.fullname.split(' ')[0]}
                </span>
              </div>
            ))}
            {selectedUsers.length > 3 && (
              <div className="selected-user-chip more-users">
                +{selectedUsers.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="add-user-list">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="no-users">
            <GroupIcon style={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)' }} />
            <p>
              {searchTerm ? 'No users found' : 'No users available to add'}
            </p>
            {searchTerm && (
              <p className="no-users-subtitle">Try a different search term</p>
            )}
          </div>
        ) : (
          <>
            <div className="users-list-header">
              <h4>Available Users ({filteredUsers.length})</h4>
            </div>
            {filteredUsers.map(user => {
              const isSelected = selectedUsers.find(u => u._id === user._id);
              
              return (
                <div
                  key={user._id}
                  className={`add-user-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleUserToggle(user)}
                  onKeyDown={(e) => handleKeyDown(e, handleUserToggle, user)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="user-avatar">
                    {user.profilePic ? (
                      <img
                        src={user.profilePic}
                        alt={user.fullname}
                        className="avatar-image"
                      />
                    ) : (
                      user.fullname.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="user-info">
                    <h4 className="user-name">{user.fullname}</h4>
                    <p className="user-email">{user.email}</p>
                  </div>
                  <div className="selection-indicator">
                    {isSelected ? (
                      <CheckCircleIcon style={{ color: '#4CAF50', fontSize: 24 }} />
                    ) : (
                      <div className="selection-circle"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer with add button */}
      {selectedUsers.length > 0 && (
        <div className="add-user-footer">
          <button
            className="add-users-btn"
            onClick={handleAddUsers}
            disabled={loading}
          >
            <PersonAddIcon style={{ fontSize: 18, marginRight: '8px' }} />
            Add {selectedUsers.length} Member{selectedUsers.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
};

export default AddUserToGroupSidebar;
