import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    const fetchUser = async () => {
      try {
        if (token) {
          axios.defaults.headers.common['token'] = token;
          const { data } = await axios.get('/api/auth/getuser');

          if (data.success) {
            setAuthUser(data.userData);
            connectSocket(data.userData);
          } else {
            localStorage.removeItem('token');
          }
        }
      } catch (err) {
        console.log('Auto-login failed:', err);
        localStorage.removeItem('token');
      } finally {
        setAuthLoading(false);
      }
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    fetchUser();
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const connectSocket = (userData, existingSocket) => {
    if (!userData) return;

    if (existingSocket) existingSocket.disconnect();

    const newSocket = io(backendUrl, {
      query: { userId: userData._id },
    });

    newSocket.on('connect', () => {
      console.log('Socket connected, id:', newSocket.id);
    });

    newSocket.on('getOnlineUsers', (userIds) => {
      setOnlineUsers(userIds);
    });

    newSocket.on('disconnect', () => {
      setOnlineUsers([]);
    });

    setSocket(newSocket);
  };

  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(`/api/auth/${state}`, credentials);
      
      if (data.success) {
        setAuthUser(data.userData);
        connectSocket(data.userData, socket);
        axios.defaults.headers.common['token'] = data.token;
        setToken(data.token);
        localStorage.setItem('token', data.token);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    axios.defaults.headers.common['token'] = null;
    
    if (socket) socket.disconnect();
    toast.success('Logged out successfully');
  };

  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put('/api/auth/update-profile', body);
      
      if (data.success) {
        setAuthUser(data.user);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
    token,
    setSocket,
    setAuthUser,
    connectSocket,
    setToken,
    authLoading,
    isMobile,
    setIsMobile,
    setAuthLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
