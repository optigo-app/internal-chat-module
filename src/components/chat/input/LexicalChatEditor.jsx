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
import { COMMAND_PRIORITY_NORMAL, FORMAT_TEXT_COMMAND, KEY_ENTER_COMMAND, PASTE_COMMAND, COMMAND_PRIORITY_HIGH, $getSelection, $isRangeSelection, $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
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
function EnterKeyPlugin({ onEnter, submitOnEnter = true }) {
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
                
                // Ctrl+Enter or Cmd+Enter ALWAYS submits, even inside lists
                if (event && (event.ctrlKey || event.metaKey)) {
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

                // If submitOnEnter is enabled, plain Enter also submits
                if (submitOnEnter) {
                    if (event) {
                        event.preventDefault();
                    }
                    if (onEnter) onEnter(event || { key: 'Enter' });
                    return true; // Prevent default Lexical paragraph insertion
                }

                // Otherwise let Lexical insert a normal paragraph break
                return false;
            },
            COMMAND_PRIORITY_HIGH
        );
    }, [editor, onEnter, submitOnEnter]);
    
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

// Centralized paste handler plugin.
// Registers a single PASTE_COMMAND so text paste is processed exactly once.
function PasteHandlerPlugin({ maxChars, onPasteTextOverflow, onPasteFiles, captureMessageScrollState }) {
    const [editor] = useLexicalComposerContext();
    const overflowRef = useRef(onPasteTextOverflow);
    const filesRef = useRef(onPasteFiles);
    const scrollRef = useRef(captureMessageScrollState);
    const maxCharsRef = useRef(maxChars);

    useEffect(() => {
        overflowRef.current = onPasteTextOverflow;
    }, [onPasteTextOverflow]);
    useEffect(() => {
        filesRef.current = onPasteFiles;
    }, [onPasteFiles]);
    useEffect(() => {
        scrollRef.current = captureMessageScrollState;
    }, [captureMessageScrollState]);
    useEffect(() => {
        maxCharsRef.current = maxChars;
    }, [maxChars]);

    useEffect(() => {
        return editor.registerCommand(
            PASTE_COMMAND,
            (event) => {
                if (!event || !event.clipboardData) return false;

                const files = Array.from(event.clipboardData.files || []);
                if (files.length > 0) {
                    if (scrollRef.current) scrollRef.current();
                    if (filesRef.current) filesRef.current(files);
                    // Preserve original behavior: do not mark as fully handled so
                    // any accompanying text/html in the clipboard can still be inserted.
                    return false;
                }

                const text = event.clipboardData.getData('text');
                if (!text) return false;

                const limit = maxCharsRef.current;
                if (limit && text.length > limit) {
                    event.preventDefault();
                    if (overflowRef.current) overflowRef.current(text);
                    return true;
                }

                // Trim leading/trailing (top/bottom) whitespace while preserving inner spaces.
                const trimmed = text.trim();
                if (trimmed !== text) {
                    event.preventDefault();
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            selection.insertNodes([$createTextNode(trimmed)]);
                        } else {
                            const paragraph = $createParagraphNode();
                            paragraph.append($createTextNode(trimmed));
                            $getRoot().append(paragraph);
                        }
                    });
                    return true;
                }

                // Normal text paste: let Lexical's default RichTextPlugin handle it.
                return false;
            },
            COMMAND_PRIORITY_HIGH
        );
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
    onKeyDown,
    placeholder,
    className,
    editorRef,
    syncKey,
    hasDraft = false,
    maxChars,
    onPasteTextOverflow,
    onPasteFiles,
    captureMessageScrollState,
    namespace = 'WhatsAppChatEditor',
    submitOnEnter = true,
}) => {

    const initialConfig = {
        namespace,
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
                <EnterKeyPlugin onEnter={onKeyDown} submitOnEnter={submitOnEnter} />
                <OneTimeFormattingPlugin />
                <PasteHandlerPlugin
                    maxChars={maxChars}
                    onPasteTextOverflow={onPasteTextOverflow}
                    onPasteFiles={onPasteFiles}
                    captureMessageScrollState={captureMessageScrollState}
                />
                <ExternalValueSyncPlugin value={value} syncKey={syncKey} />
            </div>
        </LexicalComposer>
    );
};

export default React.memo(LexicalChatEditor);
