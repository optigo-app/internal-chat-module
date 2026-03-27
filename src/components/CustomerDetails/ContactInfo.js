import React from 'react';
import { Typography, Box, Chip } from '@mui/material';
import { Phone, Hash, Circle } from 'lucide-react';

const ContactInfo = ({ customer }) => {
    return (
        <div className="info-block contact-info-block">
            <Typography className="block-label">
                Contact Information
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
                {/* EPR ID Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box 
                        sx={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '50%', 
                            backgroundColor: '#f0f2f5', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#667781'
                        }}
                    >
                        <Hash size={18} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '12px', color: '#667781', fontWeight: 500 }}>
                            EPR ID
                        </Typography>
                        <Typography sx={{ fontSize: '15px', color: '#111b21', fontWeight: 500 }}>
                            EPR123456
                        </Typography>
                    </Box>
                </Box>

                {/* Mobile No Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box 
                        sx={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '50%', 
                            backgroundColor: '#f0f2f5', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#667781'
                        }}
                    >
                        <Phone size={18} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '12px', color: '#667781', fontWeight: 500 }}>
                            Mobile Number
                        </Typography>
                        <Typography sx={{ fontSize: '15px', color: '#111b21', fontWeight: 500 }}>
                            +91 98765 43210
                        </Typography>
                    </Box>
                </Box>

                {/* Status Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box 
                        sx={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '50%', 
                            backgroundColor: '#f0f2f5', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#667781'
                        }}
                    >
                        <Circle size={18} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '12px', color: '#667781', fontWeight: 500, mb: 0.5 }}>
                            Status
                        </Typography>
                        <Chip 
                            label="Online" 
                            size="small"
                            sx={{ 
                                backgroundColor: '#e7fce3', 
                                color: '#06cf9c', 
                                fontWeight: 600,
                                fontSize: '12px',
                                height: '24px',
                                '& .MuiChip-label': { px: 1.5 }
                            }} 
                        />
                    </Box>
                </Box>
            </Box>
        </div>
    );
};

export default ContactInfo;
