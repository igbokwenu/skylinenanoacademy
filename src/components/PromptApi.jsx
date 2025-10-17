// src/components/PromptApi.jsx

import React, { useState, useRef } from 'react';
import { useLanguageModel } from '../hooks/useLanguageModel';
import { useMonitorDownload } from '../hooks/useMonitorDownload';

const PromptApi = () => {
  const [promptInput, setPromptInput] = useState('What is the weather in Tokyo? Then, create a character sheet for a gnome wizard in JSON format.');
  const [imageFile, setImageFile] = useState(null);
  const imageInputRef = useRef(null);
  const { getMonitor } = useMonitorDownload();

  const creationOptions = {
    tools: [{
      name: "getWeather",
      description: "Get the current weather in a specific location.",
      inputSchema: {
        type: "object",
        properties: { location: { type: "string", description: "The city, e.g., San Francisco" } },
        required: ["location"],
      },
      async execute({ location }) {
        if (location.toLowerCase().includes("tokyo")) {
          return JSON.stringify({ location: "Tokyo", temp: "25°C", condition: "Clear" });
        }
        return JSON.stringify({ location, temp: "unknown" });
      },
    }],
  };

  const {
    isLoading, output, status, tokenInfo, executePrompt,
    abortCurrentPrompt, cloneCurrentSession, destroySession
  } = useLanguageModel({ apiName: 'LanguageModel', creationOptions });

  const handleFileChange = (e) => setImageFile(e.target.files?.[0] || null);

  const handleRunPrompt = async () => {
    let promptContent = [];
    if (imageFile) {
      promptContent.push({ type: "text", value: `Describe this image and then answer: ${promptInput}` });
      promptContent.push({ type: "image", value: imageFile });
    } else {
      promptContent.push({ type: "text", value: promptInput });
    }

    const finalPrompt = [{ role: "user", content: promptContent }];

    const jsonSchema = {
      type: "object",
      properties: {
        name: { type: "string", description: "Character's name" },
        class: { type: "string", enum: ["Wizard"] },
        race: { type: "string", enum: ["Gnome"] },
        level: { type: "number", minimum: 1 },
      },
      required: ["name", "class", "race", "level"],
    };

    await executePrompt(finalPrompt, { responseConstraint: jsonSchema }, getMonitor());
  };

  return (
    <div className="api-card">
      <h2>Prompt API (Advanced Features)</h2>
      <p>Tool Calling, JSON Output, Streaming, Multimodal Input, Session Control, Token Counting</p>
      
      <textarea value={promptInput} onChange={(e) => setPromptInput(e.target.value)} />
      
      <div className="input-group">
        <label htmlFor="image-upload">Add Image (Multimodal):</label>
        <input id="image-upload" type="file" accept="image/*" ref={imageInputRef} onChange={handleFileChange} />
        {imageFile && <small>Selected: {imageFile.name}</small>}
      </div>
      
      <div className="button-group">
        <button onClick={handleRunPrompt} disabled={isLoading}>{isLoading ? 'Running...' : 'Run Prompt'}</button>
        <button onClick={abortCurrentPrompt} disabled={!isLoading}>Abort</button>
        <button onClick={cloneCurrentSession} disabled={isLoading}>Clone Session</button>
        <button onClick={destroySession} disabled={isLoading}>Destroy Session</button>
      </div>

      <div className="api-status-details">
        <strong>Status:</strong> {status} <br/>
        <strong>{tokenInfo}</strong>
      </div>

      <pre className="output">{output}</pre>
    </div>
  );
};

export default PromptApi;