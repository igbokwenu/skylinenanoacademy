// src/components/SummarizerApi.jsx

import React, { useState } from 'react';
import { useLanguageModel } from '../hooks/useLanguageModel';
import { useMonitorDownload } from '../hooks/useMonitorDownload';

const SummarizerApi = () => {
  const [summarizerInput, setSummarizerInput] = useState('Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass more than two and a half times that of all the other planets in the Solar System combined. It is named after the Roman god Jupiter.');
  const { getMonitor } = useMonitorDownload();
  const { isLoading, output, status, executePrompt, abortCurrentPrompt } = useLanguageModel({ apiName: 'Summarizer' });

  const handleSummarize = () => executePrompt(summarizerInput, {}, getMonitor());

  return (
    <div className="api-card">
      <h2>Summarizer API</h2>
      <textarea rows="5" value={summarizerInput} onChange={(e) => setSummarizerInput(e.target.value)} />
      <div className="button-group">
        <button onClick={handleSummarize} disabled={isLoading}>Run Summarizer</button>
        <button onClick={abortCurrentPrompt} disabled={!isLoading}>Abort</button>
      </div>
      <div className="api-status-details"><strong>Status:</strong> {status}</div>
      <pre className="output">{output}</pre>
    </div>
  );
};

export default SummarizerApi;