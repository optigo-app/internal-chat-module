import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Typography,
    Avatar,
    IconButton
} from '@mui/material';
import {
    Description,
    Link as LinkIcon,
    Close,
    Person
} from '@mui/icons-material';
import './CustomerDetails.scss';
import { LoginContext } from '../../context/LoginData';
import { fetchMediaLists } from '../../API/MediaLists/MediaLists';
import { MediaApi } from '../../API/InitialApi/MediaApi';
import MediaSection from './MediaSection';
import DocumentsSection from './DocumentsSection';
import LinksSection from './LinksSection';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';
import { FileText, Image, Link } from 'lucide-react';

const CustomerDetails = ({ customer, onClose, open, variant = 'drawer' }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('media');
    const [mediaItems, setMediaItems] = useState({
        images: [],
        videos: [],
        documents: [],
        links: []
    });
    const [pagination, setPagination] = useState({
        images: { page: 1, hasMore: true, isLoading: false },
        videos: { page: 1, hasMore: true, isLoading: false },
        documents: { page: 1, hasMore: true, isLoading: false },
        links: { page: 1, hasMore: true, isLoading: false }
    });
    const [mediaCache, setMediaCache] = useState({});
    const [isStarred, setIsStarred] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [readReceipts, setReadReceipts] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const { PERMISSION_SET, auth } = useContext(LoginContext);
    const pageSize = 6;
    
    // Flag for enabling/disabling pagination for testing
    const enablePagination = true;

    const can = (perm) => PERMISSION_SET?.has(perm);

    const inFlightRequestsRef = useRef(new Set());
    const fetchedPagesRef = useRef(new Set());

    const getItemKey = (item) => item?.Id ?? item?.MediaUrl;
    const mergeUniqueByKey = (prevList, nextList) => {
        const map = new Map();
        (prevList || []).forEach((it) => {
            const k = getItemKey(it);
            if (k != null) map.set(k, it);
        });
        (nextList || []).forEach((it) => {
            const k = getItemKey(it);
            if (k != null) map.set(k, it);
        });
        return Array.from(map.values());
    };

    const fetchMediaItem = async (mediaUrl) => {
        if (!mediaUrl || mediaCache[mediaUrl]) return mediaCache[mediaUrl];

        try {
            const blob = await MediaApi(auth?.whatsappKey, auth?.whatsappNumber, mediaUrl);
            if (blob) {
                const objectUrl = URL.createObjectURL(blob);
                setMediaCache(prev => ({ ...prev, [mediaUrl]: objectUrl }));
                return objectUrl;
            }
        } catch (error) {
            console.error('Error fetching media:', error);
        }
        return null;
    };

    const processMediaItems = (items) => {
        const categorized = {
            images: [],
            videos: [],
            documents: [],
            links: []
        };

        items.forEach(item => {
            const mediaItem = { ...item };

            if (item.MessageType === 'image') {
                categorized.images.push(mediaItem);
            } else if (item.MessageType === 'video') {
                categorized.videos.push(mediaItem);
            } else if (item.MessageType === 'document') {
                categorized.documents.push(mediaItem);
            } else {
                categorized.links.push(mediaItem);
            }
        });

        return categorized;
    };

    const fetchMediaData = async (type, page = 1) => {
        if (!customer?.ConversationId) return;

        const group = (type === 'images' || type === 'videos') ? 'media' : 'docs';
        const requestKey = `${customer.ConversationId}:${group}:${page}`;
        if (inFlightRequestsRef.current.has(requestKey) || fetchedPagesRef.current.has(requestKey)) return;

        inFlightRequestsRef.current.add(requestKey);
        if (pagination[type]?.isLoading) {
            inFlightRequestsRef.current.delete(requestKey);
            return;
        }

        setPagination(prev => ({
            ...prev,
            [type]: { ...prev[type], isLoading: true }
        }));

        try {
            const response = await fetchMediaLists(page, pageSize, customer.ConversationId, auth.userId);
            if (response?.data) {
                const categorized = processMediaItems(response.data);

                // For images, also update videos (since they come from the same API)
                if (type === 'images' || type === 'videos') {
                    setMediaItems(prev => ({
                        ...prev,
                        images: page === 1 ? categorized.images : mergeUniqueByKey(prev.images, categorized.images),
                        videos: page === 1 ? categorized.videos : mergeUniqueByKey(prev.videos, categorized.videos)
                    }));

                    const hasMoreItems = response.data.length === pageSize;
                    setPagination(prev => ({
                        ...prev,
                        images: {
                            ...prev.images,
                            page,
                            hasMore: hasMoreItems,
                            isLoading: false
                        },
                        videos: {
                            ...prev.videos,
                            page,
                            hasMore: hasMoreItems,
                            isLoading: false
                        }
                    }));
                } 
                // For documents, also update links (since they come from the same API)
                else if (type === 'documents' || type === 'links') {
                    setMediaItems(prev => ({
                        ...prev,
                        documents: page === 1 ? categorized.documents : mergeUniqueByKey(prev.documents, categorized.documents),
                        links: page === 1 ? categorized.links : mergeUniqueByKey(prev.links, categorized.links)
                    }));

                    const hasMoreItems = response.data.length === pageSize;
                    setPagination(prev => ({
                        ...prev,
                        documents: {
                            ...prev.documents,
                            page,
                            hasMore: hasMoreItems,
                            isLoading: false
                        },
                        links: {
                            ...prev.links,
                            page,
                            hasMore: hasMoreItems,
                            isLoading: false
                        }
                    }));
                }

                // Pre-fetch media URLs for all items
                await Promise.all(
                    response.data
                        .filter(item => item.MediaUrl)
                        .map(item => fetchMediaItem(item.MediaUrl))
                );

                fetchedPagesRef.current.add(requestKey);
            }
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            setPagination(prev => ({
                ...prev,
                [type]: { ...prev[type], hasMore: false, isLoading: false }
            }));
        } finally {
            inFlightRequestsRef.current.delete(requestKey);
        }
    };

    const loadMoreItems = (type) => {
        if (!pagination[type]?.isLoading && pagination[type]?.hasMore) {
            const nextPage = pagination[type].page + 1;
            fetchMediaData(type, nextPage);
        }
    };

    // Updated version to handle combined data
    const loadMoreMedia = () => {
        if (!pagination.images.isLoading && (pagination.images.hasMore || pagination.videos.hasMore)) {
            const nextPage = pagination.images.page + 1;
            fetchMediaData('images', nextPage);
        }
    };

    const loadMoreDocuments = () => {
        if (!pagination.documents.isLoading && (pagination.documents.hasMore || pagination.links.hasMore)) {
            const nextPage = pagination.documents.page + 1;
            fetchMediaData('documents', nextPage);
        }
    };

    useEffect(() => {
        if (customer.ConversationId) {
            // Reset state when customer changes
            setMediaItems({ images: [], videos: [], documents: [], links: [] });
            setPagination({
                images: { page: 1, hasMore: true, isLoading: false },
                videos: { page: 1, hasMore: true, isLoading: false },
                documents: { page: 1, hasMore: true, isLoading: false },
                links: { page: 1, hasMore: true, isLoading: false }
            });

            inFlightRequestsRef.current.clear();
            fetchedPagesRef.current.clear();

            // Initial fetch for media (images and videos) and documents/links
            fetchMediaData('images', 1);
            fetchMediaData('documents', 1);
        }
    }, [customer.ConversationId]);

    const handleMediaClick = (media) => {
        // Handle media preview or open in new tab
        if (media.MessageType === 'image' || media.MessageType === 'video') {
            window.open(mediaCache[media.MediaUrl] || media.MediaUrl, '_blank');
        } else if (media.MessageType === 'document') {
            // Handle document preview or download
            handleDownload(media.MediaUrl, media.MediaName || `document_${media.Id}`);
        }
    };

    const handleDownload = async (url, filename) => {
        try {
            const link = document.createElement('a');
            const objectUrl = mediaCache[url] || await fetchMediaItem(url);

            if (objectUrl) {
                link.href = objectUrl;
                link.download = filename || 'download';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const handleShare = (url) => {
        if (navigator.share) {
            navigator.share({
                title: 'Check this out',
                url: url
            }).catch(console.error);
        } else {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard.writeText(url).then(() => {
                // Show success message
                alert('Link copied to clipboard!');
            }).catch(err => {
                console.error('Could not copy text: ', err);
            });
        }
    };

    // Lazy loading implementation using Intersection Observer
    const handleLazyLoad = useCallback((type) => {
        if (!pagination[type]?.isLoading && pagination[type]?.hasMore) {
            loadMoreItems(type);
        }
    }, [pagination]);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        if (variant !== 'panel') {
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = prevOverflow;
                window.removeEventListener('keydown', onKeyDown);
            };
        }

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose, variant]);

    const displayName = getCustomerDisplayName(customer);
    const avatarSeed = getCustomerAvatarSeed(customer);
    const cfg = customer?.avatarConfig || getWhatsAppAvatarConfig(avatarSeed, 80);

    return (
        <>
            {variant !== 'panel' ? (
                <div
                    className={`customer-details-backdrop ${open ? 'open' : ''}`}
                    onClick={onClose}
                />
            ) : null}
            <div
                className={`customer-details-container ${variant === 'panel' ? 'panel' : ''} ${open ? 'slide-in' : ''} ${open ? 'visible' : ''}`}
                role="dialog"
                aria-modal={open ? 'true' : 'false'}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="details-content">
                    {/* Header Section */}
                    <div className="header-section">
                        <div className="header-left">
                            <Typography className="header-title">Contact Info</Typography>
                        </div>
                        <div className="header-right">
                            <IconButton className="back-button" onClick={onClose}>
                                <Close />
                            </IconButton>
                        </div>
                    </div>

                    <div className="content-scroll">
                        {/* Profile Section */}
                        <div className="profile-section">
                            <div className="avatar-container">
                                <Avatar
                                    {...cfg}
                                    alt={displayName}
                                    className="profile-avatar"
                                >
                                    {!hasCustomerName(customer) ? (
                                        <Person fontSize="small" />
                                    ) : (
                                        cfg?.children
                                    )}
                                </Avatar>
                            </div>

                            <Typography className="customer-name">{displayName}</Typography>
                        </div>

                        {/* Media Tabs */}
                        <div className="media-section">
                            <div className="media-tabs">
                                <button
                                    className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('media')}
                                >
                                    <Image size={20} />
                                    <span>Media</span>
                                </button>
                                <button
                                    className={`tab-button ${activeTab === 'docs' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('docs')}
                                >
                                    <FileText size={20} />
                                    <span>Docs</span>
                                </button>
                                <button
                                    className={`tab-button ${activeTab === 'links' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('links')}
                                >
                                    <Link size={20} />
                                    <span>Links</span>
                                </button>
                            </div>

                            <div className="tab-content">
                                {activeTab === 'media' && (
                                    <MediaSection
                                        mediaItems={mediaItems}
                                        mediaCache={mediaCache}
                                        isLoading={pagination.images.isLoading || pagination.videos.isLoading}
                                        hasMore={pagination.images.hasMore || pagination.videos.hasMore}
                                        onLoadMore={loadMoreMedia}
                                        onMediaClick={handleMediaClick}
                                        paginationFlag={enablePagination}
                                    />
                                )}
                                {activeTab === 'docs' && (
                                    <DocumentsSection
                                        documents={mediaItems.documents}
                                        mediaCache={mediaCache}
                                        isLoading={pagination.documents.isLoading}
                                        hasMore={pagination.documents.hasMore}
                                        onLoadMore={loadMoreDocuments}
                                        onDocumentClick={handleMediaClick}
                                        onDownload={handleDownload}
                                        paginationFlag={enablePagination}
                                    />
                                )}
                                {activeTab === 'links' && (
                                    <LinksSection
                                        links={mediaItems.links}
                                        isLoading={pagination.links.isLoading}
                                        hasMore={pagination.links.hasMore}
                                        onLoadMore={loadMoreDocuments}
                                        onShare={handleShare}
                                        paginationFlag={enablePagination}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
export default CustomerDetails;