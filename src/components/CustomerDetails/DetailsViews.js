import ProfileSection from './ProfileSection';
import ActionButtons from './ActionButtons';
import GroupDescription from './GroupDescription';
import MediaPreview from './MediaPreview';
import GroupMembersSection from './GroupMembersSection';
import SettingsSection from './SettingsSection';
import DangerZone from './DangerZone';
import MediaPanelView from './MediaPanelView';
import SearchMessages from './SearchMessages';
import GroupPermissions from './GroupPermissions';
import MessageInfo from './MessageInfo';
import { Typography } from '@mui/material';

const DetailsViews = ({
    currentViewState,
    direction,
    customer,
    isCurrentUserAdmin,
    avatarSeed,
    localGroupData,
    displayName,
    isEditingName,
    setIsEditingName,
    editedName,
    setEditedName,
    handleSaveName,
    startEditingName,
    handleProfileUploadComplete,
    handleProfileRemoveComplete,
    handleOpenAddMember,
    setDirection,
    setCurrentViewState,
    isEditingDesc,
    editedDesc,
    setEditedDesc,
    handleSaveDesc,
    startEditingDesc,
    setIsEditingDesc,
    mediaItems,
    isRemovedFromCurrentGroup,
    auth,
    setIsParticipantSearchOpen,
    handleMemberClick,
    showAllMembers,
    setShowAllMembers,
    isFavorite,
    handleToggleFavorite,
    handleClearChatClick,
    handleExitGroupClick,
    activeTab,
    setActiveTab,
    pagination,
    loadMoreMedia,
    loadMoreDocuments,
    handleMediaClick,
    handleDownload,
    enablePagination,
    messages,
    searchQuery,
    setSearchQuery,
    scrollToMessage,
    groupPermissions,
    handlePermissionChange,
    messageInfo,
    onClose,
    searchResults = [],
    isSearching = false,
    onSearchMessages,
    containerRef
}) => {
    return (
        <div className={`views-container view-${currentViewState} direction-${direction}`}>
            {currentViewState === 'info' ? (
                <div className={`view-content info-view ${direction}`} key="info">
                    <div className="info-view-container">
                        <ProfileSection
                            customer={customer}
                            isCurrentUserAdmin={isCurrentUserAdmin}
                            avatarSeed={avatarSeed}
                            localGroupData={localGroupData}
                            displayName={displayName}
                            isEditingName={isEditingName}
                            setIsEditingName={setIsEditingName}
                            editedName={editedName}
                            setEditedName={setEditedName}
                            handleSaveName={handleSaveName}
                            startEditingName={startEditingName}
                            handleProfileUploadComplete={handleProfileUploadComplete}
                            handleProfileRemoveComplete={handleProfileRemoveComplete}
                        />

                        <ActionButtons
                            customer={customer}
                            isCurrentUserAdmin={isCurrentUserAdmin}
                            onAddClick={handleOpenAddMember}
                            onSearchClick={() => {
                                setDirection('forward');
                                setCurrentViewState('search');
                            }}
                        />

                        {customer?.IsGroup === 1 && (
                            <GroupDescription
                                localGroupData={localGroupData}
                                isCurrentUserAdmin={isCurrentUserAdmin}
                                isEditingDesc={isEditingDesc}
                                editedDesc={editedDesc}
                                setEditedDesc={setEditedDesc}
                                handleSaveDesc={handleSaveDesc}
                                startEditingDesc={startEditingDesc}
                                setIsEditingDesc={setIsEditingDesc}
                            />
                        )}

                        <MediaPreview
                            mediaItems={mediaItems}
                            onClick={() => {
                                setDirection('forward');
                                setCurrentViewState('media');
                            }}
                        />

                        {customer?.IsGroup === 1 && isRemovedFromCurrentGroup && (
                            <div className="removed-from-group-message" style={{ textAlign: 'center' }}>
                                <Typography style={{ color: '#856404', fontSize: '14px', fontWeight: 500 }}>
                                    You're no longer a member of this group
                                </Typography>
                            </div>
                        )}

                        {customer?.IsGroup === 1 && (
                            <GroupMembersSection
                                members={localGroupData.members}
                                isCurrentUserAdmin={isCurrentUserAdmin}
                                auth={auth}
                                onAddMemberClick={handleOpenAddMember}
                                onSearchClick={() => setIsParticipantSearchOpen(true)}
                                onMemberClick={handleMemberClick}
                                showAllMembers={showAllMembers}
                                setShowAllMembers={setShowAllMembers}
                            />
                        )}

                        <SettingsSection
                            isFavorite={isFavorite}
                            onToggleFavorite={handleToggleFavorite}
                            isGroup={customer?.IsGroup === 1}
                            isCurrentUserAdmin={isCurrentUserAdmin}
                            onNavigateToPermissions={() => {
                                setDirection('forward');
                                setTimeout(() => setCurrentViewState('permissions'), 0);
                            }}
                        />

                        <DangerZone
                            onClearChat={handleClearChatClick}
                            isGroup={customer?.IsGroup === 1}
                            onExitGroup={handleExitGroupClick}
                            isRemovedFromCurrentGroup={isRemovedFromCurrentGroup}
                        />
                    </div>
                </div>
            ) : currentViewState === 'media' ? (
                <div className={`view-content media-view ${direction}`} key="media">
                    <MediaPanelView
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        mediaItems={mediaItems}
                        pagination={pagination}
                        onLoadMoreMedia={loadMoreMedia}
                        onLoadMoreDocuments={loadMoreDocuments}
                        onMediaClick={handleMediaClick}
                        onDownload={handleDownload}
                        enablePagination={enablePagination}
                    />
                </div>
            ) : currentViewState === 'search' ? (
                <div className={`view-content search-view ${direction}`} key="search">
                    <SearchMessages
                        messages={messages}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onResultClick={(msg) => {
                            if (scrollToMessage && containerRef) {
                                scrollToMessage(msg.MessageId || msg.id, containerRef);
                            }
                        }}
                        searchResults={searchResults}
                        isSearching={isSearching}
                        onSearchMessages={onSearchMessages}
                    />
                </div>
            ) : currentViewState === 'permissions' ? (
                <div className={`view-content permissions-view ${direction}`} key="permissions">
                    <GroupPermissions
                        permissions={groupPermissions}
                        onPermissionChange={handlePermissionChange}
                        onBack={() => { setDirection('backward'); setCurrentViewState('info'); }}
                    />
                </div>
            ) : currentViewState === 'messageInfo' ? (
                <div className={`view-content message-info-view ${direction}`} key="messageInfo">
                    <MessageInfo
                        messageInfo={messageInfo}
                        localGroupData={localGroupData}
                        auth={auth}
                        selectedCustomer={customer}
                        messages={messages}
                    />
                </div>
            ) : null}
        </div>
    );
};

export default DetailsViews;
