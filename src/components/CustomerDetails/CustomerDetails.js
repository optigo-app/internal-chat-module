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
import MediaSection from './MediaSection';
import DocumentsSection from './DocumentsSection';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';
import { FileText, Image, Video } from 'lucide-react';

const CustomerDetails = ({ customer, onClose, open, variant = 'panel' }) => {
    const [activeTab, setActiveTab] = useState('media');
    const [mediaItems, setMediaItems] = useState({
        images: [],
        videos: [],
        documents: []
    });
    const [pagination, setPagination] = useState({
        images: { page: 1, hasMore: true, isLoading: false },
        videos: { page: 1, hasMore: true, isLoading: false },
        documents: { page: 1, hasMore: true, isLoading: false }
    });
    const { auth } = useContext(LoginContext);
    const pageSize = 6;
    
    // Flag for enabling/disabling pagination for testing
    const enablePagination = true;

    const inFlightRequestsRef = useRef(new Set());
    const fetchedPagesRef = useRef(new Set());

    const getItemKey = (item) => item?.Id ?? item?.FileUrl;
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

    const processMediaItems = (items) => {
        const categorized = {
            images: [],
            videos: [],
            documents: []
        };

        items.forEach(item => {
            const mimeType = item.MimeType || '';
            const mediaItem = {
                ...item,
                src: item.FileUrl,
                name: item.FileName,
                type: mimeType
            };

            if (mimeType.startsWith('image/')) {
                categorized.images.push(mediaItem);
            } else if (mimeType.startsWith('video/')) {
                categorized.videos.push(mediaItem);
            } else {
                categorized.documents.push(mediaItem);
            }
        });

        console.log('Categorized items:', categorized);
        return categorized;
    };

    const fetchMediaData = async (type, page = 1) => {
        if (!customer?.ConversationId) return;

        const requestKey = `${customer.ConversationId}:all:${page}`;
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

                // Update all categories since API returns all file types together
                setMediaItems(prev => ({
                    images: page === 1 ? categorized.images : mergeUniqueByKey(prev.images, categorized.images),
                    videos: page === 1 ? categorized.videos : mergeUniqueByKey(prev.videos, categorized.videos),
                    documents: page === 1 ? categorized.documents : mergeUniqueByKey(prev.documents, categorized.documents)
                }));

                const hasMoreItems = response.data.length === pageSize;
                setPagination(prev => ({
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
                    },
                    documents: {
                        ...prev.documents,
                        page,
                        hasMore: hasMoreItems,
                        isLoading: false
                    }
                }));

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
        if (!pagination.images.isLoading && pagination.images.hasMore) {
            const nextPage = pagination.images.page + 1;
            fetchMediaData('images', nextPage);
        }
    };

    const loadMoreDocuments = () => {
        if (!pagination.documents.isLoading && pagination.documents.hasMore) {
            const nextPage = pagination.documents.page + 1;
            fetchMediaData('documents', nextPage);
        }
    };

    useEffect(() => {
        if (customer.ConversationId) {
            // Reset state when customer changes
            setMediaItems({ images: [], videos: [], documents: [] });
            setPagination({
                images: { page: 1, hasMore: true, isLoading: false },
                videos: { page: 1, hasMore: true, isLoading: false },
                documents: { page: 1, hasMore: true, isLoading: false }
            });

            inFlightRequestsRef.current.clear();
            fetchedPagesRef.current.clear();

            // Initial fetch for all media types
            fetchMediaData('images', 1);
        }
    }, [customer.ConversationId]);

    const handleMediaClick = (media) => {
        // Handle media preview or open in new tab
        if (media.type?.startsWith('image/') || media.type?.startsWith('video/')) {
            window.open(media.src || media.FileUrl, '_blank');
        } else {
            // Handle document preview or download
            handleDownload(media.src || media.FileUrl, media.name || media.FileName || `document_${media.Id}`);
        }
    };

    const handleDownload = async (url, filename) => {
        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || 'download';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
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
                                    className={`tab-button ${activeTab === 'videos' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('videos')}
                                >
                                    <Video size={20} />
                                    <span>Videos</span>
                                </button>
                                <button
                                    className={`tab-button ${activeTab === 'docs' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('docs')}
                                >
                                    <FileText size={20} />
                                    <span>Docs</span>
                                </button>
                            </div>

                            <div className="tab-content">
                                {activeTab === 'media' && (
                                    <MediaSection
                                        mediaItems={{ images: mediaItems.images, videos: [] }}
                                        isLoading={pagination.images.isLoading}
                                        hasMore={pagination.images.hasMore}
                                        onLoadMore={loadMoreMedia}
                                        onMediaClick={handleMediaClick}
                                        paginationFlag={enablePagination}
                                    />
                                )}
                                {activeTab === 'videos' && (
                                    <MediaSection
                                        mediaItems={{ images: [], videos: mediaItems.videos }}
                                        isLoading={pagination.videos.isLoading}
                                        hasMore={pagination.videos.hasMore}
                                        onLoadMore={loadMoreMedia}
                                        onMediaClick={handleMediaClick}
                                        paginationFlag={enablePagination}
                                    />
                                )}
                                {activeTab === 'docs' && (
                                    <DocumentsSection
                                        documents={mediaItems.documents}
                                        isLoading={pagination.documents.isLoading}
                                        hasMore={pagination.documents.hasMore}
                                        onLoadMore={loadMoreDocuments}
                                        onDocumentClick={handleMediaClick}
                                        onDownload={handleDownload}
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