//src/components/GenerationActionsPanel.jsx
import React, { useState } from "react";
import "./LessonFormCore.css"; // Shared styles

const GenerationActionsPanel = ({
  isLoading,
  status,
  tokenInfo,
  generationError,
  streamingOutput,
  generatedLesson,
  isGeneratingImages,
  handleCreateLesson,
  abortCurrentPrompt,
  handleGenerateImages,
  handlePreview,
  title = "3. Generate & Preview",
  generateButtonText = "Generate Lesson", // FIX: Added prop with a default value
}) => {
  const [isStreamVisible, setIsStreamVisible] = useState(false);

  return (
    <div className="lc-actions-panel">
      <h3>{title}</h3>
      <p>
        The AI will generate your lesson below. When complete, a "Preview"
        button will appear.
      </p>
      <div className="button-group">
        <button
          className="generate-btn"
          onClick={handleCreateLesson}
          disabled={isLoading}
        >
          {/* FIX: Using the dynamic prop for the button text */}
          {isLoading ? "Generating..." : generateButtonText}
        </button>
        {isLoading && (
          <button className="abort-btn" onClick={abortCurrentPrompt}>
            Abort
          </button>
        )}
      </div>
      <div className="api-status-details">
        <strong>Status:</strong> {status} <br />
        <strong>{tokenInfo}</strong>
      </div>
      {generationError && (
        <div className="error-message">
          <strong>Generation Failed</strong>
          <p>{generationError}</p>
        </div>
      )}
      {streamingOutput && (
        <div className="collapsible-stream">
          <button
            onClick={() => setIsStreamVisible(!isStreamVisible)}
            className="stream-toggle-btn"
          >
            {isStreamVisible ? "Hide Stream" : "Click to view stream"}
          </button>
          {isStreamVisible && <pre className="output">{streamingOutput}</pre>}
        </div>
      )}
      {generatedLesson && !isLoading && (
        <div className="preview-ready">
          <h4>Your lesson is ready!</h4>
          <p>"{generatedLesson.title}"</p>
          <button className="preview-btn" onClick={handlePreview}>
            Preview & Edit Lesson
          </button>
          <button
            className="generate-img-btn"
            onClick={handleGenerateImages}
            disabled={isGeneratingImages}
          >
            {isGeneratingImages
              ? "Generating Images..."
              : "Generate Images for Lesson"}
          </button>
        </div>
      )}
    </div>
  );
};

export default GenerationActionsPanel;
