// src/App.jsx

import React, { useState, useEffect } from 'react';
import './App.css';

// CORRECTION: Ensured all imports use the exact PascalCase 'Api' spelling 
// to match the filenames.
import PromptApi from './components/PromptApi';
import WriterApi from './components/WriterApi';
import RewriterApi from './components/RewriterApi';
import ProofreaderApi from './components/ProofreaderApi';
import SummarizerApi from './components/SummarizerApi';
import { useMonitorDownload } from './hooks/useMonitorDownload';

function App() {
  const [apiSupportStatus, setApiSupportStatus] = useState('Checking for on-device AI support...');
  const { downloadStatus } = useMonitorDownload();

  useEffect(() => {
    if ('LanguageModel' in self || 'Writer' in self) {
      setApiSupportStatus('On-device AI support detected. Components are ready.');
    } else {
      setApiSupportStatus('On-device AI not supported. Use Chrome 127+ and enable #prompt-api flag.');
    }
  }, []);

  return (
    <div className="container">
      <header>
        <h1>Skyline Nano Academy - Robust On-Device AI</h1>
        <div className="status-bar">
          <strong>Global Status:</strong> {downloadStatus || apiSupportStatus}
        </div>
      </header>

      <PromptApi />
      <WriterApi />
      <RewriterApi />
      <ProofreaderApi />
      <SummarizerApi />
    </div>
  );
}

export default App;