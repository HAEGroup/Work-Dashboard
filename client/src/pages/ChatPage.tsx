import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageCircle, Send, Users, Hash, User as UserIcon,
  RefreshCw, LogOut, ChevronDown, Loader2,
} from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/shared/PageHeader';

interface Space {
  name: string;
  displayName: string;
  type: string;
  spaceThreadingState?: string;
  singleUserBotDm?: boolean;
  spaceDetails?: { description?: string };
  membershipCount?: number;
}

interface Message {
  name: string;
  sender: {
    name: string;
    displayName: string;
    type: string;
    avatarUrl?: string;
  };
  text: string;
  formattedText?: string;
  createTime: string;
  lastUpdateTime?: string;
  thread?: { name: string };
}

interface ChatStatus {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
}

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [spaceFilter, setSpaceFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (status?.connected) loadSpaces();
  }, [status?.connected]);

  useEffect(() => {
    if (searchParams.get('google') === 'connected') loadStatus();
  }, [searchParams]);

  async function loadStatus() {
    try {
      const { data } = await api.get('/chat/google/status');
      setStatus(data);
    } catch (err) {
      console.error('Failed to load chat status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function connectGoogle() {
    setError('');
    try {
      const { data } = await api.get('/chat/google/auth-url');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect to Google Chat');
    }
  }

  async function disconnectGoogle() {
    try {
      await api.post('/chat/google/disconnect');
      setStatus({ configured: true, connected: false, googleEmail: null });
      setSpaces([]);
      setActiveSpace(null);
      setMessages([]);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  }

  async function loadSpaces() {
    try {
      const { data } = await api.get('/chat/spaces');
      setSpaces(data.spaces);
      if (data.spaces.length > 0 && !activeSpace) {
        selectSpace(data.spaces[0]);
      }
    } catch (err: any) {
      console.error('Failed to load spaces:', err);
      if (err.response?.status === 500) {
        setError('Failed to load spaces. Your Google Chat connection may have expired.');
      }
    }
  }

  async function selectSpace(space: Space) {
    setActiveSpace(space);
    setMessages([]);
    setNextPageToken(null);
    await loadMessages(space);
  }

  async function loadMessages(space: Space, pageToken?: string) {
    const spaceId = space.name.replace('spaces/', '');
    setLoadingMessages(true);
    try {
      const params: Record<string, string> = {};
      if (pageToken) params.pageToken = pageToken;

      const { data } = await api.get(`/chat/spaces/${spaceId}/messages`, { params });
      // Messages come in desc order from API, reverse for display
      const newMessages = [...(data.messages || [])].reverse();

      if (pageToken) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
        // Scroll to bottom on initial load
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
      }
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !activeSpace || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const spaceId = activeSpace.name.replace('spaces/', '');
      const { data } = await api.post(`/chat/spaces/${spaceId}/messages`, { text });
      setMessages(prev => [...prev, data.message]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessageText(text); // Restore the message on failure
    } finally {
      setSending(false);
    }
  }

  function loadOlderMessages() {
    if (activeSpace && nextPageToken && !loadingMessages) {
      loadMessages(activeSpace, nextPageToken);
    }
  }

  function getSpaceIcon(space: Space) {
    if (space.type === 'DIRECT_MESSAGE') return <UserIcon className="h-4 w-4" />;
    if (space.type === 'GROUP_CHAT') return <Users className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  }

  function getSpaceLabel(space: Space) {
    return space.displayName || 'Direct Message';
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  }

  function shouldShowSender(msg: Message, idx: number) {
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    return prev.sender.name !== msg.sender.name ||
      new Date(msg.createTime).getTime() - new Date(prev.createTime).getTime() > 300000;
  }

  const filteredSpaces = spaceFilter
    ? spaces.filter(s => getSpaceLabel(s).toLowerCase().includes(spaceFilter.toLowerCase()))
    : spaces;

  // Loading state
  if (loading) {
    return (
      <div>
        <PageHeader title="Chat" />
        <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
      </div>
    );
  }

  // Not configured
  if (status && !status.configured) {
    return (
      <div>
        <PageHeader title="Chat" />
        <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-700 dark:text-amber-300">
          Google Chat requires Google OAuth credentials. Set <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">GOOGLE_CLIENT_SECRET</code> in your environment variables, and enable the <strong>Google Chat API</strong> in your Google Cloud Console.
        </div>
      </div>
    );
  }

  // Not connected
  if (status && !status.connected) {
    return (
      <div>
        <PageHeader title="Chat" />
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}
        <div className="flex flex-col items-center justify-center h-64">
          <MessageCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Connect Your Google Chat</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">
            Each user connects their own Google Workspace account. Sign in with your Google account to view and send messages in your Chat spaces.
          </p>
          <button onClick={connectGoogle} className="btn-primary">
            <MessageCircle className="h-4 w-4 mr-2" /> Connect Google Chat
          </button>
        </div>
      </div>
    );
  }

  // Connected - show chat interface
  return (
    <div className="h-[calc(100vh-2rem)]">
      <PageHeader
        title="Chat"
        actions={
          <div className="flex items-center gap-2">
            {status?.googleEmail && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                {status.googleEmail}
              </span>
            )}
            <button onClick={loadSpaces} className="btn-ghost btn-sm" title="Refresh spaces">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={disconnectGoogle} className="btn-ghost btn-sm text-red-500" title="Disconnect Google Chat">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="flex h-[calc(100%-4.5rem)] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Spaces sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col">
          <div className="p-2">
            <input
              className="input text-sm"
              placeholder="Search spaces..."
              value={spaceFilter}
              onChange={e => setSpaceFilter(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredSpaces.map(space => (
              <button
                key={space.name}
                onClick={() => selectSpace(space)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  activeSpace?.name === space.name
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-gray-400 flex-shrink-0">{getSpaceIcon(space)}</span>
                <span className="truncate">{getSpaceLabel(space)}</span>
              </button>
            ))}
            {filteredSpaces.length === 0 && spaces.length > 0 && (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">No matching spaces</p>
            )}
            {spaces.length === 0 && (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">No spaces found</p>
            )}
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {activeSpace ? (
            <>
              {/* Space header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-400">{getSpaceIcon(activeSpace)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {getSpaceLabel(activeSpace)}
                  </h3>
                  {activeSpace.spaceDetails?.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activeSpace.spaceDetails.description}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3">
                {nextPageToken && (
                  <div className="text-center mb-4">
                    <button
                      onClick={loadOlderMessages}
                      className="btn-ghost btn-sm text-xs"
                      disabled={loadingMessages}
                    >
                      {loadingMessages ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading...</>
                      ) : (
                        <><ChevronDown className="h-3 w-3 mr-1 rotate-180" /> Load older messages</>
                      )}
                    </button>
                  </div>
                )}

                {loadingMessages && messages.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading messages...
                  </div>
                )}

                {!loadingMessages && messages.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                    No messages yet
                  </div>
                )}

                <div className="space-y-0.5">
                  {messages.map((msg, idx) => {
                    const showSender = shouldShowSender(msg, idx);
                    const isBot = msg.sender.type === 'BOT';
                    return (
                      <div key={msg.name} className={`group ${showSender ? 'mt-3' : ''}`}>
                        {showSender && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium flex-shrink-0 ${
                              isBot
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                : 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                            }`}>
                              {msg.sender.displayName?.[0]?.toUpperCase() || '?'}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {msg.sender.displayName || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400">{formatTime(msg.createTime)}</span>
                          </div>
                        )}
                        <div className="pl-9">
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {/* Send message */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder={`Message ${getSpaceLabel(activeSpace)}...`}
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="btn-primary px-3"
                    disabled={!messageText.trim() || sending}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="h-10 w-10 mb-3" />
              <p className="text-sm">Select a space to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
