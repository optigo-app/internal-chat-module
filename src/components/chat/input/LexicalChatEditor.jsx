import React, { useEffect, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode, $isListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { COMMAND_PRIORITY_NORMAL, FORMAT_TEXT_COMMAND, KEY_ENTER_COMMAND, COMMAND_PRIORITY_HIGH, $getSelection, $isRangeSelection, $getRoot, $createParagraphNode } from 'lexical';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';

import './LexicalChatEditor.scss';

const theme = {
    text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        strikethrough: 'editor-text-strikethrough',
        code: 'editor-text-code',
    },
    quote: 'editor-quote',
    list: {
        ul: 'editor-list-ul',
        ol: 'editor-list-ol',
        listitem: 'editor-listitem',
    }
};

// Plugin to extract markdown and push to parent component
function MarkdownExportPlugin({ onChange }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const markdown = $convertToMarkdownString(TRANSFORMERS);
                if (onChange) {
                    onChange(markdown);
                }
            });
        });
    }, [editor, onChange]);
    return null;
}

// Plugin to expose lexical editor to parent ref
function EditorRefPlugin({ editorRef }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (editorRef) {
            editorRef.current = editor;
        }
    }, [editor, editorRef]);
    return null;
}

// Plugin to listen for Enter key to trigger custom submit or let lists handle it
function EnterKeyPlugin({ onEnter }) {
    const [editor] = useLexicalComposerContext();
    
    useEffect(() => {
        return editor.registerCommand(
            KEY_ENTER_COMMAND,
            (event) => {
                let insideList = false;
                editor.getEditorState().read(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const node = selection.anchor.getNode();
                        let current = node;
                        while (current) {
                            if ($isListItemNode(current)) {
                                insideList = true;
                                break;
                            }
                            current = current.getParent();
                        }
                    }
                });
                
                if (event && (event.ctrlKey || event.metaKey)) {
                    // Ctrl+Enter or Cmd+Enter ALWAYS sends the message, even inside lists
                    event.preventDefault();
                    if (onEnter) onEnter(event);
                    return true;
                }

                if (event && event.shiftKey) {
                    // Let Lexical handle Shift+Enter natively (soft newline)
                    return false;
                }

                if (insideList) {
                    // Let Lexical handle Enter inside a list (creates next item or exits empty item)
                    return false;
                }

                // If not in a list and no shift key, trigger onEnter to send the message
                if (event) {
                    event.preventDefault();
                }
                if (onEnter) onEnter(event || { key: 'Enter' });
                return true; // Prevent default Lexical paragraph insertion
            },
            COMMAND_PRIORITY_HIGH
        );
    }, [editor, onEnter]);
    
    return null;
}

// Plugin to treat formatting on selections as a one-time operation
function OneTimeFormattingPlugin() {
    const [editor] = useLexicalComposerContext();
    const justFormattedRef = useRef(false);

    useEffect(() => {
        const unregisterCommand = editor.registerCommand(
            FORMAT_TEXT_COMMAND,
            () => {
                editor.getEditorState().read(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection) && !selection.isCollapsed()) {
                        justFormattedRef.current = true;
                    }
                });
                return false; // let the default handler run
            },
            COMMAND_PRIORITY_NORMAL
        );

        const unregisterUpdate = editor.registerUpdateListener(({ editorState }) => {
            if (!justFormattedRef.current) return;
            
            editorState.read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection) && selection.isCollapsed()) {
                    // User deselected the text (e.g., pressed arrow key or clicked away)
                    editor.update(() => {
                        const sel = $getSelection();
                        if ($isRangeSelection(sel) && sel.isCollapsed()) {
                            const node = sel.anchor.getNode();
                            const offset = sel.anchor.offset;
                            // Only reset format if cursor is at the boundary of the text node
                            if (offset === node.getTextContentSize() || offset === 0) {
                                sel.format = 0;
                            }
                        }
                    });
                    justFormattedRef.current = false;
                }
            });
        });

        return () => {
            unregisterCommand();
            unregisterUpdate();
        };
    }, [editor]);

    return null;
}

// Plugin to sync external value changes to lexical state (e.g. when drafts load on conversation switch)
function ExternalValueSyncPlugin({ value, syncKey }) {
    const [editor] = useLexicalComposerContext();
    const lastEmittedValue = useRef('');
    const lastSyncKey = useRef(syncKey);

    // Keep track of the last value we generated so we don't overwrite user typing
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
            editorState.read(() => {
                lastEmittedValue.current = $convertToMarkdownString(TRANSFORMERS);
            });
        });
    }, [editor]);

    useEffect(() => {
        const normalize = (s) => (s || '').replace(/\n+$/, '').trimStart();
        const syncKeyChanged = syncKey !== lastSyncKey.current;
        if (syncKeyChanged || normalize(value) !== normalize(lastEmittedValue.current)) {
            editor.update(() => {
                if (!value) {
                    const root = $getRoot();
                    root.clear();
                    root.append($createParagraphNode());
                } else {
                    $convertFromMarkdownString(value, TRANSFORMERS);
                }
            });
            lastSyncKey.current = syncKey;
            lastEmittedValue.current = value || '';
        }
    }, [editor, value, syncKey]);

    return null;
}

const LexicalChatEditor = ({
    value,
    onChange,
    onPaste,
    onKeyDown,
    placeholder,
    className,
    editorRef,
    syncKey,
    hasDraft = false
}) => {

    const initialConfig = {
        namespace: 'WhatsAppChatEditor',
        theme,
        onError: (error) => console.error(error),
        nodes: [
            HeadingNode,
            QuoteNode,
            ListNode,
            ListItemNode,
            CodeNode,
            CodeHighlightNode,
            LinkNode
        ]
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className={`lexical-editor-container ${className || ''}`} style={{ position: 'relative', width: '100%' }}>
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable
                            className="lexical-content-editable"
                            onPaste={onPaste}
                        />
                    }
                    placeholder={!hasDraft ? <div className="lexical-placeholder">{placeholder}</div> : null}
                    ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin />
                <ListPlugin />
                <ClearEditorPlugin />
                <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                <MarkdownExportPlugin onChange={onChange} />
                <EditorRefPlugin editorRef={editorRef} />
                <EnterKeyPlugin onEnter={onKeyDown} />
                <OneTimeFormattingPlugin />
                <ExternalValueSyncPlugin value={value} syncKey={syncKey} />
            </div>
        </LexicalComposer>
    );
};

export default React.memo(LexicalChatEditor);
