// src/components/WriterApi.jsx

import React, { useState } from 'react';
import { useLanguageModel } from '../hooks/useLanguageModel';
import { useMonitorDownload } from '../hooks/useMonitorDownload';

const WriterApi = () => {
  const [writerInput, setWriterInput] = useState('Compose a professional email to a client about a project delay.');
  const { getMonitor } = useMonitorDownload();
  const { isLoading, output, status, executePrompt, abortCurrentPrompt } = useLanguageModel({ apiName: 'Writer' });

  const handleWrite = () => executePrompt(writerInput, {}, getMonitor());

  return (
    <div className="api-card">
      <h2>Writer API</h2>
      <textarea value={writerInput} onChange={(e) => setWriterInput(e.target.value)} />
      <div className="button-group">
        <button onClick={handleWrite} disabled={isLoading}>Run Writer</button>
        <button onClick={abortCurrentPrompt} disabled={!isLoading}>Abort</button>
      </div>
      <div className="api-status-details"><strong>Status:</strong> {status}</div>
      <pre className="output">{output}</pre>
    </div>
  );
};

export default WriterApi;