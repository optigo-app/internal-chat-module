import { Typography, Box, TextField, InputAdornment, IconButton } from '@mui/material';
import { Pencil, X, Check } from 'lucide-react';
import { FormatDateIST } from '../../utils/DateFnc';

const GroupDescription = ({
    localGroupData,
    isCurrentUserAdmin,
    isEditingDesc,
    editedDesc,
    setEditedDesc,
    handleSaveDesc,
    startEditingDesc,
    setIsEditingDesc
}) => {
    return (
        <div className="info-block desc-block">
            <div className="desc-header">
                <Typography className="block-label accent-label">
                    {localGroupData.description ? 'Group description' : 'Add group description'}
                </Typography>
                {!isEditingDesc && isCurrentUserAdmin && (
                    <IconButton size="small" className="edit-icon-btn" onClick={startEditingDesc}>
                        <Pencil size={20} />
                    </IconButton>
                )}
            </div>

            {isEditingDesc ? (
                <Box sx={{ mt: 1 }}>
                    <TextField
                        fullWidth
                        multiline
                        variant="standard"
                        value={editedDesc}
                        onChange={(e) => setEditedDesc(e.target.value.slice(0, 256))}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setEditedDesc(localGroupData.description);
                                setIsEditingDesc(false);
                            }
                        }}
                        helperText={`${editedDesc.length}/256`}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => {
                                        setEditedDesc(localGroupData.description);
                                        setIsEditingDesc(false);
                                    }} sx={{ color: '#667781', mr: 0.5 }}>
                                        <X size={18} />
                                    </IconButton>
                                    <IconButton size="small" onClick={handleSaveDesc} sx={{ color: 'primary.main' }}>
                                        <Check size={20} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
            ) : (
                <Typography
                    className="block-value"
                    style={{ cursor: isCurrentUserAdmin ? 'pointer' : 'default' }}
                    onClick={isCurrentUserAdmin ? startEditingDesc : undefined}
                >
                    {localGroupData.description || ''}
                </Typography>
            )}

            {(localGroupData.createdBy || localGroupData.entryDate) && (
                <Typography sx={{ mt: 1.5, mb: 0.5, fontSize: '13px', color: '#667781' }}>
                    Group created by {localGroupData.createdBy || 'Unknown'}, on {localGroupData.entryDate ? FormatDateIST(localGroupData.entryDate, "dd/mm/yyyy").date : 'Unknown Date'}
                </Typography>
            )}
        </div>
    );
};

export default GroupDescription;
