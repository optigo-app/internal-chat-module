import CryptoJS from "crypto-js";
import { filesUploadApi } from "./filesUploadApi";

export const uploadMediaAPi = async ({
  folderName = "ChatMedia",
  files = [],
  onProgress,
}) => {
  try {
    if (!Array.isArray(files) || files.length === 0) return [];

    const uniqueNo = CryptoJS.lib.WordArray.random(16).toString();

    const res = await filesUploadApi({
      attachments: files.map((file) => ({ file })),
      folderName,
      uniqueNo,
      onProgress,
    });

    if (res?.files && Array.isArray(res.files)) {
      return res.files;
    }

    return [];
  } catch (error) {
    console.error("uploadAndSaveTaskAttachments error:", error);
    return { success: false, error };
  }
};
