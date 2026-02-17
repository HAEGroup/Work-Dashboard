import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../store/AuthContext';
import { io } from 'socket.io-client';
import {
  Send,
  Hash,
  User,
  Users,
  Plus,
  X,
  Search,
  Circle,
  MessageCircle,
} from 'lucide-react';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function ChatPage() {
  const { user, token } = useAuth();

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [users, setUsers] = useState([]);
  const [showDMModal, setShowDMModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket.io connection
  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      fetchChannels();
    });

    socket.on('new_message', (message) => {
      setActiveChannel((currentChannel) => {
        if (currentChannel && message.channelId === currentChannel._id) {
          setMessages((prev) => [...prev, message]);
        }
        return currentChannel;
      });
    });

    socket.on('online_users', (usersList) => {
      setOnlineUsers(usersList);
    });

    socket.on('typing', ({ channelId, user: typingUser }) => {
      setActiveChannel((currentChannel) => {
        if (currentChannel && channelId === currentChannel._id) {
          setTypingUsers((prev) => {
            if (!prev.find((u) => u._id === typingUser._id)) {
              return [...prev, typingUser];
            }
            return prev;
          });

          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u._id !== typingUser._id));
          }, 3000);
        }
        return currentChannel;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Fetch channels
  const fetchChannels = async () => {
    try {
      const res = await api.get('/chat/channels');
      setChannels(res.data);
      if (res.data.length > 0 && !activeChannel) {
        setActiveChannel(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  };

  // When active channel changes, join and fetch messages
  useEffect(() => {
    if (!activeChannel || !socketRef.current) return;

    socketRef.current.emit('join_channel', activeChannel._id);

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/channels/${activeChannel._id}/messages`);
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };

    fetchMessages();
    setTypingUsers([]);
  }, [activeChannel]);

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel || !socketRef.current) return;

    socketRef.current.emit(
      'send_message',
      { channelId: activeChannel._id, content: newMessage.trim() },
      (response) => {
        if (response && response.success) {
          setMessages((prev) => [...prev, response.message]);
        }
      }
    );

    setNewMessage('');
  };

  // Handle typing event with debounce
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (!activeChannel || !socketRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socketRef.current.emit('typing', { channelId: activeChannel._id });

    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  };

  // Create a new channel
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const res = await api.post('/chat/channels', { name: newChannelName.trim() });
      setChannels((prev) => [...prev, res.data]);
      setActiveChannel(res.data);
      setNewChannelName('');
      setShowCreateChannel(false);

      if (socketRef.current) {
        socketRef.current.emit('join_channel', res.data._id);
      }
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  // Create a direct message channel
  const handleCreateDM = async (targetUserId) => {
    try {
      const res = await api.post('/chat/channels/direct', { userId: targetUserId });
      const existingChannel = channels.find((c) => c._id === res.data._id);
      if (!existingChannel) {
        setChannels((prev) => [...prev, res.data]);
      }
      setActiveChannel(res.data);
      setShowDMModal(false);

      if (socketRef.current) {
        socketRef.current.emit('join_channel', res.data._id);
      }
    } catch (err) {
      console.error('Failed to create DM:', err);
    }
  };

  // Fetch users for DM modal
  const openDMModal = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.filter((u) => u._id !== user?._id));
      setShowDMModal(true);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // Helper: get initials from a name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper: format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper: format date header
  const formatDateHeader = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // Helper: check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.some((u) => (typeof u === 'string' ? u === userId : u._id === userId));
  };

  // Separate channels into team channels and DMs
  const teamChannels = channels.filter((c) => !c.isDirect);
  const directMessages = channels.filter((c) => c.isDirect);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = formatDateHeader(msg.createdAt || msg.timestamp);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  // Get DM display name (the other participant)
  const getDMDisplayName = (channel) => {
    if (!channel.participants) return channel.name || 'Direct Message';
    const other = channel.participants.find((p) => {
      const pId = typeof p === 'string' ? p : p._id;
      return pId !== user?._id;
    });
    if (!other) return channel.name || 'Direct Message';
    return typeof other === 'string' ? other : other.name || other.email || 'Unknown';
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Left Panel - Channel List */}
      <div className="w-64 bg-gray-900 text-gray-100 flex flex-col flex-shrink-0">
        {/* Team Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle size={20} className="text-red-400" />
            Team Chat
          </h2>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto">
          {/* Team Channels */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Channels
              </span>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Create Channel"
              >
                <Plus size={16} />
              </button>
            </div>
            {teamChannels
              .filter((c) => !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((channel) => (
                <button
                  key={channel._id}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    activeChannel?._id === channel._id
                      ? 'bg-red-700 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Hash size={16} className="flex-shrink-0 opacity-70" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
          </div>

          {/* Direct Messages */}
          <div className="px-3 py-2 mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Direct Messages
              </span>
              <button
                onClick={openDMModal}
                className="text-gray-400 hover:text-white transition-colors"
                title="New Direct Message"
              >
                <Plus size={16} />
              </button>
            </div>
            {directMessages
              .filter((c) => {
                const name = getDMDisplayName(c);
                return !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map((channel) => {
                const displayName = getDMDisplayName(channel);
                const otherUser = channel.participants?.find((p) => {
                  const pId = typeof p === 'string' ? p : p._id;
                  return pId !== user?._id;
                });
                const otherUserId = typeof otherUser === 'string' ? otherUser : otherUser?._id;

                return (
                  <button
                    key={channel._id}
                    onClick={() => setActiveChannel(channel)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                      activeChannel?._id === channel._id
                        ? 'bg-red-700 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <User size={16} className="opacity-70" />
                      {isUserOnline(otherUserId) && (
                        <Circle
                          size={8}
                          className="absolute -bottom-0.5 -right-0.5 text-green-400 fill-green-400"
                        />
                      )}
                    </div>
                    <span className="truncate">{displayName}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Online Users Indicator */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Circle size={8} className="text-green-400 fill-green-400" />
            <span>{onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChannel ? (
          <>
            {/* Channel Header */}
            <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                {activeChannel.isDirect ? (
                  <User size={20} className="text-gray-500" />
                ) : (
                  <Hash size={20} className="text-gray-500" />
                )}
                <h3 className="text-lg font-semibold text-gray-800">
                  {activeChannel.isDirect ? getDMDisplayName(activeChannel) : activeChannel.name}
                </h3>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Users size={16} />
                <span>
                  {activeChannel.participants?.length || activeChannel.memberCount || 0} members
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {Object.keys(groupedMessages).length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageCircle size={48} className="mb-3 opacity-50" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              )}

              {Object.entries(groupedMessages).map(([dateLabel, msgs]) => (
                <div key={dateLabel}>
                  {/* Date Separator */}
                  <div className="flex items-center my-4">
                    <div className="flex-1 border-t border-gray-200"></div>
                    <span className="px-3 text-xs font-medium text-gray-500">{dateLabel}</span>
                    <div className="flex-1 border-t border-gray-200"></div>
                  </div>

                  {/* Messages */}
                  {msgs.map((msg, idx) => {
                    const sender = msg.sender || msg.user || {};
                    const senderName = sender.name || sender.email || 'Unknown';
                    const senderId = sender._id || sender.id;
                    const isOwn = senderId === user?._id;

                    // Check if same sender as previous message (for grouping)
                    const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                    const prevSenderId = prevMsg
                      ? (prevMsg.sender || prevMsg.user || {})._id || (prevMsg.sender || prevMsg.user || {}).id
                      : null;
                    const isSameSender = prevSenderId === senderId;

                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex items-start gap-3 ${isSameSender ? 'mt-0.5' : 'mt-4'} hover:bg-gray-50 px-2 py-0.5 rounded`}
                      >
                        {/* Avatar */}
                        {!isSameSender ? (
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                              isOwn ? 'bg-red-600' : 'bg-gray-600'
                            }`}
                          >
                            {getInitials(senderName)}
                          </div>
                        ) : (
                          <div className="w-9 flex-shrink-0"></div>
                        )}

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          {!isSameSender && (
                            <div className="flex items-baseline gap-2">
                              <span className={`text-sm font-bold ${isOwn ? 'text-red-700' : 'text-gray-900'}`}>
                                {senderName}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTime(msg.createdAt || msg.timestamp)}
                              </span>
                            </div>
                          )}
                          <p className="text-sm text-gray-800 break-words">{msg.content || msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-6 py-1 text-xs text-gray-500 italic">
                {typingUsers.map((u) => u.name || u.email).join(', ')}{' '}
                {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Message Input */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={`Message ${
                    activeChannel.isDirect
                      ? getDMDisplayName(activeChannel)
                      : '#' + activeChannel.name
                  }`}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send size={16} />
                  <span className="text-sm font-medium">Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageCircle size={64} className="mb-4 opacity-30" />
            <p className="text-xl font-medium mb-1">Welcome to Team Chat</p>
            <p className="text-sm">Select a channel or start a conversation</p>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Create Channel</h3>
              <button
                onClick={() => {
                  setShowCreateChannel(false);
                  setNewChannelName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Name
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent">
                  <Hash size={16} className="ml-3 text-gray-400" />
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. maintenance-team"
                    className="flex-1 px-2 py-2.5 text-sm focus:outline-none rounded-r-lg"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateChannel(false);
                    setNewChannelName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChannelName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New DM Modal */}
      {showDMModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">New Direct Message</h3>
              <button
                onClick={() => setShowDMModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No users found</p>
              ) : (
                users.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => handleCreateDM(u._id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 rounded-lg bg-gray-600 text-white flex items-center justify-center text-sm font-semibold">
                        {getInitials(u.name || u.email)}
                      </div>
                      {isUserOnline(u._id) && (
                        <Circle
                          size={10}
                          className="absolute -bottom-0.5 -right-0.5 text-green-400 fill-green-400"
                        />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800">{u.name || u.email}</p>
                      {u.role && (
                        <p className="text-xs text-gray-500">{u.role}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
