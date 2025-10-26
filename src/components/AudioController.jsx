// src/components/AudioController.jsx

import React, { useRef, useEffect } from "react";
import "./AudioController.css";

const AudioController = ({
  isRecording,
  isProcessing,
  startRecording,
  stopRecording,
  handleFileUpload,
}) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioStreamRef = useRef(null);

  useEffect(() => {
    let audioContext, analyser, source;

    const setupWaveform = (stream) => {
      audioStreamRef.current = stream;
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext("2d");

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = "#f0f2f5";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
          canvasCtx.fillStyle = "#0c64e4";
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };
      draw();
    };

    if (isRecording) {
      // We only need to set up the waveform, the stream is handled by the hook now
      navigator.mediaDevices.getUserMedia({ audio: true }).then(setupWaveform);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [isRecording]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Dynamic button text and action
  const getButtonProps = () => {
    if (isProcessing) {
      return {
        text: "Processing...",
        action: () => {},
        disabled: true,
        className: "join-btn processing",
      };
    }
    if (isRecording) {
      return {
        text: "End Lesson",
        action: stopRecording,
        disabled: false,
        className: "join-btn recording",
      };
    }
    return {
      text: "Join Lesson & Start Recording",
      action: startRecording,
      disabled: false,
      className: "join-btn",
    };
  };

  const buttonProps = getButtonProps();

  return (
    <div className="audio-controller">
      <h3>1. Start Lesson</h3>
      <div className="controls-group">
        <button
          className={buttonProps.className}
          onClick={buttonProps.action}
          disabled={buttonProps.disabled}
        >
          {buttonProps.text}
        </button>
        <div className="upload-wrapper">
          <label htmlFor="audio-upload" className="upload-btn">
            Or Upload Audio File
          </label>
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            onChange={onFileChange}
            disabled={isRecording || isProcessing}
            style={{ display: "none" }}
          />
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        width="600"
        height="100"
      ></canvas>
    </div>
  );
};

export default AudioController;
