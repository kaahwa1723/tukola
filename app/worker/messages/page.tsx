'use client';

import { useState, useEffect } from 'react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MOCK_CONVERSATIONS } from '@/lib/data';
import { useKola } from '@/lib/store';
import { Send, MessageSquareDashed } from 'lucide-react';
import type { Conversation } from '@/lib/types';

export default function WorkerMessagesPage() {
  const { user } = useKola();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [apiLoaded, setApiLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/messages?userId=${user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.conversations?.length) {
          setMessages(data.conversations);
        }
        setApiLoaded(true);
      })
      .catch(() => setApiLoaded(true));
  }, [user?.id]);

  const conversation = messages.find(c => c.id === activeConv);

  const handleSend = () => {
    if (!newMessage.trim() || !activeConv) return;
    const text = newMessage.trim();
    const conv = messages.find(c => c.id === activeConv);

    // Optimistic update
    setMessages(prev =>
      prev.map(c => {
        if (c.id !== activeConv) return c;
        return {
          ...c,
          lastMessage: text,
          lastMessageTime: 'Just now',
          unread: 0,
          messages: [
            ...(c.messages || []),
            {
              id: `m_${Date.now()}`,
              fromId: user?.id ?? 'current',
              toId: c.otherUserId,
              fromName: user?.name ?? 'You',
              text,
              timestamp: new Date().toISOString(),
              read: true,
            },
          ],
        };
      })
    );
    setNewMessage('');

    // Persist to backend
    if (user && conv) {
      fetch(`/api/messages/${activeConv}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: user.id,
          toId: conv.otherUserId,
          fromName: user.name,
          text,
        }),
      }).catch(e => console.warn('[send message]', e));
    }
  };

  if (activeConv && conversation) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-60px)]">
        {/* Chat header */}
        <header className="sticky top-0 bg-white z-40 px-4 py-3 flex items-center gap-3 border-b border-slate-100 shadow-sm lg:max-w-4xl lg:mx-auto lg:w-full">
          <button
            onClick={() => setActiveConv(null)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 active:bg-slate-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-600">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-bold text-sm">
              {conversation.otherUserName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{conversation.otherUserName}</p>
            {conversation.jobTitle && (
              <p className="text-xs text-slate-500">{conversation.jobTitle}</p>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50 lg:max-w-4xl lg:mx-auto lg:w-full">
          {(conversation.messages || []).map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.fromId === (user?.id ?? 'current') ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.fromId === (user?.id ?? 'current')
                    ? 'text-white rounded-br-sm'
                    : 'bg-white text-slate-900 border border-slate-100 shadow-sm rounded-bl-sm'
                }`}
                style={msg.fromId === (user?.id ?? 'current') ? { background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' } : undefined}
              >
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.fromId === 'current' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="lg:max-w-4xl lg:mx-auto lg:w-full bg-white border-t border-slate-100 px-4 py-3 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-nav lg:pb-0">
      <MobileHeader title="Messages" showNotification />

      <div className="px-4 lg:px-6 py-4 max-w-4xl lg:mx-auto">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EEF2FF' }}>
              <MessageSquareDashed size={28} color="#2952E8" strokeWidth={1.5} />
            </div>
            <p className="font-bold text-[#0A0F2C]">No messages yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Messages from employers will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 active:bg-slate-50 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-bold text-base">
                      {conv.otherUserName.charAt(0)}
                    </span>
                  </div>
                  {conv.unread > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{conv.unread}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-bold text-slate-900 text-sm">{conv.otherUserName}</p>
                    <p className="text-xs text-slate-400">{conv.lastMessageTime}</p>
                  </div>
                  {conv.jobTitle && (
                    <p className="text-[11px] text-blue-600 font-medium mb-0.5">{conv.jobTitle}</p>
                  )}
                  <p className={`text-sm truncate ${conv.unread > 0 ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
