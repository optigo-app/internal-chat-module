import React from "react";
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Reply,
  Forward,
  Copy,
  Trash2,
  Star,
  Laugh,
} from "lucide-react";
import toast from "react-hot-toast";

// 🌈 Modern styled menu container
const StyledMenu = styled(Menu)(({ theme }) => ({
  "& .MuiPaper-root": {
    borderRadius: "12px",
    minWidth: 190,
    backdropFilter: "blur(12px)",
    background:
      theme.palette.mode === "dark"
        ? "rgba(30, 30, 30, 0.85)"
        : "rgba(255, 255, 255, 0.9)",
    boxShadow:
      "0 4px 16px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
    border:
      theme.palette.mode === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(0,0,0,0.08)",
    padding: "4px",
  },
}));

// ✨ Each menu item
const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  borderRadius: "8px",
  margin: "2px 0",
  fontSize: "0.9rem",
  fontWeight: 500,
  color: theme.palette.text.primary,
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.05)",
    transform: "translateX(2px)",
  },
  "& .MuiListItemIcon-root": {
    minWidth: "32px",
    color:
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.7)"
        : "rgba(0,0,0,0.6)",
  },
  "& svg": {
    width: 18,
    height: 18,
  },
}));

const MessageContextMenu = ({
  open,
  onClose,
  onReply,
  onForward,
  onCopy,
  onDelete,
  onStar,
  onReact,
  message,
  mouseX,
  mouseY,
}) => {
  const handleReply = () => {
    onReply?.(message);
    onClose();
  };

  const handleForward = (e) => {
    e.stopPropagation();
    onForward?.(message, e);
    onClose();
  };

  const handleCopy = () => {
    if (message?.Message) navigator.clipboard.writeText(message.Message);
    toast.success("Text Copied !!")
    onClose();
  };

  const handleDelete = () => {
    onDelete?.(message);
    onClose();
  };

  const handleStar = () => {
    onStar?.(message);
    onClose();
  };

  const handleReact = () => {
    onReact?.(message);
    onClose();
  };

  return (
    <StyledMenu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        mouseY !== null && mouseX !== null
          ? { top: mouseY, left: mouseX }
          : undefined
      }
      transformOrigin={{ horizontal: "left", vertical: "top" }}
    >

      {/* Reply */}
      <StyledMenuItem onClick={handleReply}>
        <ListItemIcon>
          <Reply />
        </ListItemIcon>
        <ListItemText>Reply</ListItemText>
      </StyledMenuItem>

      {/* Forward */}
      <StyledMenuItem onClick={handleForward}>
        <ListItemIcon>
          <Forward />
        </ListItemIcon>
        <ListItemText>Forward</ListItemText>
      </StyledMenuItem>

      {/* Copy */}
      <StyledMenuItem onClick={handleCopy}>
        <ListItemIcon>
          <Copy />
        </ListItemIcon>
        <ListItemText>Copy</ListItemText>
      </StyledMenuItem>


      {/* Delete (for sender only) */}
      {message?.sender === "You" && (
        <StyledMenuItem
          onClick={handleDelete}
          sx={{
            color: "#e53935",
            "& svg": { color: "#e53935" },
          }}
        >
          <ListItemIcon>
            <Trash2 />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </StyledMenuItem>
      )}
    </StyledMenu>
  );
};

export default MessageContextMenu;
