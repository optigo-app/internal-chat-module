import React, { useState } from "react";
import { IconButton } from "@mui/material";
import { MoreVertical, Pin, Star, Archive, UserPlus } from "lucide-react";
import WhatsAppMenu from "../components/ReusableComponent/WhatsAppMenu";


const ChatHeader = ({ chatId, isPinned, isFavorite }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const menuItems = [
    { label: isPinned ? "Unpin" : "Pin", icon: <Pin size={20}/>, action: "TOGGLE_PIN" },
    { label: isFavorite ? "Unfavorite" : "Favorite", icon: <Star size={20}/>, action: "TOGGLE_FAVORITE" },
    { label: "Archive", icon: <Archive size={20}/>, action: "ARCHIVE" },
    { label: "Add to Customer", icon: <UserPlus size={20}/>, action: "ADD_CUSTOMER" },
  ];

  const handleMenuAction = (action, { chatId }) => {
    switch (action) {
      case "TOGGLE_PIN":
        console.log(`${isPinned ? "Unpin" : "Pin"} chat:`, chatId);
        break;
      case "TOGGLE_FAVORITE":
        console.log(`${isFavorite ? "Unfavorite" : "Favorite"} chat:`, chatId);
        break;
      case "ARCHIVE":
        console.log("Archive chat:", chatId);
        break;
      case "ADD_CUSTOMER":
        console.log("Add chat to customer:", chatId);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
        <MoreVertical size={20} />
      </IconButton>

      <WhatsAppMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        items={menuItems}
        onAction={handleMenuAction}
        context={{ chatId }}
      />
    </>
  );
};

export default ChatHeader;
