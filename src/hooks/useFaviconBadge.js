import { useEffect, useRef } from 'react';

const useFaviconBadge = (count) => {
  const requestIdRef = useRef(0);

  useEffect(() => {
    const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
    let favicon = document.querySelector('link[rel="icon"]');

    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }

    if (!favicon.dataset.originalHref) {
      const currentHref = favicon.getAttribute('href') || favicon.href;
      favicon.dataset.originalHref = currentHref || '/favicon.ico';
    }

    const originalHref = favicon.dataset.originalHref;
    const currentRequestId = ++requestIdRef.current;

    if (safeCount <= 0) {
      favicon.href = originalHref;
      document.title = document.title.replace(/^\(\d+\+?\)\s/, '');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 64, 64);

    /* -------------------------------------------
       1. THE BASE BUBBLE (#685dd8)
    --------------------------------------------*/
    const centerX = 32;
    const centerY = 32;
    const radius = 30; // Maximized radius

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#685dd8';
    ctx.fill();

    /* -------------------------------------------
       2. WHATSAPP STYLE TAIL
    --------------------------------------------*/
    ctx.beginPath();
    ctx.moveTo(12, 52);
    ctx.lineTo(4, 62); // Pointy tail
    ctx.lineTo(22, 58);
    ctx.fillStyle = '#685dd8';
    ctx.fill();

    /* -------------------------------------------
       3. THE TEXT (MAXIMUM SIZE)
    --------------------------------------------*/
    const label = safeCount > 99 ? '99+' : String(safeCount);

    // We use a massive font size. 
    // For 1 digit, we go up to 48px!
    let fontSize = label.length === 1 ? 48 : label.length === 2 ? 38 : 28;

    ctx.fillStyle = '#FFFFFF';
    // Using "system-ui" and 900 weight for the thickest possible look
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Remove the inner ring if it's crowding the text
    if (label.length === 1) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 3, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; // Faded ring for 1 digit
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillText(label, centerX, centerY + 2); // +2 for optical centering

    // 4. UPDATE
    favicon.href = canvas.toDataURL('image/png');

    const cleanTitle = document.title.replace(/^\(\d+\+?\)\s/, '');
    document.title = `(${label}) ${cleanTitle}`;

    return () => {
      requestIdRef.current = currentRequestId;
    };
  }, [count]);
};

export default useFaviconBadge;