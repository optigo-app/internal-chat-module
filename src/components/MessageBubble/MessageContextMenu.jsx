import React, { useMemo } from "react";
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Reply,
  Forward,
  Copy,
  Trash2,
  Info,
  User,
  Edit2,
} from "lucide-react";
import toast from "react-hot-toast";
import { isMessageEditable } from "../../utils/globalFunc";

const MessageContextMenu = ({
  open,
  onClose,
  message,
  mouseX,
  mouseY,
  onReply,
  onForward,
  onDelete,
  onEdit,
  onMessageInfo,
  onMemberRedirect,
}) => {
  const timeLimit = parseInt(process.env.REACT_APP_MESSAGE_EDIT_TIME_LIMIT || "15", 10);

  const isWithinTimeLimit = useMemo(() => {
    return isMessageEditable(message, timeLimit);
  }, [message, timeLimit]);

  const isOutgoing = message?.Direction === 1;
  const isText = message?.MessageType === 'text';

  const handleCopy = () => {
    if (message?.Message) {
      navigator.clipboard.writeText(message.Message);
      toast.success("Text Copied");
    }
  };

  const items = useMemo(() => [
    message?.Direction === 1 && {
      label: "Message Info",
      icon: <Info size={18} />,
      action: () => onMessageInfo?.(message),
    },

    {
      label: "Reply",
      icon: <Reply size={18} />,
      action: () => onReply?.(message),
    },

    message?.Direction === 0 && {
      label: `Message ${message?.SenderInfo || "User"}`,
      icon: <User size={18} />,
      action: () => onMemberRedirect?.(message),
    },

    {
      label: "Copy",
      icon: <Copy size={17} />,
      action: handleCopy,
    },

    {
      label: "Forward",
      icon: <Forward size={18} />,
      action: () => onForward?.(message),
    },

    isOutgoing && isWithinTimeLimit && {
      divider: true,
    },

    isOutgoing && isWithinTimeLimit && isText && {
      label: "Edit",
      icon: <Edit2 size={18} />,
      action: () => onEdit?.(message),
    },

    {
      label: "Delete",
      icon: <Trash2 size={18} />,
      danger: true,
      action: () => onDelete?.(message),
    },
  ].filter(Boolean), [message, isWithinTimeLimit, isOutgoing, isText]);

  const handleClick = (action) => {
    action?.();
    onClose?.();
  };

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        mouseY !== null && mouseX !== null
          ? { top: mouseY, left: mouseX }
          : undefined
      }
      onClick={(e) => e.stopPropagation()}
      PaperProps={{
        elevation: 0,
        sx: {
          minWidth: 180,
          borderRadius: 2,
          py: 0.5,
          boxShadow:
            "0px 6px 18px rgba(0,0,0,0.12), 0px 3px 6px rgba(0,0,0,0.08)",
        },
      }}
      transformOrigin={{ horizontal: "left", vertical: "top" }}
    >
      {items?.map((item, index) =>
        item.divider ? (
          <Divider key={index} sx={{ my: 0.5 }} />
        ) : (
          <MenuItem
            key={index}
            onClick={() => handleClick(item.action)}
            sx={{
              py: 1.1,
              px: 2,
              mb: 0.5,
              borderRadius: 1.5,
              transition: "all 0.2s ease",
              background: item.danger ? "error.main" : "text.primary",
              "&:hover": {
                backgroundColor: item.danger
                  ? "rgba(255,0,0,0.08)"
                  : "action.hover",
                transform: "translateX(3px)",
              },
            }}
          >
            {item.icon && (
              <ListItemIcon sx={{ minWidth: "30px !important" }}>
                {item.icon}
              </ListItemIcon>
            )}

            <ListItemText
              primary={item.label}
              sx={{
                m: 0,
                "& .MuiTypography-root": {
                  fontSize: 14,
                  fontWeight: 500,
                },
              }}
            />
          </MenuItem>
        )
      )}
    </Menu>
  );
};

export default MessageContextMenu;