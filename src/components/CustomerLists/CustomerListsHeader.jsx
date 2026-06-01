import React from 'react';
import { Box, Typography, IconButton, Tooltip, TextField, InputAdornment } from '@mui/material';
import { ArrowLeft, Search } from 'lucide-react';
import { Clear } from '@mui/icons-material';
import MapsUgcIcon from '@mui/icons-material/MapsUgc';
import GroupAddIcon from '@mui/icons-material/GroupAdd';

const CustomerListsHeader = ({ 
    isArchiveOpen, 
    searchTerm, 
    handleSearchChange, 
    handleKeyDown, 
    loadMembers, 
    setShowNewChat, 
    setShowCreateGroup, 
    navigate 
}) => {
    return (
        <>
            <Box className="customer_lists_header">
                <Box className="add_conv_box">
                    {isArchiveOpen && (
                        <IconButton
                            onClick={() => navigate(-1)}
                            size="small"
                            className='add_conv'
                        >
                            <ArrowLeft size={24} />
                        </IconButton>
                    )}
                    <Typography variant="h6" className="header_title">
                        {isArchiveOpen ? 'Archived Chats' : 'Chats'}
                    </Typography>
                </Box>
                {!isArchiveOpen && (
                    <Box className="add_conv_box">
                        <Tooltip title="New Chat" arrow>
                            <IconButton
                                onClick={() => setShowNewChat(true)}
                                size="small"
                                className="add_conv"
                            >
                                <MapsUgcIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Create Group" arrow>
                            <IconButton
                                onClick={() => setShowCreateGroup(true)}
                                size="small"
                                className="add_conv group_add"
                            >
                                <GroupAddIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            <Box className="customer_lists_search">
                <TextField
                    fullWidth
                    placeholder={isArchiveOpen ? "Search archived" : "Search conversations"}
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={18} />
                            </InputAdornment>
                        ),
                        endAdornment: searchTerm && (
                            <InputAdornment
                                position="end"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSearchChange({ target: { value: '' } })}
                            >
                                <Clear fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>
        </>
    );
};

export default CustomerListsHeader;
