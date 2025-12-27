import { deepOrange } from "@mui/material/colors";

export const stringAvatar = (name) => ({
    sx: {
        bgcolor: "#8e4ff3",
        width: 40,
        height: 40,
        fontSize: 16,
        fontWeight: 500,
    },
    children: name
        ?.split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase(),
});
