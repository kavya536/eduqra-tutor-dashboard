import { Send, User, Check, CheckCheck, ChevronLeft, X, Edit2, Trash2, Paperclip, FileText, Camera, BarChart2, Plus, Download } from 'lucide-react';
import { ChatContact } from '../types';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { chatService } from '../services/chatService';

import { useChatListener } from '../hooks/useChatListener';

export function Chat() {
  // Activate isolated listener for messaging
  useChatListener();

  const profile = useAuthStore(state => state.profile);
  const { contacts, activeChatId: activeContactId, setActiveChatId: onContactSelect } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(!!activeContactId);
  const [editingMessageId, setEditingMessageId] = useState<any>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollDraft, setPollDraft] = useState({ question: '', options: ['', ''], allowMultiple: true, isAnonymous: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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

  const handleSend = async (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && (e as React.KeyboardEvent).key === 'Enter') {
      e.preventDefault();
    }

    if (inputText.trim() && activeContactId && profile?.id) {
      const textToSend = inputText.trim();
      const editingId = editingMessageId;
      
      // Clear input immediately for better UX
      setInputText('');
      setEditingMessageId(null);

      try {
        await chatService.sendMessage(
          activeContactId,
          textToSend,
          profile.id,
          profile.name,
          { messageId: editingId || undefined }
        );
      } catch (err) {
        console.error("Chat send error:", err);
        // Restore text on failure
        if (!editingId) setInputText(textToSend);
      }
    }
  };

  const handleSendPoll = async () => {
    if (!activeContactId || !pollDraft.question.trim() || pollDraft.options.filter(o => o.trim()).length < 2 || !profile?.id) return;
    await chatService.sendMessage(
      activeContactId, 
      '', // text is empty for polls
      profile.id, 
      profile.name, 
      {
        type: 'poll',
        pollData: {
          question: pollDraft.question.trim(),
          options: pollDraft.options.filter(o => o.trim()),
          allowMultiple: pollDraft.allowMultiple,
          isAnonymous: pollDraft.isAnonymous,
          votes: {}
        }
      }
    );
    setIsPollModalOpen(false);
    setPollDraft({ question: '', options: ['', ''], allowMultiple: true, isAnonymous: false });
  };

  const attachmentOptions = [
    { icon: FileText, label: 'Document', color: 'bg-indigo-500 text-white' },
    { icon: Camera, label: 'Camera', color: 'bg-rose-500 text-white' },
  ];

  const cancelEdit = () => {
    setEditingMessageId(null);
    setInputText('');
  };

  return (
    <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 -mt-2 md:-mt-4">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h1 className="page-title">Messages</h1>
        <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
          <span className="status-label text-primary">Live Support</span>
        </div>
      </div>

      <div className="flex bg-white rounded-xl md:rounded-3xl atelier-card-shadow overflow-hidden flex-1 border border-surface-variant relative">
        {/* Left Panel - Contacts */}
        <div className={cn(
          "w-full md:w-[280px] lg:w-[320px] border-r border-surface-variant flex flex-col bg-slate-50/30 transition-all duration-300 shrink-0",
          showMobileChat ? "hidden md:flex" : "flex"
        )}>
          <div className="p-3 md:p-4 border-b border-surface-variant flex items-center justify-between bg-white">
            <h4 className="label-caps !text-[11px] text-on-surface">Students</h4>
            <span className="bg-slate-100 text-slate-500 secondary-text font-black px-1.5 py-0.5 rounded-md !text-[11px]">{contacts.length}</span>
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
                  "w-full flex items-center gap-2 p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all text-left group relative",
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
                    "w-8 h-8 md:w-10 md:h-10 rounded-full font-black flex items-center justify-center text-[10px] md:text-xs transition-transform group-hover:scale-105 overflow-hidden",
                    activeContactId === contact.id ? "bg-primary/20 text-primary" : "bg-slate-200 text-slate-500"
                  )}>
                    {(contact as any).avatar ? (
                      <img src={(contact as any).avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      contact.initials
                    )}
                  </div>
                  {contact.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5 md:mb-1 group/header">
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                       <p className="font-black text-xs md:text-sm truncate text-on-surface">{contact.name || contact.id}</p>
                       <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1 rounded ${
                             (contact as any).subscriptionTier === 'premium' ? 'bg-amber-100 text-amber-700' :
                             (contact as any).subscriptionTier === 'standard' ? 'bg-blue-100 text-blue-700' :
                             'bg-slate-100 text-slate-600'
                          }`}>
                             {((contact as any).subscriptionTier || 'base')} Plan
                          </span>
                          <span className={cn(
                             "text-[8px] font-black uppercase tracking-wider px-1 rounded",
                             (contact as any).isDemo ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                             {(contact as any).isDemo ? "Demo Class" : "Regular Class"}
                          </span>
                          {!(contact as any).isDemo && (contact as any).isPaid && (
                            <span className="text-[8px] font-bold text-emerald-600 flex items-center gap-0.5">
                               <Check size={8} /> Amount is paid
                            </span>
                          )}
                       </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                       <button 
                         onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Remove this student profile?')) {
                               const el = e.currentTarget.closest('button');
                               if (el) el.style.display = 'none';
                            }
                         }}
                         className="opacity-0 group-hover/header:opacity-100 p-1 hover:bg-rose-100 text-rose-500 rounded transition-all"
                         title="Delete Student Profile"
                       >
                         <Trash2 size={12} />
                       </button>
                       <span className="status-label opacity-60 text-[9px]">
                         {contact.messages.length > 0 
                           ? (contact.messages[contact.messages.length - 1]?.time || "Now") 
                           : ((contact as any).time || "")}
                       </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-[10px] md:text-xs truncate opacity-70",
                      contact.unread > 0 ? "font-bold text-on-surface" : "font-medium text-on-surface-variant"
                    )}>
                      {contact.messages.length > 0 
                        ? (contact.messages[contact.messages.length - 1]?.text || (contact.messages[contact.messages.length - 1]?.type === 'poll' ? "📊 Poll" : "📎 Document")) 
                        : ((contact as any).lastMessage || "No messages yet")}
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
              <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"></div>

              <div className="p-2 md:p-3 border-b border-surface-variant bg-white flex items-center justify-between shadow-sm relative z-10">
                <div className="flex items-center gap-2 md:gap-3">
                  <button 
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1 hover:bg-slate-100 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 font-black text-primary flex items-center justify-center text-xs border border-primary/10 overflow-hidden">
                    {(activeContact as any).avatar ? (
                      <img src={(activeContact as any).avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      activeContact?.initials
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-sm md:text-lg leading-tight text-on-surface">{activeContact?.name || activeContact?.id}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", activeContact?.online ? "bg-green-500 animate-pulse" : "bg-slate-300")}></span>
                      <span className="status-label opacity-60">
                        {activeContact?.online ? "Online Now" : "Last seen recently"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-3 md:p-5 overflow-y-auto space-y-3 md:space-y-4 relative z-10 scroll-smooth custom-scrollbar">
                <AnimatePresence initial={false}>
                  {activeContact?.messages.map((msg, i) => {
                    const isMe = msg.sender === 'me';
                    const dateVal = (msg as any).date || 'TODAY';
                    const prevDateVal = i > 0 ? ((activeContact.messages[i-1] as any).date || 'TODAY') : undefined;
                    const showDateSeparator = i === 0 || dateVal !== prevDateVal;
                    
                    return (
                      <React.Fragment key={msg.id}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-4 md:my-6 relative z-10 w-full">
                            <span className="bg-slate-200/60 text-slate-600 text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-widest backdrop-blur-sm">
                              {dateVal}
                            </span>
                          </div>
                        )}
                        <motion.div 
                          initial={{ opacity: 0, y: 15, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={cn(
                            "flex w-full group relative",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className="flex flex-col items-end gap-1 max-w-[85%] md:max-w-[70%]">
                            <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 md:relative md:top-0">
                               {isMe && !msg.deletedForEveryone && (() => {
                                 // 1. WhatsApp-like 15 minute edit window
                                 const sentTime = (msg as any).timestamp?.seconds ? (msg as any).timestamp.seconds * 1000 : Date.now();
                                 const timeWindowOk = (Date.now() - sentTime) < 15 * 60 * 1000;
                                 
                                 // 2. Hide if seen by student (studentUnreadCount is 0 means they've opened the chat)
                                 const isSeen = (activeContact?.studentUnreadCount || 0) === 0;
                                 
                                 // 3. Hide if student has already replied AFTER this message
                                 const hasReplied = activeContact?.messages.slice(i + 1).some(m => m.sender === 'student');
                                 
                                 const canEdit = timeWindowOk && !isSeen && !hasReplied;
                                 
                                 return canEdit && (
                                   <button
                                     onClick={() => {
                                       setInputText(msg.text);
                                       setEditingMessageId(msg.id);
                                     }}
                                     className="bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-primary hover:text-white border border-primary/10 transition-colors"
                                   >
                                     <Edit2 size={10} />
                                   </button>
                                 );
                               })()}
                              <button
                                onClick={() => chatService.deleteMessage(activeContactId!, msg.id, false)}
                                className="bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-rose-500 hover:text-white border border-rose-500/10 transition-colors"
                                title="Delete for me"
                              >
                                <X size={10} />
                              </button>
                              {isMe && !msg.deletedForEveryone && (
                                <button
                                  onClick={() => chatService.deleteMessage(activeContactId!, msg.id, true)}
                                  className="bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-rose-600 hover:text-white border border-rose-600/10 transition-colors text-rose-600"
                                  title="Delete for everyone"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                            <div className={cn(
                              "px-2.5 py-1.5 md:px-3.5 md:py-2.5 rounded-2xl shadow-sm relative transition-all w-fit",
                              isMe ? "bg-primary text-white rounded-tr-none shadow-primary/20" : "bg-white text-on-surface rounded-tl-none border border-slate-100",
                              msg.deletedForEveryone && "bg-slate-100 text-slate-400 border-none shadow-none"
                            )}>
                              {msg.type === 'poll' ? (
                                <div className="min-w-[200px] md:min-w-[250px]">
                                  <div className="flex items-start justify-between mb-3 md:mb-4">
                                    <h4 className="font-black text-sm md:text-base flex items-center gap-2 pr-2">
                                      <BarChart2 size={16} /> {msg.pollData.question}
                                    </h4>
                                    <button 
                                      onClick={() => chatService.deleteMessage(activeContactId!, msg.id, true)}
                                      className={cn(
                                        "shrink-0 p-1.5 rounded-lg transition-all",
                                        isMe ? "hover:bg-white/20 text-white" : "hover:bg-rose-50 text-rose-500"
                                      )}
                                      title="Delete Poll"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div className="space-y-1.5 md:space-y-2">
                                    {msg.pollData.options.map((opt: string, idx: number) => {
                                      const votes = msg.pollData.votes || {};
                                      const totalVotes = Object.values(votes).reduce((acc: number, v: any) => acc + (v.includes(idx) ? 1 : 0), 0) as number;
                                      const emailKey = profile?.id?.replace(/\./g, '_') || '';
                                      const hasVoted = votes[emailKey]?.includes(idx);
                                      
                                      return (
                                        <button 
                                          key={idx}
                                          onClick={() => {
                                            const emailKey = profile?.id?.replace(/\./g, '_') || '';
                                            let userVotes = [...(votes[emailKey] || [])];
                                            if (msg.pollData.allowMultiple) {
                                              if (userVotes.includes(idx)) {
                                                userVotes = userVotes.filter((v: number) => v !== idx);
                                              } else {
                                                userVotes.push(idx);
                                              }
                                            } else {
                                              userVotes = userVotes.includes(idx) ? [] : [idx];
                                            }
                                            chatService.voteOnChatPoll(activeContactId!, msg.id, { ...votes, [emailKey]: userVotes });
                                          }}
                                          className={cn(
                                            "w-full text-left p-2 md:p-3 rounded-xl border-2 transition-all relative overflow-hidden group",
                                            hasVoted 
                                              ? (isMe ? "bg-white/20 border-white" : "bg-primary/10 border-primary") 
                                              : (isMe ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-100 text-slate-600")
                                          )}
                                        >
                                          <div className="flex justify-between items-center relative z-10">
                                            <span className="text-xs md:text-sm font-bold truncate pr-8">{opt}</span>
                                            <span className="text-[10px] font-black opacity-60 shrink-0">{totalVotes}</span>
                                          </div>
                                          {totalVotes > 0 && (
                                            <div 
                                              className={cn("absolute inset-0 opacity-10 transition-all duration-500", isMe ? "bg-white" : "bg-primary")} 
                                              style={{ width: `${(totalVotes / Math.max(1, Object.keys(votes).length)) * 100}%` }}
                                            />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div className="mt-3 flex items-center justify-between opacity-60">
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                      {msg.pollData.allowMultiple ? "Multiple Choice" : "Single Choice"}
                                    </span>
                                    <span className="text-[9px] font-black">{Object.keys(msg.pollData.votes || {}).length} participants</span>
                                  </div>
                                </div>
                              ) : (msg.type === 'image' || (msg.type === 'file' && (msg.fileName?.toLowerCase().endsWith('.jpg') || msg.fileName?.toLowerCase().endsWith('.png') || msg.fileName?.toLowerCase().endsWith('.jpeg') || msg.fileName?.toLowerCase().endsWith('.webp')))) ? (
                                <div className="relative group max-w-[220px] md:max-w-[280px]">
                                  <img 
                                    src={msg.fileUrl} 
                                    alt={msg.fileName}
                                    className="w-full h-auto rounded-xl object-cover shadow-sm bg-white/50"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-[2px]">
                                    <a href={msg.fileUrl} target="_blank" download className="bg-white text-black text-[10px] font-black px-4 py-2 rounded-full cursor-pointer hover:scale-105 transition-transform flex items-center gap-2">
                                      <Download size={14} /> Download
                                    </a>
                                  </div>
                                </div>
                              ) : msg.type === 'file' ? (
                                <a 
                                  href={msg.fileUrl} 
                                  target="_blank" 
                                  className={cn(
                                    "flex items-center gap-3 p-2 md:p-3 rounded-xl border transition-all",
                                    isMe ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-100"
                                  )}
                                >
                                  <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                    <FileText size={18} />
                                  </div>
                                  <div className="min-w-0 pr-4">
                                    <p className="text-xs md:text-sm font-bold truncate max-w-[150px]">{msg.fileName}</p>
                                    <p className="text-[9px] font-black opacity-40 uppercase tracking-tighter">Document • {msg.fileSize || 'N/A'}</p>
                                  </div>
                                </a>
                              ) : (
                                <p className={cn(
                                  "text-sm md:text-sm font-bold leading-snug",
                                  msg.deletedForEveryone && "italic font-normal"
                                )}>
                                  {msg.text}
                                </p>
                              )}
                              <div className={cn(
                                "flex items-center gap-1.5 mt-1 justify-end",
                                isMe && !msg.deletedForEveryone ? "text-white/80" : "text-on-surface-variant/90"
                              )}>
                                {msg.edited && <span className="mr-1 text-[9px] font-medium opacity-60">(edited)</span>}
                                <span className="status-label !text-[9px] opacity-60 font-medium">{msg.time}</span>
                                {isMe && !msg.deletedForEveryone && (
                                  (activeContact as any)?.studentUnreadCount === 0 ? (
                                    <CheckCheck className="w-3 h-3 md:w-4 md:h-4 text-[#53bdeb]" />
                                  ) : (
                                    <CheckCheck className="w-3 h-3 md:w-4 md:h-4 text-white/90" />
                                  )
                                )}
                              </div>
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
                    <p className="status-label text-primary">Editing Message</p>
                    <button onClick={cancelEdit} className="p-1 hover:bg-primary/10 rounded-full">
                      <X className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 md:gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                      className="p-3 transition-all rounded-xl text-primary/40 hover:text-primary hover:bg-primary/5"
                    >
                      <Paperclip size={20} />
                    </button>
                    <AnimatePresence>
                      {isAttachmentMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="absolute bottom-full left-0 mb-4 w-60 bg-white rounded-2xl shadow-xl border border-surface-variant p-2 z-50"
                        >
                          <div className="space-y-1">
                            {attachmentOptions.map((opt) => (
                              <button 
                                key={opt.label}
                                onClick={() => {
                                  setIsAttachmentMenuOpen(false);
                                  // Use a small timeout to ensure the menu state update doesn't interfere with the programmatic click
                                  setTimeout(() => {
                                    if (opt.label === 'Document') fileInputRef.current?.click();
                                    else if (opt.label === 'Camera') cameraInputRef.current?.click();
                                    else if (opt.label === 'Poll') setIsPollModalOpen(true);
                                  }, 100);
                                }}
                                className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition-all group"
                              >
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white", opt.color)}>
                                  <opt.icon size={14} />
                                </div>
                                <span className="text-xs font-bold text-on-surface/70 group-hover:text-primary">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex-1 relative">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0 || !activeContactId) return;
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            await chatService.sendMessage(activeContactId, '', profile.id, profile.name, {
                              type: 'file',
                              fileName: file.name,
                              fileSize: (file.size / 1024).toFixed(1) + ' KB',
                              fileUrl: reader.result as string
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture 
                      ref={cameraInputRef} 
                      className="hidden" 
                      onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && activeContactId) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            await chatService.sendMessage(activeContactId, '', profile.id, profile.name, {
                              type: 'file',
                              fileName: 'photo_' + new Date().getTime() + '.jpg',
                              fileSize: (file.size / 1024).toFixed(1) + ' KB',
                              fileUrl: reader.result as string
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
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

      <AnimatePresence>
        {isPollModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/20"
            >
              <div className="p-6 border-b border-light flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <BarChart2 className="text-amber-500" size={20} />
                  <h3 className="text-lg font-black text-on-surface">Create Poll</h3>
                </div>
                <button onClick={() => setIsPollModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question</label>
                  <input 
                    type="text" 
                    placeholder="Ask something..."
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 shadow-inner focus:ring-1 ring-primary outline-none font-bold"
                    value={pollDraft.question}
                    onChange={(e) => setPollDraft(prev => ({ ...prev, question: e.target.value }))}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Options</label>
                  {pollDraft.options.map((option, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 shadow-inner focus:ring-1 ring-primary outline-none text-sm font-semibold"
                        value={option}
                        onChange={(e) => {
                          const newOpts = [...pollDraft.options];
                          newOpts[idx] = e.target.value;
                          setPollDraft(prev => ({ ...prev, options: newOpts }));
                        }}
                      />
                      {pollDraft.options.length > 2 && (
                        <button 
                          onClick={() => setPollDraft(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }))}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollDraft.options.length < 5 && (
                    <button 
                      onClick={() => setPollDraft(prev => ({ ...prev, options: [...prev.options, ''] }))}
                      className="w-full py-3 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 font-bold hover:border-primary/20 hover:text-primary transition-all text-sm"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs font-bold text-on-surface">Allow multiple answers</p>
                  <button 
                    onClick={() => setPollDraft(prev => ({ ...prev, allowMultiple: !prev.allowMultiple }))}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      pollDraft.allowMultiple ? "bg-primary" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      pollDraft.allowMultiple ? "left-6" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-light flex justify-end gap-3">
                <button onClick={() => setIsPollModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-400">Cancel</button>
                <button 
                  onClick={handleSendPoll}
                  disabled={!pollDraft.question.trim() || pollDraft.options.filter(o => o.trim()).length < 2}
                  className="bg-primary text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Create & Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
