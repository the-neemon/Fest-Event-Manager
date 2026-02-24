import { API_URL } from "../config";
import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';


// Real-time forum with polling, reactions, threading, and moderation
const DiscussionForum = ({ eventId, isOrganizer }) => {
    const { authTokens, user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const pollIntervalRef = useRef(null);

    useEffect(() => {
        fetchMessages();
        // ref instead of state so clearing the interval doesn't trigger a re-render
        pollIntervalRef.current = setInterval(() => {
            fetchMessages(true);
        }, 5000);

        return () => { // cleanup stops the poll when the component unmounts
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [eventId]);

    const fetchMessages = async (isPolling = false) => {
        try {
            // on polling passes the timestamp of the newest known message so backend returns only newer ones
            const lastFetch = isPolling && messages.length > 0 
                ? new Date(Math.max(...messages.map(m => new Date(m.createdAt)))).toISOString()
                : null;

            const url = lastFetch 
                ? `${API_URL}/api/forum/${eventId}/messages?lastFetch=${lastFetch}`
                : `${API_URL}/api/forum/${eventId}/messages`;

            const res = await axios.get(url, {
                headers: { 'x-auth-token': authTokens.token }
            });

            // Map keyed by _id deduplicates in case of overlapping polls
            const uniqueMessages = Array.from(
                new Map(res.data.map(msg => [msg._id, msg])).values()
            );

            if (isPolling && uniqueMessages.length > 0) {
                const existingIds = new Set(messages.map(m => m._id));
                const newMessages = uniqueMessages.filter(msg => !existingIds.has(msg._id));
                
                if (newMessages.length > 0) {
                    setMessages(prev => {
                        const combined = [...newMessages, ...prev];
                        return Array.from(new Map(combined.map(msg => [msg._id, msg])).values());
                    });
                    showNotification(`${newMessages.length} new message(s)`);
                }
            } else if (!isPolling) {
                setMessages(uniqueMessages);
            }
            
            setLoading(false);
        } catch (err) {
            console.error('Error fetching messages:', err);
            if (!isPolling) setLoading(false);
        }
    };

    const showNotification = (text) => {
        setNotification(text);
        setTimeout(() => setNotification(null), 3000);
    };

    const handlePostMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const res = await axios.post(
                `${API_URL}/api/forum/${eventId}/messages`,
                {
                    content: newMessage,
                    isAnnouncement: isOrganizer && isAnnouncement,
                    parentMessageId: replyTo?._id || null
                },
                { headers: { 'x-auth-token': authTokens.token } }
            );

            if (replyTo) {
                setMessages(prev => prev.map(msg => 
                    msg._id === replyTo._id 
                        ? { ...msg, replies: [...(msg.replies || []), res.data], replyCount: (msg.replyCount || 0) + 1 }
                        : msg
                ));
            } else {
                setMessages(prev => [res.data, ...prev]);
            }

            setNewMessage('');
            setIsAnnouncement(false);
            setReplyTo(null);
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to post message');
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            const res = await axios.put(
                `${API_URL}/api/forum/messages/${messageId}/react`,
                { emoji },
                { headers: { 'x-auth-token': authTokens.token } }
            );

            setMessages(prev => prev.map(msg => 
                msg._id === messageId ? res.data : msg
            ));
        } catch (err) {
            console.error('Error reacting:', err);
        }
    };

    const handlePin = async (messageId) => {
        try {
            const res = await axios.put(
                `${API_URL}/api/forum/messages/${messageId}/pin`,
                {},
                { headers: { 'x-auth-token': authTokens.token } }
            );

            setMessages(prev => prev.map(msg => 
                msg._id === messageId ? res.data : msg
            ).sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            }));
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to pin message');
        }
    };

    const handleDelete = async (messageId) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            await axios.delete(
                `${API_URL}/api/forum/messages/${messageId}`,
                { headers: { 'x-auth-token': authTokens.token } }
            );

            setMessages(prev => prev.filter(msg => msg._id !== messageId));
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to delete message');
        }
    };

    const getAuthorName = (message) => {
        if (message.authorModel === 'Organizer') {
            return message.authorId?.organizerName || 'Organizer';
        }
        return `${message.authorId?.firstName || ''} ${message.authorId?.lastName || ''}`.trim() || 'Participant';
    };

    const getReactionCount = (message, emoji) => {
        return message.reactions?.filter(r => r.emoji === emoji).length || 0;
    };

    const hasUserReacted = (message, emoji) => {
        return message.reactions?.some(r => r.userId === user.id && r.emoji === emoji) || false;
    };

    const renderMessage = (message, isReply = false) => (
        <div
            style={{
                backgroundColor: message.isAnnouncement ? '#fff3cd' : 'white',
                border: message.isAnnouncement ? '2px solid #ffc107' : '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: isReply ? '10px' : '15px',
                marginLeft: isReply ? '30px' : '0'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                    <strong style={{ color: message.authorModel === 'Organizer' ? '#007bff' : '#333' }}>
                        {getAuthorName(message)}
                        {message.authorModel === 'Organizer' && ' (Organizer)'}
                    </strong>
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
                        {new Date(message.createdAt).toLocaleString()}
                    </span>
                    {message.isAnnouncement && (
                        <span style={{
                            marginLeft: '10px',
                            backgroundColor: '#ffc107',
                            color: '#000',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                        }}>
                            ANNOUNCEMENT
                        </span>
                    )}
                    {message.isPinned && (
                        <span style={{
                            marginLeft: '10px',
                            color: '#dc3545',
                            fontSize: '14px'
                        }}>
                            Pinned
                        </span>
                    )}
                </div>
                {isOrganizer && !isReply && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                            onClick={() => handlePin(message._id)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: message.isPinned ? '#dc3545' : '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {message.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                            onClick={() => handleDelete(message._id)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
            <p style={{ margin: '10px 0', whiteSpace: 'pre-wrap' }}>{message.content}</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                {[['like', 'Like'], ['heart', 'Heart'], ['haha', 'Haha'], ['celebrate', 'Celebrate']].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => handleReaction(message._id, key)}
                        style={{
                            padding: '4px 8px',
                            fontSize: '13px',
                            backgroundColor: hasUserReacted(message, key) ? '#e3f2fd' : '#f8f9fa',
                            border: hasUserReacted(message, key) ? '2px solid #2196f3' : '1px solid #ddd',
                            borderRadius: '20px',
                            cursor: 'pointer'
                        }}
                    >
                        {label} {getReactionCount(message, key) > 0 && getReactionCount(message, key)}
                    </button>
                ))}
                {!isReply && (
                    <button
                        onClick={() => setReplyTo(message)}
                        style={{
                            padding: '4px 12px',
                            fontSize: '13px',
                            backgroundColor: 'transparent',
                            color: '#007bff',
                            border: 'none',
                            cursor: 'pointer',
                            marginLeft: '10px'
                        }}
                    >
                        Reply {message.replyCount > 0 && `(${message.replyCount})`}
                    </button>
                )}
            </div>

            {!isReply && message.replies && message.replies.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                    {message.replies.map(reply => (
                        <div key={reply._id}>
                            {renderMessage(reply, true)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading forum...</div>;
    }

    return (
        <div style={{ marginTop: '30px' }}>
            <h2 style={{ marginBottom: '20px' }}>Discussion Forum</h2>

            {notification && (
                <div style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    border: '1px solid #c3e6cb'
                }}>
                    {notification}
                </div>
            )}

            <form onSubmit={handlePostMessage} style={{ marginBottom: '20px' }}>
                {replyTo && (
                    <div style={{
                        backgroundColor: '#e3f2fd',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '13px' }}>
                            Replying to <strong>{getAuthorName(replyTo)}</strong>
                        </span>
                        <button
                            type="button"
                            onClick={() => setReplyTo(null)}
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                )}
                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={replyTo ? "Write your reply..." : "Share your thoughts, ask questions..."}
                    style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        resize: 'vertical'
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <div>
                        {isOrganizer && !replyTo && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="checkbox"
                                    checked={isAnnouncement}
                                    onChange={(e) => setIsAnnouncement(e.target.checked)}
                                />
                                <span style={{ fontSize: '13px' }}>Post as Announcement</span>
                            </label>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: newMessage.trim() ? '#007bff' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold'
                        }}
                    >
                        {replyTo ? 'Post Reply' : 'Post Message'}
                    </button>
                </div>
            </form>

            <div>
                {messages.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px'
                    }}>
                        <p style={{ color: '#666' }}>No messages yet. Start the discussion!</p>
                    </div>
                ) : (
                    messages.map(message => (
                        <div key={message._id}>
                            {renderMessage(message)}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DiscussionForum;
