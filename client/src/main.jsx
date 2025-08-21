// src/main.jsx

import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext.jsx'; // Adjust the import path as needed
import { ChatProvider } from '../src/context/ChatContext';
import { ConversationProvider } from '../src/context/ConversationContext';
import { CallProvider } from '../src/context/CallContext'; // 1. Import the CallProvider

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
    <AuthProvider>
      <ConversationProvider>
        <CallProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </CallProvider>
      </ConversationProvider>
    </AuthProvider>
  </BrowserRouter>
);