import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { validateMediaFiles } from '../../../utils/globalFunc';
import { showToast } from '../../../utils/toastHelper';
import { UI } from './uiReducer';
import { MSG } from './conversationReducer';
import { sendImageMessage, sendDocumentMessage, sendVideoMessage } from '../../../API/SendMessage/SendMessageApi';
import { uploadFiles, buildMediaPayload } from './uploadHelpers';
import { emitMediaMessage } from './socketHelpers';
export function useMediaHandlers({ auth, selectedCustomer, uiState, dispatchUI, dispatchMsg, fetchAndCacheGroupMembers, onCustomerSelect, selectedCustomerRef, tempConversationId }) {

  const handleAttachClick = useCallback(() => {
    dispatchUI({ type: UI.SET_SHOW_MEDIA, value: !uiState.showMedia });
  }, [uiState.showMedia]);

  const processFiles = useCallback(async (files) => {
    if (!files?.length) return;
    const { acceptedFiles, skippedSize, skippedTotal, skippedCount } = validateMediaFiles(files);

    if (skippedCount > 0) showToast(`Only 30 files allowed. ${skippedCount} removed.`, 'error', { id: 'too-many-files' });
    if (skippedSize.length > 0) showToast(`Files too large: ${skippedSize.slice(0, 2).join(', ')}`, 'error', { id: 'file-too-large' });
    if (skippedTotal.length > 0) showToast('Total selection exceeds 100MB.', 'error', { id: 'total-too-large' });
    if (!acceptedFiles.length) return;

    const newMediaFiles = acceptedFiles.map(file => ({
      file, preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
      name: file.name, size: file.size,
    }));

    dispatchUI({ type: UI.SET_MEDIA_FILES, value: newMediaFiles });
    dispatchUI({ type: UI.SET_SHOW_MEDIA, value: true });
  }, []);

  const handleFileChange = useCallback(async (e) => {
    await processFiles(Array.from(e.target.files));
  }, [processFiles]);

  const handleMediaClick = useCallback((message, index) => {
    if (!message?.mediaItems?.length) return;
    const items = message.mediaItems.map(item => ({
      src: item.url, type: item.mimeType?.startsWith('image/') ? 'image' : item.mimeType?.startsWith('video/') ? 'video' : 'document',
      name: item.filename || item.fileName || 'Media', mimeType: item.mimeType, size: item.size, attachmentId: item.attachmentId,
    }));
    dispatchUI({ type: UI.SET_VIEWER, open: true, items, index, message });
  }, []);

  const handleClosePreview = useCallback(() => {
    dispatchUI({ type: UI.SET_MEDIA_FILES, value: [] });
    dispatchUI({ type: UI.SET_SHOW_MEDIA, value: false });
  }, []);

  const uploadAndSendMedia = useCallback(async ({ files, caption, type, tempId, time, date, dateTime }) => {
    const safeFiles = files.filter(f => f instanceof File);
    if (!safeFiles.length) return;

    try {
      const isGroup = selectedCustomer?.IsGroup === 1;
      const groupData = isGroup ? await fetchAndCacheGroupMembers(selectedCustomer.ConversationId) : null;
      const memberIds = (groupData?.members || []).map(m => Number(m.UserId || m.userId || m.id)).filter(Boolean);
      const convId = selectedCustomer?.ConversationId || tempConversationId;

      const uploadedUrls = await uploadFiles({
        files: safeFiles, conversationId: convId, type,
        onProgress: (percent) => dispatchMsg({
          type: MSG.UPSERT, id: tempId,
          msg: { isUploading: true, percent: Math.max(0, Math.min(99, Number(percent) || 0)) },
        }),
      });

      const attachments = safeFiles.map((f, i) => ({ FileUrl: uploadedUrls[i], FileName: f.name, MimeType: f.type }));
      const mediaItems = safeFiles.map((f, i) => ({ url: uploadedUrls[i], filename: f.name, mimeType: f.type }));

      const receiverId = selectedCustomer?.CustomerId || selectedCustomer?.UserId;
      const sendFn = type === 'image' ? sendImageMessage : type === 'video' ? sendVideoMessage : sendDocumentMessage;
      const res = await sendFn(auth, { senderId: auth?.id, receiverId, conversationId: convId, caption, attachments });

      const stat = res?.Data?.rd?.[0]?.stat;
      const statMsg = res?.Data?.rd?.[0]?.stat_msg;

      if (stat === 0) {
        const errorMsg = statMsg ? statMsg.replace(/^"|"$/g, '') : 'Failed to send media';
        toast.error(errorMsg);
        dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Status: 4, isUploading: false } });
        return;
      }

      const sentId = res?.Data?.rd?.[0]?.MessageId;
      const sentConvId = res?.Data?.rd?.[0]?.ConversationId;
      const serverAttachments = (() => {
        try { const raw = res?.Data?.rd?.[0]?.Attachments; return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []; }
        catch { return []; }
      })();
      const enrichedItems = mediaItems.map((item, i) => ({ ...item, attachmentId: serverAttachments[i]?.Id || null }));

      if (sentId) {
        const payload = buildMediaPayload({ auth, selectedCustomer, sentId, tempId, type, uploadedUrls, mediaItems: enrichedItems, caption, time, date, dateTime, isGroup, memberIds });
        emitMediaMessage(payload);

        dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Id: sentId, MessageId: sentId, previewUrl: uploadedUrls[0], mediaItems: enrichedItems, isUploading: false, percent: 100, Status: 1 } });
      } else {
        toast.error('Failed to send media');
        dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Status: 4, isUploading: false } });
      }

      if (res?.Data?.rd?.[0]?.IsNewConversation && sentConvId && onCustomerSelect) {
        onCustomerSelect({ ...selectedCustomerRef.current, ConversationId: sentConvId });
        window.dispatchEvent(new CustomEvent('UPDATE_CONVERSATION_ITEM', { detail: { ...selectedCustomerRef.current, ConversationId: sentConvId, Message: caption, MessageType: type, DateTime: dateTime } }));
      }
    } catch (err) {
      console.error('uploadAndSendMedia error:', err);
      toast.error('Failed to send media');
      dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Status: 3, isUploading: false } });
    }
  }, [auth, selectedCustomer, tempConversationId, fetchAndCacheGroupMembers, onCustomerSelect]);

  return { handleAttachClick, processFiles, handleFileChange, handleMediaClick, handleClosePreview, uploadAndSendMedia };
}