import React, { useCallback } from 'react';
import { Bold, Italic, Strikethrough, Code, ListOrdered, List, Quote } from 'lucide-react';
import './FormattingToolbar.scss';

import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, $getSelection, $isRangeSelection } from 'lexical';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';

const FORMAT_OPTIONS = [
    { id: 'bold', icon: Bold, label: 'Bold', shortcut: 'Ctrl+B / Cmd+B' },
    { id: 'italic', icon: Italic, label: 'Italic', shortcut: 'Ctrl+I / Cmd+I' },
    { id: 'strikethrough', icon: Strikethrough, label: 'Strikethrough', shortcut: 'Ctrl+Shift+X / Cmd+Shift+X' },
    { id: 'code', icon: Code, label: 'Inline Code', shortcut: 'Ctrl+Shift+C / Cmd+Shift+C' },
    { id: 'numbered', icon: ListOrdered, label: 'Numbered List', shortcut: "Type '1. '" },
    { id: 'bulleted', icon: List, label: 'Bulleted List', shortcut: "Type '* '" },
    { id: 'quote', icon: Quote, label: 'Quote', shortcut: "Type '> '" }
];

const FormattingToolbar = ({ editorRef, position }) => {
    const applyFormat = useCallback((formatId) => {
        const editor = editorRef?.current;
        if (!editor) return;

        editor.update(() => {
            if (formatId === 'bold' || formatId === 'italic' || formatId === 'strikethrough' || formatId === 'code') {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, formatId);
            } else if (formatId === 'numbered') {
                editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            } else if (formatId === 'bulleted') {
                editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            } else if (formatId === 'quote') {
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'quote');
            }
        });
        
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.focus();
            }
        }, 0);
    }, [editorRef]);

    return (
        <div
            className="formatting-toolbar"
            style={{
                position: 'fixed',
                top: `${position?.top || 0}px`,
                left: `${position?.left || 0}px`,
                transform: 'translateX(-50%)', 
                zIndex: 9999
            }}
        >
            {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                    <div
                        key={option.id}
                        className="formatting-item"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            applyFormat(option.id);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.target.click();
                            }
                        }}
                    >
                        <Icon size={16} aria-hidden="true" />
                        <div className="formatting-tooltip">
                            <span className="tooltip-label">{option.label}</span>
                            <span className="tooltip-shortcut">{option.shortcut}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default React.memo(FormattingToolbar);