import React from 'react';
import { Box, Chip, Divider, Paper, Typography, Link } from '@mui/material';
import { Bug, Rocket, Sparkles, ExternalLink } from 'lucide-react';
import './Changelog.scss';

const PRIORITY_COLOR = {
    high: 'error',
    medium: 'warning',
    low: 'info',
};

const Changelog = () => {
    const changelog = {
        newFeatures: [
            {
                title: 'Media Preview Improvements',
                description: 'Improved media preview navigation and thumbnails for a smoother experience.',
                date: '2026-01-13',
                priority: 'medium',
                link: '/features/media-preview'
            },
            {
                title: 'Media Files Validation (30 files, 100MB max)',
                description: 'Added validation to restrict uploads to supported file types, max 30 files and 100MB total.',
                date: '2026-01-13',
                priority: 'high',
                link: '/features/media-validation'
            },
            {
                title: 'Media Viewer Zoom In / Out',
                description: 'Users can now zoom in and out of images in the media viewer for better visibility.',
                date: '2026-01-13',
                priority: 'medium',
                link: '/features/media-zoom'
            },
        ],

        bugFixes: [
            {
                title: 'Message Cut-off Issue',
                description: 'Fixed message cut-off issue in the chat interface.',
                date: '2026-01-13',
                priority: 'high',
                link: '/bugs/message-cutoff'
            },
            {
                title: 'Login Back Button Redirect',
                description: 'Prevented returning to the login page after successful login when using the browser back button.',
                date: '2026-01-13',
                priority: 'medium',
                link: '/bugs/login-redirect'
            },
            {
                title: 'Keyboard Navigation Sync',
                description: 'Arrow key navigation now keeps preview, filename, and thumbnails fully synchronized.',
                date: '2026-01-13',
                priority: 'medium',
                link: '/bugs/keyboard-sync'
            },
            {
                title: 'Incorrect Time Display Issue',
                description: 'Resolved an issue where incorrect timestamps were shown in messages.',
                date: '2026-01-13',
                priority: 'high',
                link: '/bugs/time-display'
            },
            {
                title: 'Emoji Not Displaying in Messages',
                description: 'Fixed an issue where emojis were not rendering correctly in chat messages.',
                date: '2026-01-13',
                priority: 'high',
                link: '/bugs/emoji-render'
            }
        ],

        upcoming: [
            {
                title: 'Changelog Edit UI',
                description: 'Admin-friendly UI to add or edit changelog items without code changes.',
                date: 'planned',
                priority: 'low',
                link: '/upcoming/changelog-ui'
            }
        ]
    };


    const renderItem = (item) => {
        return (
            <div key={`${item.title}-${item.date}`} className="changelog-item">
                <div className="changelog-item__header">
                    <Typography className="changelog-item__title">
                        {item.title}
                    </Typography>

                    <div className="changelog-item__meta">
                        {item.priority && (
                            <Chip
                                size="small"
                                label={item.priority.toUpperCase()}
                                color={PRIORITY_COLOR[item.priority]}
                                className="changelog-item__priority"
                            />
                        )}
                        <Typography className="changelog-item__date">
                            {item.date}
                        </Typography>
                    </div>
                </div>

                <Typography className="changelog-item__desc">
                    {item.description}
                </Typography>
            </div>
        );
    };

    const renderSection = ({ title, icon, items }) => {
        return (
            <Paper className="changelog-section" elevation={0}>
                <div className="changelog-section__title">
                    <span className="changelog-section__icon">{icon}</span>
                    <Typography className="changelog-section__text" title={title}>
                        {title}
                    </Typography>
                </div>

                <Divider />

                <div className="changelog-section__content">
                    {items.length === 0 ? (
                        <Typography className="changelog-empty">
                            No items yet.
                        </Typography>
                    ) : (
                        items.map(renderItem)
                    )}
                </div>
            </Paper>
        );
    };

    return (
        <Box className="changelog-page">
            <div className="changelog-page__header">
                <Typography className="changelog-page__title">
                    Changelog
                </Typography>
                <Typography className="changelog-page__subtitle">
                    Track new features, bug fixes, and upcoming work.
                </Typography>
            </div>

            <div className="changelog-grid">
                {renderSection({
                    title: 'New Features',
                    icon: <Sparkles size={18} />,
                    items: changelog.newFeatures,
                })}
                {renderSection({
                    title: 'Bug Fixes',
                    icon: <Bug size={18} />,
                    items: changelog.bugFixes,
                })}
                {renderSection({
                    title: 'Upcoming',
                    icon: <Rocket size={18} />,
                    items: changelog.upcoming,
                })}
            </div>
        </Box>
    );
};

export default Changelog;
