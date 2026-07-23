import React, { useState, useCallback, useEffect, useContext } from 'react';
import { LoginContext } from '../../context/LoginData';
import { contactInfoApi } from '../../API/SendMessage/ContactInfoApi';
import CustomerLists from '../CustomerLists/CustomerLists';
import './Customers.scss';
import { useLocation } from 'react-router-dom';
import AddConversation from '../AddConversation/AddConversation';
import Conversation from '../Conversation/Conversation';

const Customers = ({ selectedStatus, selectedTag }) => {
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [converList, setConvList] = useState([]);
    const converListRef = React.useRef([]);
    const [isConversationRead, setIsConversationRead] = useState(false);
    const [viewConversationRead, setViewConversationRead] = useState(false);
    const location = useLocation();
    const { auth } = useContext(LoginContext);

    useEffect(() => {
        let cancelled = false;
        const resolveConversationId = async () => {
            // Only resolve if we have a selected customer/member but no ConversationId
            if (selectedCustomer && !selectedCustomer.ConversationId && selectedCustomer.IsGroup !== 1) {
                const receiverId = selectedCustomer.ReceiverId || selectedCustomer.UserId || selectedCustomer.id || selectedCustomer.SenderId;
                if (receiverId && auth?.token) {
                    try {
                        const response = await contactInfoApi(auth, { contactUserId: receiverId });
                        if (cancelled) return;
                        if (response?.Status === "200") {
                            const data = response?.Data?.rd?.[0] || response?.Data;
                            if (data?.ConversationId) {
                                setSelectedCustomer(prev => {
                                    const prevId = prev?.ReceiverId || prev?.UserId || prev?.id || prev?.SenderId;
                                    if (prevId && String(prevId) === String(receiverId)) {
                                        return {
                                            ...prev,
                                            ConversationId: data.ConversationId,
                                            name: data.CustomerName || data.UserName || data.name || prev.name,
                                        };
                                    }
                                    return prev;
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error resolving conversation ID:', error);
                    }
                }
            }
        };
        resolveConversationId();
        return () => { cancelled = true; };
    }, [selectedCustomer?.UserId, selectedCustomer?.ReceiverId, selectedCustomer?.id, selectedCustomer?.SenderId, auth?.token]);

    const handleCustomerSelect = useCallback((customer) => {
        if (!customer) {
            setSelectedCustomer(null);
            setIsConversationRead(false);
            return;
        }

        const list = converListRef.current || [];
        const isGroup = customer?.IsGroup === 1;
        const targetConvId = Number(customer?.ConversationId);
        const targetUserId = Number(customer?.ReceiverId || customer?.CustomerId || customer?.UserId || customer?.id || customer?.SenderId);

        const existing = list?.find(c => {
            const cIsGroup = c?.IsGroup === 1;
            // Never mix group and individual conversations when matching
            if (isGroup !== cIsGroup) return false;

            // For groups, match only by conversation id
            if (isGroup && targetConvId && Number(c?.ConversationId) === targetConvId) return true;

            // For individuals, prefer conversation id match, then user id match
            if (!isGroup && targetConvId && Number(c?.ConversationId) === targetConvId) return true;
            if (!isGroup && targetUserId) {
                const cUserId = Number(c?.ReceiverId || c?.CustomerId || c?.UserId || c?.id || c?.SenderId);
                return cUserId === targetUserId;
            }
            return false;
        });

        if (existing) {
            setSelectedCustomer(existing);
        } else {
            setSelectedCustomer(customer);
        }
        setIsConversationRead(false);
    }, []);

    const handleConversationRead = useCallback((isRead) => {
        setIsConversationRead(isRead);
    }, []);

    const handleConversationList = useCallback((list) => {
        const safeList = Array.isArray(list) ? list : [];
        converListRef.current = safeList;
        setConvList(safeList);
    }, []);

    const handleViewConversationRead = useCallback((isRead) => {
        setViewConversationRead(isRead);
    }, []);

    React.useEffect(() => {
        const handleSelectConversation = (event) => {
            const { conversationId, customer: eventCustomer } = event.detail;
            if (!conversationId) return;
            if (eventCustomer) {
                handleCustomerSelect(eventCustomer);
                return;
            }
            const list = converListRef.current || [];
            const customer = list.find(c => Number(c.ConversationId) === Number(conversationId));
            if (customer) {
                handleCustomerSelect(customer);
            }
        };
        window.addEventListener('SELECT_CONVERSATION', handleSelectConversation);
        const handleSelectNewConversation = (event) => {
            const { customer } = event.detail;
            if (customer) {
                handleCustomerSelect(customer);
            }
        };
        window.addEventListener('SELECT_NEW_CONVERSATION', handleSelectNewConversation);

        // Close conversation panel when the active conversation is deleted
        const handleDeleteConversation = (event) => {
            const deletedId = event.detail?.conversationId;
            if (!deletedId) { setSelectedCustomer(null); return; }
            setSelectedCustomer(prev => {
                if (prev && Number(prev.ConversationId) === Number(deletedId)) return null;
                return prev;
            });
        };
        window.addEventListener('DELETE_CONVERSATION', handleDeleteConversation);
        window.addEventListener('DELETE_CONVERSATION_ITEM', handleDeleteConversation);

        return () => {
            window.removeEventListener('SELECT_CONVERSATION', handleSelectConversation);
            window.removeEventListener('SELECT_NEW_CONVERSATION', handleSelectNewConversation);
            window.removeEventListener('DELETE_CONVERSATION', handleDeleteConversation);
            window.removeEventListener('DELETE_CONVERSATION_ITEM', handleDeleteConversation);
        };
    }, []);

    return (
        <div className="customers-container">
            <div className="customers-layout">
                <div className="customer-lists-section">
                    {location?.pathname === "/add-conversation" ? (
                        <AddConversation
                            onCustomerSelect={handleCustomerSelect}
                            selectedCustomer={selectedCustomer}
                            selectedStatus={selectedStatus}
                            selectedTag={selectedTag}
                        />

                    ) : (
                        <CustomerLists
                            onCustomerSelect={handleCustomerSelect}
                            selectedCustomer={selectedCustomer}
                            selectedStatus={selectedStatus}
                            selectedTag={selectedTag}
                            isConversationRead={isConversationRead}
                            viewConversationRead={viewConversationRead}
                            onConversationList={handleConversationList}
                        />
                    )}
                </div>

                <div className="conversation-section">
                    <Conversation
                        selectedCustomer={selectedCustomer}
                        onConversationRead={handleConversationRead}
                        onViewConversationRead={handleViewConversationRead}
                        onCustomerSelect={handleCustomerSelect}
                        converList={converList}
                        isConversationRead={isConversationRead}
                        setIsConversationRead={setIsConversationRead}
                    />
                </div>
            </div>
        </div>
    );
};

export default Customers;
