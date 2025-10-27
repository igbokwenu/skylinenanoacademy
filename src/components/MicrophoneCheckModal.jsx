import React, { useState, useRef } from "react";
import "./MicrophoneCheckModal.css";

const MicrophoneCheckModal = ({ onClose, transcribeTestAudio }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [status, setStatus] = useState(
    'Click "Start Test" to record 15 seconds of audio.'
  );
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setTestResult("");
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setStatus("Transcribing...");
        const result = await transcribeTestAudio(audioBlob);
        setTestResult(result);
        setStatus("Test complete. Review the transcription below.");
      };

      recorder.start();
      setIsTesting(true);
      setStatus("Start Speaking! Recording for 15 seconds...");

      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
          setIsTesting(false);
        }
      }, 15000);
    } catch (err) {
      setStatus("Microphone access was denied.");
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Microphone Quality Check</h2>
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        <p>{status}</p>
        <div className="test-controls">
          <button onClick={startTest} disabled={isTesting}>
            {isTesting ? "Testing..." : "Start Test"}
          </button>
        </div>
        {testResult && (
          <div className="test-result">
            <h4>Transcription Result:</h4>
            <p>"{testResult}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MicrophoneCheckModal;
