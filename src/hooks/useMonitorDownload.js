// src/hooks/useMonitorDownload.js

import { useState, useCallback } from 'react';

/**
 * A hook to monitor the download progress of an on-device AI model.
 * @returns {{
 *   downloadStatus: string,
 *   getMonitor: () => { monitor: (m: any) => void }
 * }} - The current download status and a function to get the monitor object.
 */
export const useMonitorDownload = () => {
  const [downloadStatus, setDownloadStatus] = useState('');

  const getMonitor = useCallback(() => {
    return {
      monitor(m) {
        m.addEventListener("downloadprogress", e => {
          if (e.loaded < e.total) {
            const progress = (e.loaded / e.total * 100).toFixed(1);
            setDownloadStatus(`Downloading Model: ${progress}%`);
          } else if (e.loaded === e.total) {
            setDownloadStatus('Model download complete!');
            setTimeout(() => setDownloadStatus(''), 3000); // Clear message after 3 seconds
          }
        });
      }
    };
  }, []);

  return { downloadStatus, getMonitor };
};