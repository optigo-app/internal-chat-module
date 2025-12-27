import React from 'react';
import { Box, Button, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Skeleton, Typography } from '@mui/material';
import useLazyLoading from './useLazyLoading';
import { Link, Share2 } from 'lucide-react';

const LinksSection = ({
    links,
    isLoading,
    hasMore,
    onLoadMore,
    onShare,
    paginationFlag
}) => {

    // Lazy loading hook
    const lastLinkElementRef = useLazyLoading(onLoadMore, hasMore && paginationFlag, isLoading);

    // Show nothing if loading and no items
    if (isLoading && links.length === 0) {
        return (
            <Box>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
                    Links
                </Typography>
                <List disablePadding>
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <ListItem
                            key={`link-skel-${idx}`}
                            disableGutters
                            secondaryAction={(
                                <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 2 }} />
                            )}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 2 }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={<Skeleton variant="text" width="70%" />}
                                secondary={<Skeleton variant="text" width="55%" />}
                            />
                        </ListItem>
                    ))}
                </List>
            </Box>
        );
    }

    // Show "No items" message if no items after loading
    if (links.length === 0) {
        return (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5, opacity: 0.5 }}>
                    <Link size={44} />
                </Box>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>No Links found</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    Shared Links and Url will appear here
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
                {links.length} links
            </Typography>
            <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {links.map((link, index) => {
                    const isLastElement = index === links.length - 1;
                    const title = link.MediaName || `Link ${link.Id}`;
                    const url = link.MediaUrl || '';

                    return (
                        <Box key={link.Id} ref={isLastElement ? lastLinkElementRef : null}>
                            <ListItem disableGutters disablePadding>
                                <ListItemButton
                                    onClick={() => {
                                        if (url) window.open(url, '_blank');
                                    }}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                                        <Link size={18} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={title}
                                        secondary={url}
                                        primaryTypographyProps={{
                                            noWrap: true,
                                            title,
                                            sx: { fontWeight: 500 }
                                        }}
                                        secondaryTypographyProps={{ noWrap: true, title: url }}
                                    />
                                    <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onShare(url);
                                        }}
                                        title="Share link"
                                        sx={{
                                            ml: 1,
                                            color: 'text.secondary',
                                            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' }
                                        }}
                                    >
                                        <Share2 size={18} />
                                    </IconButton>
                                </ListItemButton>
                            </ListItem>
                        </Box>
                    );
                })}
            </List>

            {!paginationFlag && hasMore ? (
                <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
                    <Button variant="outlined" onClick={onLoadMore} disabled={isLoading} size="small">
                        {isLoading ? 'Loading...' : 'Load More'}
                    </Button>
                </Box>
            ) : null}
        </Box>
    );
};

export default LinksSection;