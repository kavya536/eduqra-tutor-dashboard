import { Send, User, Check, CheckCheck, ChevronLeft, X, Edit2 } from 'lucide-react';
import { ChatContact } from '../types';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChatProps {
  contacts: ChatContact[];
  activeContactId: string | null;
  onContactSelect: (id: string) => void;
  onSendMessage: (contactId: string, text: string, messageId?: number) => void;
}

export function Chat({ contacts, activeContactId, onContactSelect, onSendMessage }: ChatProps) {
  const [inputText, setInputText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(!!activeContactId);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const activeContact = contacts.find(c => c.id === activeContactId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeContact?.messages && !editingMessageId) {
      scrollToBottom();
    }
  }, [activeContact?.messages, editingMessageId]);

  useEffect(() => {
    if (activeContactId) {
      setShowMobileChat(true);
      setEditingMessageId(null);
      setInputText('');
    }
  }, [activeContactId]);

  const handleSend = () => {
    if (inputText.trim() && activeContactId) {
      onSendMessage(activeContactId, inputText, editingMessageId || undefined);
      setInputText('');
      setEditingMessageId(null);
    }
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setInputText('');
  };

  return (
    <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 -mt-2 md:-mt-4">
      <div className="flex items-center justify-between mb-2 md:mb-3 shrink-0">
        <h2 className="text-2xl font-black text-on-surface tracking-tight">Messages</h2>
        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live Support</span>
        </div>
      </div>

      <div className="flex bg-white rounded-xl md:rounded-3xl atelier-card-shadow overflow-hidden flex-1 border border-surface-variant relative">
        {/* Left Panel - Contacts */}
        <div className={cn(
          "w-full md:w-[320px] lg:w-[400px] border-r border-surface-variant flex flex-col bg-slate-50/30 transition-all duration-300 shrink-0",
          showMobileChat ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 md:p-6 border-b border-surface-variant flex items-center justify-between bg-white">
            <h4 className="font-black text-sm uppercase tracking-widest text-on-surface">Students</h4>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-md">{contacts.length}</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 md:p-3 space-y-1 md:space-y-2">
            {contacts.map((contact, i) => (
              <motion.button
                key={contact.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => { onContactSelect(contact.id); setShowMobileChat(true); }}
                className={cn(
                  "w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all text-left group relative",
                  activeContactId === contact.id 
                    ? "bg-primary/10 shadow-sm" 
                    : "hover:bg-slate-100/80"
                )}
              >
                {activeContactId === contact.id && (
                  <motion.div layoutId="active-pill" className="absolute left-0 top-3 bottom-3 md:top-4 md:bottom-4 w-1 bg-primary rounded-r-full" />
                )}
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-full font-black flex items-center justify-center text-xs md:text-sm transition-transform group-hover:scale-105",
                    activeContactId === contact.id ? "bg-primary/20 text-primary" : "bg-slate-200 text-slate-500"
                  )}>
                    {contact.initials}
                  </div>
                  {contact.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5 md:mb-1">
                    <p className="font-black text-xs md:text-sm truncate text-on-surface">{contact.id}</p>
                    <span className="text-[8px] md:text-[9px] font-bold text-on-surface-variant opacity-60">
                      {contact.messages[contact.messages.length - 1]?.time || ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-[10px] md:text-xs truncate opacity-70",
                      contact.unread > 0 ? "font-bold text-on-surface" : "font-medium text-on-surface-variant"
                    )}>
                      {contact.messages[contact.messages.length - 1]?.text || "No messages yet"}
                    </p>
                    {contact.unread > 0 && (
                      <span className="bg-primary text-white text-[8px] md:text-[9px] font-black min-w-[16px] md:min-w-[18px] h-[16px] md:h-[18px] flex items-center justify-center rounded-full shadow-sm">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right Panel - Messages */}
        <div className={cn(
          "flex-1 flex flex-col bg-gradient-to-b from-slate-50/50 to-slate-100/80 relative transition-all duration-300",
          !showMobileChat ? "hidden md:flex" : "flex"
        )}>
          {activeContact ? (
            <>
              {/* Subtle Modern Dot Pattern */}
              <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"></div>

              <div className="p-3 md:p-5 border-b border-surface-variant bg-white flex items-center justify-between shadow-sm relative z-10">
                <div className="flex items-center gap-3 md:gap-4">
                  <button 
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1 hover:bg-slate-100 rounded-full"
                  >
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                  </button>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 font-black text-primary flex items-center justify-center text-xs md:text-sm border border-primary/10">
                    {activeContact?.initials}
                  </div>
                  <div>
                    <h4 className="font-black text-sm md:text-lg leading-tight text-on-surface">{activeContact?.id}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", activeContact?.online ? "bg-green-500 animate-pulse" : "bg-slate-300")}></span>
                      <span className="text-[8px] md:text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">
                        {activeContact?.online ? "Online Now" : "Last seen recently"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-4 md:space-y-6 relative z-10 scroll-smooth custom-scrollbar">
                <AnimatePresence initial={false}>
                  {activeContact?.messages.map((msg, i) => {
                    const isMe = msg.sender === 'me';
                    const dateVal = (msg as any).date || 'TODAY';
                    const prevDateVal = i > 0 ? ((activeContact.messages[i-1] as any).date || 'TODAY') : undefined;
                    const showDateSeparator = i === 0 || dateVal !== prevDateVal;
                    const displayDate = dateVal;

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-4 md:my-6 relative z-10 w-full">
                            <span className="bg-slate-200/60 text-slate-600 text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-widest backdrop-blur-sm">
                              {displayDate}
                            </span>
                          </div>
                        )}
                        <motion.div 
                          initial={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className={cn(
                            "flex w-full group relative",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
                          {isMe && (
                            <button 
                              onClick={() => {
                                setInputText(msg.text);
                                setEditingMessageId(msg.id);
                              }}
                              className="bg-white/90 p-2 rounded-full shadow-sm mr-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white self-center border border-primary/10"
                              title="Edit message"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <div className={cn(
                            "max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl md:rounded-[1.5rem] shadow-sm relative transition-all",
                            isMe 
                              ? "bg-primary text-white rounded-tr-md shadow-primary/20" 
                              : "bg-white text-on-surface rounded-tl-md border border-slate-100"
                          )}>
                            <p className="text-sm md:text-base font-bold leading-snug mb-1">{msg.text}</p>
                            <div className={cn(
                              "flex items-center gap-1.5 mt-2 justify-end",
                              isMe ? "text-white/90" : "text-on-surface-variant/90"
                            )}>
                              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                                {msg.time}
                              </span>
                              {isMe && <CheckCheck className="w-3 h-3 md:w-5 md:h-5 text-white/90" />}
                            </div>
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 md:p-5 bg-white border-t border-surface-variant flex flex-col gap-2 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                {editingMessageId && (
                  <div className="flex items-center justify-between bg-primary/5 px-4 py-2 rounded-xl mb-1 border-l-4 border-primary">
                    <p className="text-[10px] font-bold text-primary uppercase">Editing Message</p>
                    <button onClick={cancelEdit} className="p-1 hover:bg-primary/10 rounded-full">
                      <X className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 md:gap-4 w-full">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={editingMessageId ? "Edit your message..." : "Type a message..."} 
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 shadow-inner focus:ring-2 ring-primary outline-none text-sm md:text-base font-medium pr-12" 
                    />
                    <button 
                      onClick={handleSend}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:bg-primary/10 p-2 rounded-lg md:rounded-xl transition-all"
                    >
                      <Send className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
              <div className="w-20 h-20 md:w-32 md:h-32 bg-primary/5 rounded-full flex items-center justify-center text-primary/20">
                <User size={64} className="opacity-20" />
              </div>
              <div>
                <h3 className="font-black text-xl md:text-2xl text-on-surface tracking-tight">Your Inbox</h3>
                <p className="text-on-surface-variant font-medium text-sm md:text-base max-w-xs mx-auto">Select a student from the list to start a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
