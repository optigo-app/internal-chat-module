import React, { useCallback, useContext, useMemo, useState } from 'react'
import './TagsModel.scss'
import { Button } from '@mui/material';
import { addTagsApi } from '../../API/AddTags/AddTags';
import toast from 'react-hot-toast';
import { useTagsContext } from '../../contexts/TagsContexts';
import { LoginContext } from '../../context/LoginData';
import CustomerModal from '../ReusableComponent/CustomerModal';
import CustomTextField from '../ReusableComponent/CustomTextField';

const TagsModel = ({ openTagModal, setOpenTagModal, addTags, tagInput, setTagInput, selectedCustomer, handleFetchtags }) => {
    const { triggerRefetch } = useTagsContext();
    const auth = useContext(LoginContext);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = useMemo(() => {
        return Boolean(selectedCustomer?.CustomerId) && Boolean(tagInput?.trim()) && !isSubmitting;
    }, [isSubmitting, selectedCustomer?.CustomerId, tagInput]);

    const handleClose = useCallback(() => {
        if (isSubmitting) return;
        setOpenTagModal(false);
    }, [isSubmitting, setOpenTagModal]);

    const handleSubmit = useCallback(async () => {
        const customerId = selectedCustomer?.CustomerId;
        const nextTag = tagInput?.trim();

        if (!customerId) {
            toast.error('Please select a customer');
            return;
        }

        if (!nextTag) return;

        try {
            setIsSubmitting(true);
            const response = await addTagsApi(customerId, nextTag, auth?.userId);
            if (response?.rd?.[0]?.stat === 1) {
                toast.success('Tag added successfully');
                handleFetchtags?.();
                triggerRefetch?.();
                setOpenTagModal(false);
                addTags?.({ label: nextTag });
                setTagInput('');
            } else {
                toast.error('Tag added failed');
            }
        } catch (error) {
            console.error('handleSubmit -> error', error);
            toast.error('Something went wrong while adding the tag');
        } finally {
            setIsSubmitting(false);
        }
    }, [addTags, auth?.userId, handleFetchtags, selectedCustomer?.CustomerId, setOpenTagModal, setTagInput, tagInput, triggerRefetch]);

    return (
        <CustomerModal
            open={openTagModal}
            onClose={handleClose}
            title="Add Tags"
            maxWidth="xs"
            paperSx={{ width: { xs: '92vw', sm: 420 } }}
            contentSx={{ pt: 2 }}
            actions={
                <>
                    <Button
                        variant="outlined"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className='secondaryBtnClassname'
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        disableElevation
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className='primaryBtnClassname'
                    >
                        Add
                    </Button>
                </>
            }
        >
            <CustomTextField
                label="Tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (canSubmit) handleSubmit();
                    }
                }}
            />
        </CustomerModal>
    )
}

export default TagsModel
