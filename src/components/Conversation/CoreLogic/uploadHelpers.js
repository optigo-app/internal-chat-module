import { uploadMediaAPi } from '../../../API/FileUpload/uploadHelpers';
import { generateMediaFolderName } from '../../../utils/globalFunc';

export const uploadFiles = async ({ files, conversationId, type, onProgress }) => {
  const folderCategory = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'docs';
  const folderName = generateMediaFolderName(conversationId, folderCategory);

  const uploaded = await uploadMediaAPi({ folderName, files, onProgress });
  const arr = Array.isArray(uploaded) ? uploaded : [];

  const getUrl  = u => u?.url ?? u?.Url ?? u?.fileUrl ?? u?.fileURL ?? u?.FileUrl ?? u?.path ?? null;
  const getName = u => u?.fileName ?? u?.filename ?? u?.FileName ?? u?.name ?? null;

  return files.map((f, i) => {
    const match = arr.find(u => getName(u)?.toLowerCase() === f.name.toLowerCase());
    return getUrl(match || arr[i]);
  });
};

export const buildMediaPayload = ({
  auth, selectedCustomer, sentId, tempId, type, uploadedUrls,
  mediaItems, caption, time, date, dateTime, isGroup, memberIds,
}) => ({
  ufcc: auth?.ufcc,
  ReceiverId: isGroup ? (memberIds.length > 0 ? memberIds : [selectedCustomer?.ReceiverId]) : selectedCustomer?.ReceiverId,
  Id: sentId || tempId,
  MessageId: sentId,
  SenderId: auth?.id,
  Direction: 2,
  Status: 1,
  MessageStatus: 1,
  MessageType: type,
  Message: caption,
  Time: time,
  Date: date,
  DateTime: dateTime,
  mediaItems,
  previewUrl: uploadedUrls[0],
  fileName: mediaItems?.[0]?.filename,
  fileType: mediaItems?.[0]?.mimeType,
  ConversationId: selectedCustomer?.ConversationId,
  SenderName: auth?.username || auth?.userId || auth?.name,
  ...(isGroup && {
    IsGroup: 1,
    FirstName: auth?.firstName || auth?.FirstName,
    LastName: auth?.lastName || auth?.LastName,
    SenderEmail: auth?.email,
    SenderProfilePicture: auth?.profilePicture,
  }),
});