import React, { useState, useCallback } from 'react';
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

    const handleCustomerSelect = useCallback((customer) => {
        const list = converListRef.current || [];
        const existing = list?.find(c => {
            const cId = Number(c?.ReceiverId || c?.CustomerId || c?.UserId);
            const targetId = Number(customer?.ReceiverId || customer?.CustomerId || customer?.UserId);
            return cId === targetId;
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
            const { conversationId } = event.detail;
            if (!conversationId) return;
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
