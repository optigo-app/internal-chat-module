import React, { useState, useEffect, useCallback } from 'react';
import {
    Button,
    Box
} from '@mui/material';
import { addCustomer } from '../../API/AddCustomer/AddCustomer';
import toast from 'react-hot-toast';
import CustomerModal from '../ReusableComponent/CustomerModal';
import CustomTextField from '../ReusableComponent/CustomTextField';

const AddCustomerDialog = ({
    open,
    onClose,
    selectedMember,
    onSuccess
}) => {
    const [customerName, setCustomerName] = useState('');
    const [debouncedCustomerName, setDebouncedCustomerName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCustomerName(customerName);
        }, 300);

        return () => clearTimeout(timer);
    }, [customerName]);

    const handleSaveCustomer = useCallback(async () => {
        if (!selectedMember?.CustomerPhone) {
            toast.error("Missing customer phone number. Cannot add customer.");
            return;
        }

        if (!debouncedCustomerName.trim()) {
            toast.error("Please enter a customer name.");
            return;
        }

        setLoading(true);
        try {
            const response = await addCustomer(
                selectedMember.CustomerPhone,
                selectedMember?.userId || 1,
                debouncedCustomerName.trim()
            );

            if (response) {
                toast.success("Customer added successfully!");
                onSuccess?.();
                handleClose();
            } else {
                toast.error("Failed to add customer");
            }
        } catch (error) {
            console.error("Error adding customer", error);
            toast.error("Something went wrong while adding the customer.");
        } finally {
            setLoading(false);
        }
    }, [selectedMember, debouncedCustomerName, onSuccess]);

    const handleClose = useCallback(() => {
        setCustomerName('');
        setDebouncedCustomerName('');
        setLoading(false);
        onClose();
    }, [onClose]);

    const handleCustomerNameChange = useCallback((e) => {
        setCustomerName(e.target.value);
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !loading && debouncedCustomerName.trim()) {
            e.preventDefault();
            handleSaveCustomer();
        }
    }, [handleSaveCustomer, loading, debouncedCustomerName]);

    return (
        <CustomerModal
            open={open}
            onClose={handleClose}
            title="Add Customer"
            actions={
                <>
                    <Button
                        onClick={handleClose}
                        variant="outlined"
                        color="secondary"
                        disabled={loading}
                        className='secondaryBtnClassname'
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveCustomer}
                        variant="contained"
                        disableElevation
                        disabled={!debouncedCustomerName.trim() || loading}
                        className='primaryBtnClassname'
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </Button>
                </>
            }
        >
            <Box>
                <CustomTextField
                    label="Mobile Number"
                    value={selectedMember?.CustomerPhone || ''}
                    disabled
                    margin="normal"
                    sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'action.hover',
                        },
                    }}
                />

                <CustomTextField
                    label="Customer Name"
                    value={customerName}
                    onChange={handleCustomerNameChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter customer name"
                    disabled={loading}
                    autoFocus
                    margin="normal"
                />
            </Box>
        </CustomerModal>
    );
};

export default AddCustomerDialog;
