import React, { useState, useEffect } from 'react';
import { model, getSource, fileToGenerativePart } from '../lib/firebase';

function FirebaseAi() {
  const [onDeviceStatus, setOnDeviceStatus] = useState('checking...');
  const [jokeResponse, setJokeResponse] = useState('');
  const [jokeSource, setJokeSource] = useState('N/A');
  const [poemResponse, setPoemResponse] = useState('');
  const [poemSource, setPoemSource] = useState('N/A');
  const [file, setFile] = useState(null);

  useEffect(() => {
    async function checkOnDeviceStatus() {
      const source = await getSource();
      setOnDeviceStatus(source === 'Built-in AI' ? 'available' : 'not available');
    }
    checkOnDeviceStatus();
  }, []);

  const handleJokeClick = async () => {
    setJokeResponse('');
    setJokeSource(await getSource());
    const prompt = 'Tell me a short joke';
    try {
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        setJokeResponse((prev) => prev + chunkText);
      }
    } catch (err) {
      console.error(err.name, err.message);
      setJokeResponse(`Error: ${err.message}`);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handlePoemClick = async () => {
    if (!file) {
      alert('Please select a file first.');
      return;
    }
    setPoemResponse('');
    setPoemSource(await getSource());
    const prompt = 'Write a poem on this picture';
    const imagePart = await fileToGenerativePart(file);
    try {
      const result = await model.generateContentStream([prompt, imagePart]);
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        setPoemResponse((prev) => prev + chunkText);
      }
    } catch (err) {
      console.error(err.name, err.message);
      setPoemResponse(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <h1>Firebase AI Logic</h1>
      <p>On-device AI status: {onDeviceStatus}</p>
      
      <h2>Textual prompt</h2>
      <div>
        <button onClick={handleJokeClick}>Tell me a joke</button>
        <br />
        <small>Response from: <span>{jokeSource}</span></small>
        <pre>{jokeResponse}</pre>
      </div>

      <h2>Multimodal prompt</h2>
      <div>
        <p>Write a poem on this picture:</p>
        <input type="file" onChange={handleFileChange} accept="image/*" />
        <button onClick={handlePoemClick} disabled={!file}>Generate Poem</button>
        <br />
        <small>Response from: <span>{poemSource}</span></small>
        <pre>{poemResponse}</pre>
      </div>
    </div>
  );
}

export default FirebaseAi;
