import axios from 'axios';
import { UPLOAD_URL } from '../InitialApi/Config';

export const filesUploadApi = async ({ attachments, folderName, uniqueNo, onProgress }) => {
  const { ukey } = JSON.parse(sessionStorage.getItem('userData'));
  const formData = new FormData();

  attachments?.forEach((item) => {
    if (item.file) {
      formData.append('fileType', item.file); // File
    } else if (item.url) {
      formData.append('urls', item.url); // Optional: URL
    }
  });

  formData.append('folderName', folderName);
  formData.append('uKey', ukey);
  formData.append('uniqueNo', uniqueNo);

  try {
    const response = await axios.post(UPLOAD_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Access-Control-Allow-Origin': '*',
      },
      onUploadProgress: (progressEvent) => {
        if (typeof onProgress !== 'function') return;
        const loaded = progressEvent?.loaded ?? 0;
        const total = progressEvent?.total ?? 0;

        if (total > 0) {
          const percent = Math.round((loaded * 100) / total);
          onProgress(Math.max(0, Math.min(100, percent)));
          return;
        }

        const approxTotal = (attachments || []).reduce(
          (acc, item) => acc + (typeof item?.file?.size === 'number' ? item.file.size : 0),
          0
        );

        if (approxTotal > 0) {
          const percent = Math.round((loaded * 100) / approxTotal);
          onProgress(Math.max(0, Math.min(99, percent)));
          return;
        }

        onProgress(0);
      },
    });

    return response.data;
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};
