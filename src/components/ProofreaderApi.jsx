// src/components/ProofreaderApi.jsx

import React, { useState } from 'react';
import { useMonitorDownload } from '../hooks/useMonitorDownload';

const ProofreaderApi = () => {
  const [input, setInput] = useState('i beleive that thier are some misteaks in this sentance.');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { getMonitor } = useMonitorDownload();

  const handleProofread = async () => {
    if (!('Proofreader' in self)) {
      setOutput('Proofreader API is not supported.');
      return;
    }
    setIsLoading(true);
    setOutput('Proofreading...');

    try {
      const proofreader = await self.Proofreader.create(getMonitor());
      const result = await proofreader.proofread(input);

      if (!result.corrections || result.corrections.length === 0) {
        setOutput('No corrections needed.');
        return;
      }
      
      const sorted = [...result.corrections].sort((a, b) => a.startIndex - b.startIndex);
      let lastIndex = 0;
      const highlighted = [];
      let corrected = '';

      sorted.forEach(correction => {
        const originalSegment = input.substring(lastIndex, correction.startIndex);
        highlighted.push(<span key={`text-${lastIndex}`}>{originalSegment}</span>);
        corrected += originalSegment + correction.correction;
        const incorrect = input.substring(correction.startIndex, correction.endIndex);
        highlighted.push(<span key={`err-${correction.startIndex}`} className="error-highlight">{incorrect}</span>);
        lastIndex = correction.endIndex;
      });

      const remaining = input.substring(lastIndex);
      highlighted.push(<span key="text-end">{remaining}</span>);
      corrected += remaining;

      setOutput(
        <div className="proofread-output">
          <strong>Original:</strong><p>{highlighted}</p>
          <strong>Corrected:</strong><p>{corrected}</p>
        </div>
      );
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="api-card">
      <h2>Proofreader API</h2>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleProofread} disabled={isLoading}>Run Proofreader</button>
      <div className="output">{output}</div>
    </div>
  );
};

export default ProofreaderApi;