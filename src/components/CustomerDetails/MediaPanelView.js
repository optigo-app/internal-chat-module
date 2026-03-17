import { Tabs, Tab } from '@mui/material';
import MediaSection from './MediaSection';
import DocumentsSection from './DocumentsSection';

const MediaPanelView = ({
    activeTab,
    setActiveTab,
    mediaItems,
    pagination,
    onLoadMoreMedia,
    onLoadMoreDocuments,
    onMediaClick,
    onDownload,
    enablePagination
}) => {
    return (
        <div className="media-panel-view">
            <Tabs
                value={activeTab}
                onChange={(e, val) => setActiveTab(val)}
                variant="fullWidth"
                className="mui-tabs-container"
                sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                        minHeight: '48px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        fontSize: '14px',
                        letterSpacing: '0.5px',
                        color: '#667781',
                        '&.Mui-selected': {
                            color: 'primary.main',
                        }
                    },
                    '& .MuiTabs-indicator': {
                        backgroundColor: 'primary.main',
                        height: 3
                    }
                }}
            >
                <Tab label="Media" value="media" />
                <Tab label="Docs" value="docs" />
                <Tab label="Video" value="videos" />
            </Tabs>
            <div className="tab-content">
                {activeTab === 'media' && (
                    <MediaSection
                        mediaItems={{ images: mediaItems.images, videos: [] }}
                        isLoading={pagination.images.isLoading}
                        hasMore={pagination.images.hasMore}
                        onLoadMore={onLoadMoreMedia}
                        onMediaClick={onMediaClick}
                        paginationFlag={enablePagination}
                    />
                )}
                {activeTab === 'docs' && (
                    <DocumentsSection
                        documents={mediaItems.documents}
                        isLoading={pagination.documents.isLoading}
                        hasMore={pagination.documents.hasMore}
                        onLoadMore={onLoadMoreDocuments}
                        onDocumentClick={onMediaClick}
                        onDownload={onDownload}
                        paginationFlag={enablePagination}
                    />
                )}
                {activeTab === 'videos' && (
                    <MediaSection
                        mediaItems={{ images: [], videos: mediaItems.videos }}
                        isLoading={pagination.videos.isLoading}
                        hasMore={pagination.videos.hasMore}
                        onLoadMore={onLoadMoreMedia}
                        onMediaClick={onMediaClick}
                        paginationFlag={enablePagination}
                    />
                )}
            </div>
        </div>
    );
};

export default MediaPanelView;
