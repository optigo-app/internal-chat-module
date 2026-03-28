import { Typography, Box, Skeleton } from '@mui/material';
import { Phone, Hash, Circle } from 'lucide-react';

const ContactInfo = ({ customer, contactInfo, loading }) => {
    const displayEmail = contactInfo?.DisplayEmail || contactInfo?.Email || customer?.DisplayEmail || '';
    const mobileNo = contactInfo?.MobileNo || contactInfo?.Phone || contactInfo?.ContactNo || customer?.MobileNo || '';
    const about = contactInfo?.About || contactInfo?.Status || customer?.About || '';

    const renderSkeletonRow = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: '#e0e0e0' }} />
            <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width={60} height={16} sx={{ bgcolor: '#e0e0e0' }} />
                <Skeleton variant="text" width={120} height={20} sx={{ bgcolor: '#e0e0e0' }} />
            </Box>
        </Box>
    );

    return (
        <div className="info-block contact-info-block">
            <Typography className="block-label">
                Contact Information
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
                {loading ? (
                    <>
                        {renderSkeletonRow()}
                        {renderSkeletonRow()}
                        {renderSkeletonRow()}
                    </>
                ) : (
                    <>
                        {displayEmail && (
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
                                        User ID
                                    </Typography>
                                    <Typography sx={{ fontSize: '15px', color: '#111b21', fontWeight: 500 }}>
                                        {displayEmail}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {mobileNo && (
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
                                        {mobileNo}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {about && (
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
                                    <Typography sx={{ fontSize: '12px', color: '#667781', fontWeight: 500 }}>
                                        About
                                    </Typography>
                                    <Typography sx={{ fontSize: '15px', color: '#111b21', fontWeight: 500 }}>
                                        {about}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </div>
    );
};

export default ContactInfo;