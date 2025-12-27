import axios from "axios";
import { UPLOADMEDIA, getHeaders } from "./Config";

export const UploadMedia = async (file, whatsappNumber, whatsappKey, onProgress) => {
  try {
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("file", file);

    const headers = {
      ...getHeaders(whatsappNumber),
      Authorization: `Bearer ${whatsappKey}`,
      "Content-Type": "multipart/form-data",
    };

    const { data } = await axios.post(`https://crmapp.mpillarapi.com/api/meta/v19.0/${whatsappNumber}/media`, formData, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const loaded = progressEvent?.loaded ?? 0;
          const total = progressEvent?.total ?? file?.size ?? 1;
          let percent = Math.round((loaded * 100) / total);
          // If total is unknown, avoid jumping to 100% before completion
          if (!progressEvent?.total && file?.size) {
            // allow up to 100 if loaded matches size, else cap to avoid premature 100
            const approxTotal = file.size;
            percent = loaded >= approxTotal ? 100 : Math.min(percent, 99);
          }
          onProgress(percent);
        }
      },
    });

    // Ensure final 100% is emitted after successful upload
    if (onProgress) onProgress(100);

    return data;
  } catch (error) {
    console.error("API Upload Error:", error);
    throw error;
  }
};