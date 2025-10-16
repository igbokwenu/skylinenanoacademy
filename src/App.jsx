import React, { useState, useEffect } from 'react';
import './App.css'; // We will use the CSS from our previous steps

function App() {
  // General states
  const [status, setStatus] = useState('Checking API availability...');
  const [loading, setLoading] = useState(false);

  // States for each API's input and output
  const [promptInput, setPromptInput] = useState('Write a short, uplifting poem about a new beginning.');
  const [promptOutput, setPromptOutput] = useState('');

  const [writerInput, setWriterInput] = useState('Compose a professional email to a client confirming a project deadline.');
  const [writerOutput, setWriterOutput] = useState('');

  const [rewriterInput, setRewriterInput] = useState("The report was bad and we need to fix it now.");
  const [rewriterOutput, setRewriterOutput] = useState('');

  const [proofreaderInput, setProofreaderInput] = useState('i beleive that thier are some misteaks in this sentance.');
  const [proofreaderOutput, setProofreaderOutput] = useState('');

  const [summarizerInput, setSummarizerInput] = useState('Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass more than two and a half times that of all the other planets in the Solar System combined.');
  const [summarizerOutput, setSummarizerOutput] = useState('');

  // --- Helper to monitor model downloads (from your code) ---
  const monitorDownload = () => {
    return {
      monitor(m) {
        m.addEventListener("downloadprogress", e => {
          const progress = (e.loaded * 100).toFixed(1);
          setStatus(`Downloading Model: ${progress}%`);
          if (e.loaded === e.total) {
            setStatus('Model download complete! Processing...');
          }
        });
      }
    };
  };

  // --- API Handlers Using Your Working Logic ---

  const handlePrompt = async () => {
    if (!('LanguageModel' in self)) {
      setPromptOutput('Prompt API is not supported in this browser.');
      return;
    }
    setLoading(true);
    setPromptOutput('Generating...');
    try {
      const session = await LanguageModel.create(monitorDownload());
      const response = await session.prompt(promptInput);
      setPromptOutput(response);
    } catch (error) {
      setPromptOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWrite = async () => {
    if (!('Writer' in self)) {
      setWriterOutput('Writer API is not supported.');
      return;
    }
    setLoading(true);
    setWriterOutput('Writing...');
    try {
      const writer = await Writer.create(monitorDownload());
      const result = await writer.write(writerInput);
      setWriterOutput(result);
    } catch (error) {
      setWriterOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async () => {
    if (!('Rewriter' in self)) {
      setRewriterOutput('Rewriter API is not supported.');
      return;
    }
    setLoading(true);
    setRewriterOutput('Rewriting...');
    try {
      const rewriter = await Rewriter.create(monitorDownload());
      const rewrittenResult = await rewriter.rewrite(rewriterInput, { tone: 'more-formal' });
      setRewriterOutput(rewrittenResult);
    } catch (error) {
      setRewriterOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

const handleProofread = async () => {
    if (!('Proofreader' in self)) {
      setProofreaderOutput('Proofreader API is not supported.');
      return;
    }
    setLoading(true);
    setProofreaderOutput('Proofreading...');
    try {
      const proofreader = await Proofreader.create({
        expectedInputLanguages: ['en'],
        ...monitorDownload()
      });

      const proofreadResult = await proofreader.proofread(proofreaderInput);

      if (!proofreadResult.corrections || proofreadResult.corrections.length === 0) {
        setProofreaderOutput('No corrections needed.');
        return;
      }

      // --- Build the User-Friendly Visual Output ---
      let lastIndex = 0;
      const highlightedJsx = [];
      let correctedSentence = '';

      // Sort corrections by start index just in case the API doesn't guarantee order
      const sortedCorrections = [...proofreadResult.corrections].sort((a, b) => a.startIndex - b.startIndex);

      sortedCorrections.forEach(correction => {
        // Add the text between the last correction and this one
        const originalSegment = proofreaderInput.substring(lastIndex, correction.startIndex);
        highlightedJsx.push(<span key={`text-${lastIndex}`}>{originalSegment}</span>);
        correctedSentence += originalSegment;

        // Add the highlighted incorrect word
        const incorrectWord = proofreaderInput.substring(correction.startIndex, correction.endIndex);
        highlightedJsx.push(<span key={`error-${correction.startIndex}`} className="error-highlight">{incorrectWord}</span>);
        
        // Add the corrected word to our final sentence
        correctedSentence += correction.correction;

        lastIndex = correction.endIndex;
      });

      // Add any remaining text after the last correction
      const remainingText = proofreaderInput.substring(lastIndex);
      highlightedJsx.push(<span key="text-end">{remainingText}</span>);
      correctedSentence += remainingText;

      const finalOutput = (
        <div className="proofread-output">
          <strong>Original with Errors:</strong>
          <p>{highlightedJsx}</p>
          <strong>Corrected Version:</strong>
          <p>{correctedSentence}</p>
        </div>
      );
      
      setProofreaderOutput(finalOutput);

    } catch (error) {
      setProofreaderOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  const handleSummarize = async () => {
    if (!('Summarizer' in self)) {
      setSummarizerOutput('Summarizer API is not supported.');
      return;
    }
    setLoading(true);
    setSummarizerOutput('Summarizing...');
    try {
      const summarizer = await Summarizer.create(monitorDownload());
      const summary = await summarizer.summarize(summarizerInput);
      setSummarizerOutput(summary);
    } catch (error) {
      setSummarizerOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // A simple check on page load.
    if ('LanguageModel' in self || 'Writer' in self) {
      setStatus('API support detected. Ready to run.');
    } else {
      setStatus('On-device AI not supported. Please check Chrome version, flags, and hardware.');
    }
  }, []);

  return (
    <div className="container">
      <header>
        <h1>Skyline Nano Academy - On-Device AI</h1>
        <div className="status-bar">
          <strong>Status:</strong> {loading ? 'Processing...' : status}
        </div>
      </header>

      <div className="api-card">
        <h2>Prompt API</h2>
        <textarea value={promptInput} onChange={(e) => setPromptInput(e.target.value)} />
        <button onClick={handlePrompt} disabled={loading}>Run Prompt</button>
        <pre className="output">{promptOutput}</pre>
      </div>

      <div className="api-card">
        <h2>Writer API</h2>
        <textarea value={writerInput} onChange={(e) => setWriterInput(e.target.value)} />
        <button onClick={handleWrite} disabled={loading}>Run Writer</button>
        <pre className="output">{writerOutput}</pre>
      </div>

      <div className="api-card">
        <h2>Rewriter API</h2>
        <textarea value={rewriterInput} onChange={(e) => setRewriterInput(e.target.value)} />
        <button onClick={handleRewrite} disabled={loading}>Run Rewriter (to be more formal)</button>
        <pre className="output">{rewriterOutput}</pre>
      </div>

 <div className="api-card">
  <h2>Proofreader API</h2>
  <textarea value={proofreaderInput} onChange={(e) => setProofreaderInput(e.target.value)} />
  <button onClick={handleProofread} disabled={loading}>Run Proofreader</button>
  <div className="output">{proofreaderOutput}</div>
</div>

      <div className="api-card">
        <h2>Summarizer API (No Trial Needed)</h2>
        <textarea rows="5" value={summarizerInput} onChange={(e) => setSummarizerInput(e.target.value)} />
        <button onClick={handleSummarize} disabled={loading}>Run Summarizer</button>
        <pre className="output">{summarizerOutput}</pre>
      </div>
    </div>
  );
}

export default App;