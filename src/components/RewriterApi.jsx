// src/components/RewriterApi.jsx

import React, { useState } from 'react';
import { useLanguageModel } from '../hooks/useLanguageModel';
import { useMonitorDownload } from '../hooks/useMonitorDownload';

const RewriterApi = () => {
  const [rewriterInput, setRewriterInput] = useState("The report was bad and we need to fix it now.");
  const { getMonitor } = useMonitorDownload();
  const { isLoading, output, status, executePrompt, abortCurrentPrompt } = useLanguageModel({ apiName: 'Rewriter' });

  const handleRewrite = () => {
    executePrompt(rewriterInput, { tone: 'more-formal' }, getMonitor());
  };

  return (
    <div className="api-card">
      <h2>Rewriter API</h2>
      <textarea value={rewriterInput} onChange={(e) => setRewriterInput(e.target.value)} />
      <div className="button-group">
        <button onClick={handleRewrite} disabled={isLoading}>Run Rewriter (to be more formal)</button>
        <button onClick={abortCurrentPrompt} disabled={!isLoading}>Abort</button>
      </div>
      <div className="api-status-details"><strong>Status:</strong> {status}</div>
      <pre className="output">{output}</pre>
    </div>
  );
};

export default RewriterApi;