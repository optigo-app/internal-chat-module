import React, { useMemo } from "react";
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Reply,
  Forward,
  Copy,
  Trash2,
  Info,
  User,
  Edit2,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { handleDownloadFile, isMessageEditable } from "../../utils/globalFunc";

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
  canDelete = true,
  selectedCustomer,
}) => {
  const theme = useTheme();
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

    selectedCustomer?.RemoveInGroup != 1 && {
      label: "Reply",
      icon: <Reply size={18} />,
      action: () => onReply?.(message),
    },

    selectedCustomer?.IsGroup == 1 && message?.Direction === 0 && {
      label: `Message ${message?.SenderInfo || "User"}`,
      icon: <User size={18} />,
      action: () => onMemberRedirect?.(message),
    },
    isText &&
    {
      label: "Copy",
      icon: <Copy size={17} />,
      action: handleCopy,
    },
    !isText &&
    {
      label: message?.AttachmentCount > 1 ? "Download All" : "Download",
      icon: <Download size={17} />,
      action: () => handleDownloadFile(message),
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

    canDelete && {
      label: "Delete",
      icon: <Trash2 size={18} />,
      danger: true,
      action: () => onDelete?.(message),
    },
  ].filter(item => item && !item.hidden), [message, isWithinTimeLimit, isOutgoing, isText]);

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
          minWidth: 220,
          borderRadius: "16px",
          py: 0.8,
          mt: 0.5,
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "blur(12px) saturate(180%)",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 20px 25px -5px rgba(0, 0, 0, 0.1)
          `,
          "& .MuiList-root": {
            padding: "6px",
          },
        },
      }}
      TransitionProps={{ timeout: 150 }}
      transformOrigin={{ horizontal: "left", vertical: "top" }}
    >
      {items?.map((item, index) =>
        item.divider ? (
          <Divider key={index} sx={{ my: 0.8, opacity: 0.6 }} />
        ) : (
          <MenuItem
            key={index}
            onClick={() => handleClick(item.action)}
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: "10px",
              mb: 0.2,
              gap: 1.5,
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                backgroundColor: item.danger
                  ? alpha(theme.palette.error.main, 0.08)
                  : alpha(theme.palette.primary.main, 0.08),
                color: item.danger ? theme.palette.error.main : theme.palette.primary.main,
                transform: "translateX(4px)",
                "& .MuiListItemIcon-root": {
                  color: item.danger ? theme.palette.error.main : theme.palette.primary.main,
                  transform: "scale(1.1)",
                },
              },
            }}
          >
            {item.icon && (
              <ListItemIcon
                sx={{
                  minWidth: "auto !important",
                  color: item.danger ? alpha(theme.palette.error.main, 0.8) : alpha(theme.palette.text.secondary, 0.8),
                  transition: "all 0.2s ease",
                }}
              >
                {item.icon}
              </ListItemIcon>
            )}

            <ListItemText
              primary={item.label}
              sx={{
                m: 0,
                "& .MuiTypography-root": {
                  fontSize: "13.5px",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
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