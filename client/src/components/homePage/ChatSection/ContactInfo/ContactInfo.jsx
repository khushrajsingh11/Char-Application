import React, { useContext, useEffect, useState } from 'react';
import './ContactInfo.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupIcon from '@mui/icons-material/Group';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ConversationContext from '../../../../context/ConversationContext.jsx';

const ContactInfo = ({ contactData, onBack, isMobile }) => {
  const { renameGroup, setSelectedConversation } = useContext(ConversationContext);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (contactData?.startRename) {
      setIsRenaming(true);
      setNewName(contactData.name || '');
    } else {
      setIsRenaming(false);
      setNewName('');
    }
  }, [contactData]);

  if (!contactData) return null;

  return (
    <div className="contact-info-container">
      <div className="contact-info-header">
        <button className="contact-back-btn" onClick={onBack}>
          <ArrowBackIcon style={{ fontSize: 20 }} />
        </button>
        <h3 className="contact-info-title">
          {contactData.isGroup ? 'Group Info' : 'Contact Info'}
        </h3>
      </div>

      <div className="contact-info-content">
        <div className="contact-profile-section">
          <div className="contact-avatar-large">
            {contactData.avatar ? (
              <img 
                src={contactData.avatar} 
                alt={contactData.name}
                className="contact-avatar-image"
              />
            ) : (
              <div className="contact-avatar-placeholder">
                {contactData.isGroup ? (
                  <GroupIcon style={{ fontSize: 60, color: '#fff' }} />
                ) : (
                  contactData.name.charAt(0).toUpperCase()
                )}
              </div>
            )}
          </div>
          <div className="contact-details">
            {!contactData.isGroup ? (
              <h2 className="contact-name">{contactData.name}</h2>
            ) : (
              <div className="rename-row">
                {!isRenaming ? (
                  <>
                    <h2 className="contact-name" style={{ marginRight: 8 }}>{contactData.name}</h2>
                    <button
                      className="rename-btn"
                      title="Rename group"
                      onClick={() => { setIsRenaming(true); setNewName(contactData.name || ''); }}
                    >
                      <EditIcon style={{ fontSize: 16 }} />
                    </button>
                  </>
                ) : (
                  <div className="rename-controls">
                    <input
                      className="rename-input"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter new group name"
                      autoFocus
                    />
                    <button
                      className="rename-confirm"
                      title="Save"
                      onClick={async () => {
                        const trimmed = newName.trim();
                        if (!trimmed || trimmed === contactData.name) {
                          setIsRenaming(false);
                          return;
                        }
                        try {
                          const updated = await renameGroup(contactData.conversationId, trimmed);
                          if (updated) {
                            setSelectedConversation(updated);
                          }
                          setIsRenaming(false);
                        } catch {
                          setIsRenaming(false);
                        }
                      }}
                    >
                      <CheckIcon style={{ fontSize: 16 }} />
                    </button>
                    <button
                      className="rename-cancel"
                      title="Cancel"
                      onClick={() => { setIsRenaming(false); setNewName(''); }}
                    >
                      <CloseIcon style={{ fontSize: 16 }} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {!contactData.isGroup && contactData.phone && (
              <p className="contact-phone">{contactData.phone}</p>
            )}
            {contactData.isGroup && (
              <p className="contact-group-info">{contactData.onlineStatus}</p>
            )}
          </div>
        </div>

        <div className="contact-info-section">
          <div className="contact-section-header">
            <h4>About</h4>
          </div>
          <div className="contact-section-content">
            <p className="contact-about">
              {contactData.about ||
                (contactData.isGroup
                  ? 'Group chat for staying connected'
                  : 'Available')}
            </p>
          </div>
        </div>

        {!contactData.isGroup && (
          <div className="contact-info-section">
            <div className="contact-section-header">
              <h4>Contact Info</h4>
            </div>
            <div className="contact-section-content">
              {contactData.phone && (
                <div className="contact-info-item">
                  <span className="contact-info-label">Phone</span>
                  <span className="contact-info-value">{contactData.phone}</span>
                </div>
              )}
              {contactData.email && (
                <div className="contact-info-item">
                  <span className="contact-info-label">Email</span>
                  <span className="contact-info-value">{contactData.email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {contactData.isGroup && contactData.participants && (
          <div className="contact-info-section">
            <div className="contact-section-header">
              <h4>Members ({contactData.participants.length})</h4>
            </div>
            <div className="contact-section-content">
              {contactData.participants.map((member, index) => (
                <div key={index} className="group-member-item">
                  <div className="member-avatar">
                    {member.profilePic ? (
                      <img src={member.profilePic} alt={member.fullname} />
                    ) : (
                      <div className="member-avatar-placeholder">
                        {member.fullname.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="member-info">
                    <span className="member-name">{member.fullname}</span>
                    {member._id === contactData.groupAdmin && (
                      <span className="admin-badge">Admin</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactInfo;
