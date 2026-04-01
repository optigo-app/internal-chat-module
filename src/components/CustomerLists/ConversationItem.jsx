const ConversationItem = React.memo(({ member, isSelected, unread, onClick }) => {

    return (
        <li
            className={`member-item ${isSelected ? "active" : ""}`}
            onClick={() => onClick(member)}
        >
            <div className="member-avatar">
                <ConversationAvatar member={member} />
            </div>

            <div className="member-info">
                <div className="member-header">
                    <Typography className={unread ? "member-name-unread" : "member-name"}>
                        {member.name}
                    </Typography>

                    <Typography variant="caption">
                        {member.lastMessageTime}
                    </Typography>
                </div>
            </div>
        </li>
    );
});