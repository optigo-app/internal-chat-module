import React from 'react';
import { Emoji, EmojiStyle } from 'emoji-picker-react';
import { charToUnified } from './EmojiUtils';

/**
 * Regex that matches most standard and complex emojis including ZWJ sequences and skin tones.
 */
const EMOJI_REGEX = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

/**
 * Parses a string and replaces emoji characters with the <Emoji /> component from emoji-picker-react.
 * @param {string} text The raw message text.
 * @param {object} options Configuration for size and style.
 * @returns {Array} An array of React nodes (strings and Emoji components).
 */
export const renderEmojiText = (text, options = {}) => {
    const { size = 20, emojiStyle = EmojiStyle.APPLE } = options;

    if (!text || typeof text !== 'string') return text;

    const parts = text.split(EMOJI_REGEX);
    return parts.map((part, index) => {
        if (EMOJI_REGEX.test(part)) {
            const unified = charToUnified(part);
            if (unified) {
                return (
                    <span
                        key={`emoji-${index}`}
                        style={{
                            display: 'inline-flex',
                            verticalAlign: 'middle',
                            margin: '0 1px',
                            lineHeight: 0
                        }}
                    >
                        <Emoji
                            unified={unified}
                            size={size}
                            emojiStyle={emojiStyle}
                        />
                    </span>
                );
            }
        }
        return part;
    });
};
