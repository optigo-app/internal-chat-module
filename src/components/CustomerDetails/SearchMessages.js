import { useEffect, useState } from 'react';
import { Typography, Box, TextField, InputAdornment, List, ListItem, ListItemText, useTheme, CircularProgress } from '@mui/material';
import { Search, Calendar, Image as ImageIcon, Video, FileText, MessageSquare } from 'lucide-react';
import { formatDateLocal, formatTime12h } from '../../utils/DateFnc';

const SearchMessages = ({
    searchResults = [],
    searchQuery,
    setSearchQuery,
    onResultClick,
    isSearching = false,
    onSearchMessages
}) => {
    const theme = useTheme();
    const [localQuery, setLocalQuery] = useState(searchQuery || "");

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onSearchMessages) {
                onSearchMessages(localQuery);
                setSearchQuery(localQuery);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localQuery, onSearchMessages, setSearchQuery]);

    const getMessageIcon = (type) => {
        switch (type) {
            case 'image': return <ImageIcon size={16} />;
            case 'video': return <Video size={16} />;
            case 'document': return <FileText size={16} />;
            default: return <MessageSquare size={16} />;
        }
    };

    const highlightText = (text, query) => {
        if (!query) return text;

        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <span key={i} style={{ color: '#685dd8', fontWeight: 600 }}>
                    {part}
                </span>
            ) : part
        );
    };


    const formatDate = (dateStr) => formatDateLocal(dateStr);
    const formatTime = (dateStr) => formatTime12h(dateStr);

    return (
        <div className="search-messages-container">
            <div className="search-input-wrapper">
                <TextField
                    fullWidth
                    placeholder="Search messages..."
                    variant="outlined"
                    size="small"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    autoFocus
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={18} color="#8696a0" />
                            </InputAdornment>
                        ),
                        className: "search-textfield-inner"
                    }}
                />
            </div>

            <div className="search-results-viewport">
                {isSearching ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={30} />
                        <Typography variant="body2" color="textSecondary">Searching...</Typography>
                    </Box>
                ) : localQuery.trim() === '' ? (
                    <div className="search-empty-state">
                        <Typography variant="body2">
                            Search for messages within this chat.
                        </Typography>
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="search-empty-state">
                        <Typography variant="body2">
                            No messages found for "{localQuery}"
                        </Typography>
                    </div>
                ) : (
                    <List className="search-results-list">
                        {searchResults.map((msg, index) => (
                            <ListItem
                                key={msg.MessageId || msg.id || index}
                                onClick={() => onResultClick(msg)}
                                className="search-result-card"
                                sx={{
                                    cursor: 'pointer',
                                    display: 'block',
                                    padding: '16px',
                                    margin: '8px 16px',
                                    borderRadius: '12px',
                                    width: '90%',
                                    backgroundColor: '#fff',
                                    border: '1px solid #edededff',
                                    boxShadow: '0 1px 3px rgba(11, 20, 26, 0.02)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        boxShadow: '0 4px 12px rgba(11, 20, 26, 0.08)',
                                        borderColor: 'primary.light',
                                        transform: 'translateY(-1px)'
                                    },
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {/* Message Content - Primary Focus */}
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                        {/* <Box
                                            sx={{
                                                mt: 0.3,
                                                p: 0.8,
                                                borderRadius: '8px',
                                                backgroundColor: 'rgba(0, 168, 132, 0.05)',
                                                color: 'primary.main',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {getMessageIcon(msg.MessageType)}
                                        </Box> */}
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: '#3b4a54',
                                                fontSize: '0.925rem',
                                                lineHeight: 1.5,
                                                fontWeight: 400,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 4, // Allow more lines for message
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                wordBreak: 'break-word'
                                            }}
                                        >
                                            {highlightText(msg.Message, localQuery)}
                                        </Typography>
                                    </Box>

                                    {/* Footer Context - Secondary Info */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            pt: 1.2,
                                            borderTop: '1px solid #f0f2f5'
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.7rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em'
                                            }}
                                        >
                                            {msg.SenderInfo || (msg.Direction === 1 ? 'Me' : 'System')}
                                        </Typography>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#8696a0' }}>
                                            <Typography variant="caption" sx={{ fontSize: '0.725rem' }}>
                                                {formatDate(msg.DateTime)}
                                            </Typography>
                                            <span style={{ fontSize: '10px', opacity: 0.5 }}>•</span>
                                            <Typography variant="caption" sx={{ fontSize: '0.725rem' }}>
                                                {formatTime(msg.DateTime)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}
            </div>
        </div>
    );
};

export default SearchMessages;
