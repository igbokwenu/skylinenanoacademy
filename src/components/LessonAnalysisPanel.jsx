// src/components/LessonAnalysisPanel.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import "./LessonAnalysisPanel.css";

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

  // Function to create a shareable Google Form link (pre-filled)
  const createGoogleFormLink = (title, content) => {
    const formUrl =
      "https://docs.google.com/forms/d/e/1FAIpQLSc_1VzE_h_2iP84d_4v-C_l_p8Fvzv_J_b_v_J_c/viewform?usp=pp_url";
    const titleParam = `&entry.1045781291=${encodeURIComponent(title)}`;
    const contentParam = `&entry.1065046570=${encodeURIComponent(content)}`;
    window.open(formUrl + titleParam + contentParam, "_blank");
  };

  const navigateToLessonCreator = () => {
    // This is a conceptual navigation. You might need to use state management (like Context or Redux)
    // to pass the prompt to the LessonCreatorPage if it doesn't accept URL params.
    navigate("/lesson-creator", {
      state: { defaultPrompt: lessonCreatorPrompt },
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
            <textarea value={transcription} readOnly rows={15}></textarea>
          </div>

          <div className="analysis-actions">
            <button
              onClick={() => analyzeText("summary")}
              disabled={isProcessing}
            >
              Generate Summary
            </button>
            <button
              onClick={() => analyzeText("keyPoints")}
              disabled={isProcessing}
            >
              Extract Key Points
            </button>
            <button
              onClick={() => analyzeText("condense")}
              disabled={isProcessing}
            >
              Condense Lesson
            </button>
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
              Save Full Lesson
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const ResultCard = ({ title, content, onShare, onAction, actionText }) => (
  <div className="result-card">
    <h4>{title}</h4>
    <pre className="result-content">{content}</pre>
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

export default LessonAnalysisPanel;
