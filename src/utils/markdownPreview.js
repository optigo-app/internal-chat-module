// utils/markdownPreview.js

export function markdownToHTML(text) {
  // Order matters: longer/greedy patterns first
  return text
    // Bold: *text*
    .replace(/\*([^\*\n]+)\*/g, '<strong>$1</strong>')
    // Italic: _text_
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    // Strikethrough: ~text~
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    // Inline code: `text`
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    // Escape newlines
    .replace(/\n/g, '<br/>');
}

export function htmlToMarkdown(html) {
  return html
    .replace(/<strong>(.*?)<\/strong>/g, '*$1*')
    .replace(/<em>(.*?)<\/em>/g, '_$1_')
    .replace(/<s>(.*?)<\/s>/g, '~$1~')
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ''); // strip remaining tags
}