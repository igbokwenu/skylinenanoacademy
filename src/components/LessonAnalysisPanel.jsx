// src/components/LessonAnalysisPanel.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LessonAnalysisPanel.css";

const sanitizeContent = (content) => {
  if (!content) return "";
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
    savedLessonId,
  } = hook;

  const createGoogleFormLink = () => {
    alert("Full Google Form integration is coming soon!");
  };

  // --- NEW: Function to handle auto-saving and navigation ---
  const handleUseInLessonCreator = async () => {
    const prompt = sanitizeContent(lessonCreatorPrompt);
    navigator.clipboard.writeText(prompt); // Copy to clipboard for good UX

    if (!savedLessonId) {
      await saveLesson(); // Auto-save if not already saved
    }
    // NEW: Add the ageRange from the hook to the navigation state
    navigate("/lesson-creator", {
      state: {
        defaultPrompt: prompt,
        ageGroup: hook.ageRange, // Use the 'ageGroup' key to match LessonCreator's settings
      },
    });
  };

  // --- NEW: Function to create and launch email client ---
  const handleShareEmail = (materialType, content) => {
    const sanitizedFullContent = sanitizeContent(content);
    const separator = "---ANSWERS---";
    let contentForStudent = sanitizedFullContent;

    // Check if the separator exists and split the string to get only the questions
    if (sanitizedFullContent.includes(separator)) {
      contentForStudent = sanitizedFullContent.split(separator)[0].trim();
    }

    const subject = encodeURIComponent(`${lessonTitle}: ${materialType}`);
    const body = encodeURIComponent(
      `Hello class,\n\nPlease find your ${materialType.toLowerCase()} below:\n\n---\n\n${contentForStudent}\n\n---\n\nBest,\nYour Teacher`
    );

    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

    if (mailtoLink.length > 8000) {
      alert(
        "This content is very long and may not fit in an email link. We have copied the questions to your clipboard for you to paste manually."
      );
      navigator.clipboard.writeText(contentForStudent);
      return;
    }

    window.open(mailtoLink, "_blank");
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
                  onShareEmail={() => handleShareEmail("Homework", homework)}
                  onShare={createGoogleFormLink}
                  content={homework}
                />
              )}
              {quiz && (
                <ResultCard
                  title="Quiz"
                  onShareEmail={() => handleShareEmail("Quiz", quiz)}
                  onShare={createGoogleFormLink}
                  content={quiz}
                />
              )}
              {lessonCreatorPrompt && (
                <ResultCard
                  title="Lesson Creator Prompt"
                  onAction={handleUseInLessonCreator}
                  actionText="Save & Use in Lesson Creator"
                  content={lessonCreatorPrompt}
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
              {savedLessonId
                ? `Update Saved Lesson (ID: ${savedLessonId})`
                : "Save Full Lesson"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const ResultCard = ({
  title,
  content,
  onShare,
  onAction,
  actionText,
  onShareEmail,
}) => {
  // ... same as before, but with onShareEmail prop ...
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
      <div className="card-actions">
        {onShareEmail && (
          <button className="share-btn email" onClick={onShareEmail}>
            Share via Email
          </button>
        )}
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
    </div>
  );
};

export default LessonAnalysisPanel;
