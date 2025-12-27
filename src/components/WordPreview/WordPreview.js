import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import * as mammoth from 'mammoth';

const WordPreview = ({ fileObject }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWordDocument = async () => {
      try {
        setError(null);

        let arrayBuffer;

        if (fileObject) {
          arrayBuffer = await fileObject.arrayBuffer();
        }
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtmlContent(result.value);
        if (result.messages.length > 0) {
        }
      } catch (err) {
        console.error('Error loading Word document:', err);
        setError(err.message || 'Failed to load Word document');
      }
    };

    loadWordDocument();
  }, [fileObject]);

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
            Error loading Word document: {error}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          backgroundColor: 'white',
          '& .wordPreviewContent': {
            minWidth: '250mm', // A4 width
            maxWidth: '250mm', // A4 width
            minHeight: '250mm', // A4 height
            margin: '0 auto',
            padding: '15mm', // Standard page margins
            backgroundColor: 'white',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',

            '& p, & h1, & h2, & h3, & h4, & h5, & h6, & li, & ul, & ol, & table': {
              margin: '0.5em 0',
              lineHeight: 1.5,
            },
            '& h1': { fontSize: '2em' },
            '& h2': { fontSize: '1.5em' },
            '& h3': { fontSize: '1.17em' },
            '& table': {
              borderCollapse: 'collapse',
              width: '100%',
              '&, & th, & td': {
                border: '1px solid #ddd',
              },
              '& th, & td': {
                padding: '8px',
                textAlign: 'left',
              },
              '& th': {
                backgroundColor: '#f2f2f2',
              },
            },
          },
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          className="wordPreviewContent"
        />
      </Box>
    </Box>
  );
};

export default WordPreview;