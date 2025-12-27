import React, { useState, useEffect } from 'react';
import "./ExcelPreview.scss"
import {
    Box,
    Typography,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tabs,
    Tab,
    Chip,
    Button,
    Input,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import * as XLSX from 'xlsx';

const ExcelPreview = ({ fileObject }) => {
    const [workbook, setWorkbook] = useState(null);
    const [error, setError] = useState(null);
    const [activeSheet, setActiveSheet] = useState(0);

    // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            loadExcelFromFile(file);
        }
    };

    const loadExcelFromFile = async (file) => {
        try {
            setError(null);
            const arrayBuffer = await file.arrayBuffer();
            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            setWorkbook(wb);
            setActiveSheet(0);
        } catch (err) {
            console.error('Excel loading error:', err);
            setError(err.message);
        }
    };

    useEffect(() => {
        if (fileObject) {
            loadExcelFromFile(fileObject);
        }
    }, [fileObject]);

    const handleSheetChange = (event, newValue) => {
        setActiveSheet(newValue);
    };

    if (error) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
                p={2}
            >
                <Alert severity="error" sx={{ maxWidth: 400 }}>
                    <Typography variant="body2">
                        Error loading Excel File: {error}
                    </Typography>
                </Alert>
            </Box>
        );
    }

    if (!workbook) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
            >
                <Typography variant="body1">No data available</Typography>
            </Box>
        );
    }

    const sheetNames = workbook.SheetNames;
    const currentSheet = workbook.Sheets[sheetNames[activeSheet]];
    const jsonData = XLSX.utils.sheet_to_json(currentSheet, { header: 1 });

    const range = XLSX.utils.decode_range(currentSheet['!ref'] || 'A1:A1');
    const totalRows = range.e.r + 1;
    const totalCols = range.e.c + 1;

    const displayRows = Math.min(totalRows, 100);
    const displayCols = Math.min(totalCols, 20);
    const displayData = jsonData.slice(0, displayRows).map(row => {
        const paddedRow = [...row];
        while (paddedRow.length < displayCols) {
            paddedRow.push(null);
        }
        return paddedRow.slice(0, displayCols);
    });

    return (
        <Box className="data-table-container-excel">
            <Box className="data-table-header">
                <Box className="data-table-chips">
                    <Chip label={`${totalRows} rows`} size="small" variant="outlined" />
                    <Chip label={`${totalCols} columns`} size="small" variant="outlined" />
                    {displayRows < totalRows && (
                        <Chip label={`Showing first ${displayRows} rows`} size="small" color="warning" variant="outlined" />
                    )}
                    {displayCols < totalCols && (
                        <Chip label={`Showing first ${displayCols} columns`} size="small" color="warning" variant="outlined" />
                    )}
                </Box>
            </Box>

            {sheetNames.length > 1 && (
                <Box className="data-table-tabs">
                    <Tabs value={activeSheet} onChange={handleSheetChange} variant="scrollable" scrollButtons="auto">
                        {sheetNames.map((name, index) => (
                            <Tab key={index} label={name} />
                        ))}
                    </Tabs>
                </Box>
            )}

            <Box className="data-table-wrapper">
                <TableContainer component={Paper} className="data-table-paper">
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                {Array.from({ length: displayCols }, (_, index) => (
                                    <TableCell key={index} className="data-table-header-cell">
                                        {displayData[0]?.[index] != null ? String(displayData[0][index]) : ''}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayData.slice(1).map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {Array.from({ length: displayCols }, (_, cellIndex) => (
                                        <TableCell key={cellIndex} className="data-table-cell">
                                            {row[cellIndex] != null ? String(row[cellIndex]) : ''}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default ExcelPreview;