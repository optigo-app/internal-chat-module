import React, { useState } from 'react';
import CustomerLists from '../CustomerLists/CustomerLists';
import './Customers.scss';
import { useLocation } from 'react-router-dom';
import AddConversation from '../AddConversation/AddConversation';
import Conversation from '../Conversation/Conversation';

const Customers = ({ selectedStatus, selectedTag }) => {
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [converList, setConvList] = useState([]);
    const [isConversationRead, setIsConversationRead] = useState(false);
    const [viewConversationRead, setViewConversationRead] = useState(false);
    const location = useLocation();

    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        setIsConversationRead(false);
    };

    const handleConversationRead = (isRead) => {
        setIsConversationRead(isRead);
    };

    const handleConversationList = (list) => {
        setConvList(list);
    };

    const handleViewConversationRead = (isRead) => {
        setViewConversationRead(isRead);
    };

    React.useEffect(() => {
        const handleSelectConversation = (event) => {
            const { conversationId } = event.detail;
            if (!conversationId) return;

            // Find the customer in the list and select them
            const customer = converList.find(c => Number(c.ConversationId) === Number(conversationId));
            if (customer) {
                handleCustomerSelect(customer);
            }
        };

        window.addEventListener('SELECT_CONVERSATION', handleSelectConversation);
        return () => window.removeEventListener('SELECT_CONVERSATION', handleSelectConversation);
    }, [converList]);

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
