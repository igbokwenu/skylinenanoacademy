// src/components/LessonAnalysisPanel.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LessonAnalysisPanel.css";

// --- NEW: Sanitize function to clean AI output ---
const sanitizeContent = (content) => {
  if (!content) return "";
  // Removes leading/trailing whitespace and all asterisks/hash marks
  return content.trim().replace(/[*#]/g, "");
};

const LessonAnalysisPanel = ({ hook }) => {
  const navigate = useNavigate();
  const {
    isProcessing,
    statusMessage,
    transcription,
    lessonTitle,
    setLessonTitle,
    summary,
    keyPoints,
    condensedLesson,
    homework,
    quiz,
    lessonCreatorPrompt,
    analyzeText,
    saveLesson,
  } = hook;

  const createGoogleFormLink = (title, content) => {
    const formUrl =
      "https://docs.google.com/forms/d/e/1FAIpQLSc_1VzE_h_2iP84d_4v-C_l_p8Fvzv_J_b_v_J_c/viewform?usp=pp_url";
    const titleParam = `&entry.1045781291=${encodeURIComponent(title)}`;
    const contentParam = `&entry.1065046570=${encodeURIComponent(
      sanitizeContent(content)
    )}`;
    window.open(formUrl + titleParam + contentParam, "_blank");
  };

  const navigateToLessonCreator = () => {
    navigate("/lesson-creator", {
      state: { defaultPrompt: sanitizeContent(lessonCreatorPrompt) },
    });
  };

  return (
    <div className="analysis-panel">
      <h3>2. Review & Generate</h3>
      <div className="status-bar-assistant">
        <strong>Status:</strong> {statusMessage}
      </div>

      {transcription && (
        <>
          <div className="lesson-title-input">
            <label htmlFor="lessonTitle">Lesson Title:</label>
            <input
              type="text"
              id="lessonTitle"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="transcription-output">
            <h4>Full Transcription</h4>
            <textarea value={transcription} readOnly rows={10}></textarea>
          </div>

          {/* This section now displays auto-generated content */}
          <div className="results-grid">
            {summary && <ResultCard title="Summary" content={summary} />}
            {keyPoints && <ResultCard title="Key Points" content={keyPoints} />}
            {condensedLesson && (
              <ResultCard title="Condensed Version" content={condensedLesson} />
            )}
          </div>

          <div className="content-generation">
            <h4>3. Create Follow-Up Materials</h4>
            <div className="analysis-actions">
              <button
                onClick={() => analyzeText("homework")}
                disabled={isProcessing}
              >
                Create Homework
              </button>
              <button
                onClick={() => analyzeText("quiz")}
                disabled={isProcessing}
              >
                Create Quiz
              </button>
              <button
                onClick={() => analyzeText("lessonPrompt")}
                disabled={isProcessing}
              >
                Generate Lesson Creator Prompt
              </button>
            </div>
            <div className="results-grid">
              {homework && (
                <ResultCard
                  title="Homework"
                  content={homework}
                  onShare={() =>
                    createGoogleFormLink(`${lessonTitle} - Homework`, homework)
                  }
                />
              )}
              {quiz && (
                <ResultCard
                  title="Quiz"
                  content={quiz}
                  onShare={() =>
                    createGoogleFormLink(`${lessonTitle} - Quiz`, quiz)
                  }
                />
              )}
              {lessonCreatorPrompt && (
                <ResultCard
                  title="Lesson Creator Prompt"
                  content={lessonCreatorPrompt}
                  onAction={navigateToLessonCreator}
                  actionText="Use in Lesson Creator"
                />
              )}
            </div>
          </div>

          <div className="save-action">
            <button
              className="save-btn"
              onClick={saveLesson}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Save Full Lesson"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// --- NEW: ResultCard with Copy Icon and Sanitization ---
const ResultCard = ({ title, content, onShare, onAction, actionText }) => {
  const [copyText, setCopyText] = useState("Copy");
  const cleanedContent = sanitizeContent(content);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanedContent).then(() => {
      setCopyText("Copied!");
      setTimeout(() => setCopyText("Copy"), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="result-card">
      <div className="card-header">
        <h4>{title}</h4>
        <button onClick={handleCopy} className="copy-btn" title="Copy content">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>{copyText}</span>
        </button>
      </div>
      <pre className="result-content">{cleanedContent}</pre>
      {onShare && (
        <button className="share-btn" onClick={onShare}>
          Share via Google Form
        </button>
      )}
      {onAction && (
        <button className="action-btn" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};

export default LessonAnalysisPanel;
