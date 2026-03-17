import AddMemberDialog from '../ReusableComponent/AddMemberDialog';

const GroupDialogs = ({
    isAddMemberDialogOpen,
    setIsAddMemberDialogOpen,
    handleAddMembersSubmit,
    localGroupData,
    isParticipantSearchOpen,
    setIsParticipantSearchOpen,
    handleMemberClick
}) => {
    return (
        <>
            {/* Add Member Dialog */}
            <AddMemberDialog
                open={isAddMemberDialogOpen}
                onClose={() => setIsAddMemberDialogOpen(false)}
                onSubmit={handleAddMembersSubmit}
                existingMemberIds={localGroupData.members.map(m => m.UserId)}
            />

            <AddMemberDialog
                open={isParticipantSearchOpen}
                onClose={() => setIsParticipantSearchOpen(false)}
                onSubmit={() => { }}
                mode="search"
                groupMembers={localGroupData.members}
                onMemberClick={handleMemberClick}
            />
        </>
    );
};

export default GroupDialogs;
