import React from 'react';
import { TextField } from '@mui/material';

const baseSx = {
    '& .MuiInputLabel-root': {
        color: 'text.secondary',
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: 'primary.main',
    },
    '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        '& fieldset': {
            borderColor: 'divider',
        },
        '&:hover fieldset': {
            borderColor: 'text.secondary',
        },
        '&.Mui-focused fieldset': {
            borderColor: 'primary.main',
            borderWidth: 2,
        },
    },
};

const CustomTextField = React.forwardRef(({ sx, ...props }, ref) => {
    const mergedSx = Array.isArray(sx) ? [baseSx, ...sx] : [baseSx, sx];

    return (
        <TextField
            ref={ref}
            fullWidth
            size="medium"
            variant="outlined"
            {...props}
            sx={mergedSx}
        />
    );
});

CustomTextField.displayName = 'CustomTextField';

export default CustomTextField;
