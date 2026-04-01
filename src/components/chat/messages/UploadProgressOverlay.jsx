import { Box, CircularProgress, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

const UploadProgressOverlay = ({ percent, size = 52 }) => {
    const theme = useTheme();
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));

    return (
        <Box
            sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: alpha(theme.palette.common.black, 0.35),
                backdropFilter: "blur(2px)",
                borderRadius: 2,
            }}
        >
            <Box sx={{ position: "relative", display: "inline-flex" }}>
                <CircularProgress variant="determinate" value={100} size={size} />
                <CircularProgress
                    variant="determinate"
                    value={safePercent}
                    size={size}
                    sx={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        color: theme.palette.primary.main,
                    }}
                />
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700 }}>
                        {Math.round(safePercent)}%
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default UploadProgressOverlay;