import React, { useState, useEffect, useContext } from 'react';
import './GroupCreationSidebar.css';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ChatContext from '../../../context/ChatContext.jsx';
import { AuthContext } from '../../../context/AuthContext';
import toast from "react-hot-toast";


const GroupCreationSidebar = ({ onBack, onGroupCreate, isMobile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);


  // Context
  const { fetchAllUsers } = useContext(ChatContext);
  const { onlineUsers, authUser } = useContext(AuthContext);


  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const allUsers = await fetchAllUsers();
        // Filter out the current user since backend adds auth user by default
        const filteredUsers = allUsers.filter(user => user._id !== authUser._id);
        setUsers(filteredUsers);
        setFilteredUsers(filteredUsers); // Show all users except auth user
      } catch (error) {
        console.error("Failed to load users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [fetchAllUsers, authUser._id]);


  // Filter users based on search input
  const handleSearchChange = (e) => {
    const input = e.target.value;
    setSearchTerm(input);

    if (input === '') {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user =>
      user.fullname.toLowerCase().includes(input.toLowerCase())
    );
    setFilteredUsers(filtered);
  };


  // Handle user selection/deselection
  const handleUserSelect = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(selectedUser => selectedUser._id === user._id);
      
      if (isSelected) {
        // Remove user from selection
        return prev.filter(selectedUser => selectedUser._id !== user._id);
      } else {
        // Add user to selection
        return [...prev, user];
      }
    });
  };


  // Remove selected user
  const removeSelectedUser = (userId) => {
    setSelectedUsers(prev => prev.filter(user => user._id !== userId));
  };


  // Handle group creation
  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    try {
      // Call the group creation function passed from parent
      // Backend will automatically add the auth user, so we only send selected users
      await onGroupCreate({
        groupName: `Group with ${selectedUsers.length + 1} members`, // +1 for auth user added by backend
        selectedUsers: selectedUsers
      });
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Failed to create group");
    }
  };


  // Check if user is selected
  const isUserSelected = (userId) => {
    return selectedUsers.some(user => user._id === userId);
  };


  return (
    <div className={`group-creation-sidebar ${isMobile ? 'group-creation-sidebar-mobile-full' : ''}`}>
      {/* Header */}
      <div className="group-creation-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowBackIcon className="back-icon" />
        </button>
        <span className="header-title">Create Group</span>
      </div>

      {/* Selected Users Display */}
      {selectedUsers.length > 0 && (
        <div className="selected-users-container">
          <div className="selected-users-header">
            <span>Selected ({selectedUsers.length})</span>
          </div>
          <div className="selected-users-grid">
            {selectedUsers.map((user) => (
              <div key={user._id} className="selected-user-card">
                <div className="selected-user-avatar">
                  {user.profilePic ? (
                    <img 
                      src={user.profilePic} 
                      alt={user.fullname}
                      className="selected-user-avatar-image"
                    />
                  ) : (
                    <span className="avatar-text">
                      {user.fullname.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="selected-user-name">{user.fullname}</span>
                <button 
                  className="remove-user-btn"
                  onClick={() => removeSelectedUser(user._id)}
                  title="Remove user"
                >
                  {/* Simple cross will be handled by CSS */}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="search-container">
        <div className="search-box">
          <SearchIcon style={{ fontSize: 16 }} />
          <input
            onChange={handleSearchChange}
            type="text"
            placeholder="Search Users..."
            className="search-input"
            value={searchTerm}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Users list */}
      <div className="users-list">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : (
          <>
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className={`user-item ${isUserSelected(user._id) ? 'user-item-selected' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handleUserSelect(user)}
                style={{ cursor: 'pointer' }}
              >
                <div className="avatar">
                  {user.profilePic ? (
                    <img 
                      src={user.profilePic} 
                      alt={user.fullname}
                      className="user-avatar-image"
                    />
                  ) : (
                    <span className="avatar-text">
                      {user.fullname.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {onlineUsers.includes(user._id) && <div className="online-indicator"></div>}
                </div>
                <div className="user-info">
                  <div className="user-header">
                    <h4 className="user-name">{user.fullname}</h4>
                  </div>
                  {onlineUsers.includes(user._id) && (
                    <span className="user-status">online</span>
                  )}
                </div>
                {isUserSelected(user._id) && (
                  <div className="selected-indicator">
                    <div className="selected-dot"></div>
                  </div>
                )}
              </div>
            ))}

            {!loading && filteredUsers.length === 0 && searchTerm && (
              <div className="no-results">
                <SearchIcon style={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', marginBottom: 16 }} />
                <p>No users found for "{searchTerm}"</p>
                <p className="no-results-subtitle">Try searching with a different name</p>
              </div>
            )}

            {!loading && users.length === 0 && !searchTerm && (
              <div className="no-results">
                <SearchIcon style={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', marginBottom: 16 }} />
                <p>No users available</p>
                <p className="no-results-subtitle">Check back later for new users</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Group Button */}
      {selectedUsers.length > 0 && (
        <div className="create-group-container">
          <button className="create-group-btn" onClick={handleCreateGroup}>
            <GroupAddIcon style={{ fontSize: 18, marginRight: 8 }} />
            Create Group ({selectedUsers.length + 1} members)
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupCreationSidebar;
