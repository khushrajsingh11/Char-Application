import React, { useState, useEffect, useContext } from 'react';
import './UserSearchSidebar.css';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatContext from '../../../context/ChatContext.jsx';
import { AuthContext } from '../../../context/AuthContext';
import toast from "react-hot-toast";


const UserSearchSidebar = ({ onUserSelect, onBack, onCreateGroup, isMobile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchableUsers, setSearchableUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);


  // Context
  const { getUsersForSearch } = useContext(ChatContext);
  const { onlineUsers, authUser } = useContext(AuthContext);


  // Load users on component mount and show all users initially
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const users = await getUsersForSearch();
        console.log("Fetched users for search:", users);
        
        // Filter out the current user from the list
        const filteredUsers = users.filter(user => user._id !== authUser._id);
        
        setSearchableUsers(filteredUsers);
        setFilteredUsers(filteredUsers); // Show all users except current user from the beginning
      } catch (error) {
        console.error("Failed to load users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [getUsersForSearch, authUser._id]);


  // Filter users based on search input
  const handleSearchChange = (e) => {
    const input = e.target.value;
    setSearchTerm(input);

    if (input === '') {
      setFilteredUsers(searchableUsers); // Show all users when search is empty
      return;
    }

    const filtered = searchableUsers.filter(user =>
      user.fullname.toLowerCase().includes(input.toLowerCase())
    );
    setFilteredUsers(filtered);
    console.log("Filtered users:", filtered);
  };


  // Handle keyboard events for accessibility
  const handleKeyDown = (e, callback, ...args) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback(...args);
    }
  };


  // Handle user selection with better error handling
  const handleUserClick = (user) => {
    try {
      onUserSelect(user);
    } catch (error) {
      console.error("Error selecting user:", error);
      toast.error("Failed to select user");
    }
  };


  return (
    <div className={`user-search-sidebar ${isMobile ? 'user-search-sidebar-mobile-full' : ''}`}>
      {/* Header */}
      <div className="user-search-header">
        <button className="back-btn" onClick={onBack} aria-label="Go back">
          <ArrowBackIcon className="back-icon" />
        </button>
        <span className="header-title">New Chat</span>
      </div>

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

      {/* New Group button */}
      <div className="new-group-container">
        <button className="new-group-btn" onClick={onCreateGroup}>
          + New Group
        </button>
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
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="user-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleUserClick(user)}
                  onKeyDown={(e) => handleKeyDown(e, handleUserClick, user)}
                  style={{ cursor: 'pointer' }}
                  data-testid={`user-item-${user._id}`}
                >
                  <div className="avatar">
                    {user.profilePic ? (
                      <img 
                        src={user.profilePic} 
                        alt={user.fullname}
                        className="user-avatar-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <span className="avatar-fallback">
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
                </div>
              ))
            ) : (
              <div className="no-results">
                {searchTerm ? (
                  <>
                    <SearchIcon style={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', marginBottom: 16 }} />
                    <p>No users found for "{searchTerm}"</p>
                    <p className="no-results-subtitle">Try searching with a different name</p>
                  </>
                ) : (
                  <>
                    <SearchIcon style={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', marginBottom: 16 }} />
                    <p>No users available</p>
                    <p className="no-results-subtitle">Check back later for new users</p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserSearchSidebar;
