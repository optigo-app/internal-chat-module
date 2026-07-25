import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';

const TOLERANCE = 1;

export const ReadMoreText = React.memo(({
    content,
    remarkPlugins,
    components,
    maxLines = 5,
    minChars = 2000,
    isExpanded,
    onToggle,
    sx,
}) => {
    const textRef = useRef(null);
    const [needsToggle, setNeedsToggle] = useState(false);
    const shouldAllowTruncate = content.length >= minChars;

    const measure = useCallback(() => {
        const el = textRef.current;
        if (!el) return;

        if (!shouldAllowTruncate) {
            setNeedsToggle(false);
            return;
        }

        const saved = {
            display: el.style.display,
            webkitLineClamp: el.style.webkitLineClamp,
            webkitBoxOrient: el.style.webkitBoxOrient,
            overflow: el.style.overflow,
        };

        // Force line clamp for measurement, regardless of current expanded state
        el.style.display = '-webkit-box';
        el.style.webkitBoxOrient = 'vertical';
        el.style.webkitLineClamp = String(maxLines);
        el.style.overflow = 'hidden';

        const truncated = el.scrollHeight > el.clientHeight + TOLERANCE;

        if (isExpanded) {
            // Let the .expanded CSS class render the full message
            el.style.display = '';
            el.style.webkitLineClamp = '';
            el.style.webkitBoxOrient = '';
            el.style.overflow = '';
        }

        setNeedsToggle(prev => (prev === truncated ? prev : truncated));
    }, [maxLines, isExpanded, shouldAllowTruncate]);

    useLayoutEffect(() => {
        measure();
    }, [measure, content, maxLines, minChars]);

    useEffect(() => {
        const el = textRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => measure());
        ro.observe(el);
        return () => ro.disconnect();
    }, [measure]);

    return (
        <>
            <Box
                ref={textRef}
                className={`read-more-text ${(isExpanded || !shouldAllowTruncate) ? 'expanded' : ''}`}
                style={{ '--read-more-lines': maxLines }}
                sx={{
                    color: 'text.primary',
                    fontSize: 14,
                    lineHeight: 1.45,
                    pr: 1,
                    maxWidth: '100%',
                    ...sx,
                }}
            >
                <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
                    {content}
                </ReactMarkdown>
            </Box>
            {needsToggle && (
                <Typography
                    variant="caption"
                    component="span"
                    sx={{
                        color: 'primary.main',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        ml: 0.5,
                        '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle?.();
                    }}
                >
                    {isExpanded ? 'Read less' : 'Read more'}
                </Typography>
            )}
        </>
    );
});

ReadMoreText.displayName = 'ReadMoreText';
