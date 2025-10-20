// src/components/LessonPreview.jsx

import React, { useState, useEffect } from "react";
import placeholderImage from "../assets/skyline_nano_academy.png";
import { useLanguageModel } from "../hooks/useLanguageModel";

const LessonPreview = ({ lesson, onClose }) => {
  const [editableLesson, setEditableLesson] = useState(
    JSON.parse(JSON.stringify(lesson))
  );
  const [editingSceneId, setEditingSceneId] = useState(null);
  const [rewritePrompt, setRewritePrompt] = useState("");
  const [proofreadResult, setProofreadResult] = useState(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selectionRewritePrompt, setSelectionRewritePrompt] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [isRewritePopupVisible, setIsRewritePopupVisible] = useState(false);
  const [selectionRange, setSelectionRange] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  const { isLoading: isRewriting, executePrompt: executeRewrite } =
    useLanguageModel({ apiName: "Rewriter" });
  const [isProofreading, setIsProofreading] = useState(false);

  const currentScene = editableLesson.lesson[currentSceneIndex];
  const totalScenes = editableLesson.lesson.length;
  const totalQuestions = editableLesson.quiz.length;

  const handleNext = () => {
    if (currentSceneIndex < totalScenes - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
    } else {
      setShowQuiz(true);
    }
  };

  const handlePrev = () => {
    if (showQuiz) {
      setShowQuiz(false);
    } else if (currentSceneIndex > 0) {
      setCurrentSceneIndex((prev) => prev - 1);
    }
  };

  const handleAnswerSelect = (qIndex, option) => {
    setUserAnswers((prev) => ({ ...prev, [qIndex]: option }));
  };

  const handleSubmitQuiz = () => {
    if (Object.keys(userAnswers).length !== totalQuestions) {
      alert("Please answer all questions first.");
    } else {
      setSubmitted(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const getScore = () => {
    return editableLesson.quiz.reduce((score, question, index) => {
      return userAnswers[index] === question.answer ? score + 1 : score;
    }, 0);
  };

  const handleEdit = (sceneId) => {
    setEditingSceneId(sceneId);
    setFeedback("");
  };

  const handleCancelEdit = () => {
    setEditingSceneId(null);
    setEditableLesson(JSON.parse(JSON.stringify(lesson)));
    setFeedback("");
  };

  const handleSceneTextChange = (sceneId, field, value) => {
    setEditableLesson((prev) => ({
      ...prev,
      lesson: prev.lesson.map((scene) =>
        scene.scene === sceneId ? { ...scene, [field]: value } : scene
      ),
    }));
  };

  const handleSelection = (e, field) => {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start !== end) {
      const text = textarea.value.substring(start, end);
      setSelectedText(text);
      setSelectionRange({ start, end, field });
      setIsRewritePopupVisible(true);

      const rect = textarea.getBoundingClientRect();
      const popupTop = e.clientY - rect.top;
      const popupLeft = e.clientX - rect.left;

      setPopupPosition({ top: popupTop, left: popupLeft });
    }
  };

  const handleRewriteSelection = async () => {
    if (!selectedText || !selectionRange) return;

    setFeedback("Rewriting selection...");
    const rewrittenText = await executeRewrite(selectedText, {
      context: selectionRewritePrompt,
    });

    if (rewrittenText) {
      const { start, end, field } = selectionRange;
      const originalText = currentScene[field];
      const newText =
        originalText.substring(0, start) +
        rewrittenText +
        originalText.substring(end);

      handleSceneTextChange(currentScene.scene, field, newText);
      setFeedback("Selection rewritten successfully!");
    } else {
      setFeedback("Failed to rewrite the selection.");
    }

    setIsRewritePopupVisible(false);
    setSelectionRewritePrompt("");
    setSelectedText("");
    setSelectionRange(null);
  };

  const handleRewrite = async (sceneId) => {
    setFeedback("Rewriting scene...");
    const scene = editableLesson.lesson.find((s) => s.scene === sceneId);
    const rewrittenParagraph = await executeRewrite(scene.paragraph, {
      context: rewritePrompt,
    });

    if (rewrittenParagraph) {
      handleSceneTextChange(sceneId, "paragraph", rewrittenParagraph);
      setFeedback("Scene rewritten. Now rewriting image prompt...");

      const imagePromptRewriteContext = `Based on this new scene, create a new image prompt: "${rewrittenParagraph}"`;
      const rewrittenImagePrompt = await executeRewrite(scene.image_prompt, {
        context: imagePromptRewriteContext,
      });

      if (rewrittenImagePrompt) {
        handleSceneTextChange(sceneId, "image_prompt", rewrittenImagePrompt);
        setFeedback("Scene and image prompt rewritten successfully!");
      } else {
        setFeedback("Scene rewritten, but failed to rewrite the image prompt.");
      }
    } else {
      setFeedback("Failed to rewrite the scene.");
    }
  };

  const handleProofreadAndSave = async (sceneId) => {
    setIsProofreading(true);
    setFeedback("Proofreading...");
    const scene = editableLesson.lesson.find((s) => s.scene === sceneId);
    const textToProofread = `${scene.paragraph}\n\n${scene.image_prompt}`;

    try {
      const proofreader = await self.Proofreader.create();
      const result = await proofreader.proofread(textToProofread);
      if (result.corrections && result.corrections.length > 0) {
        setProofreadResult(result);
        setFeedback("Proofreading complete. Please review the suggestions.");
      } else {
        setEditingSceneId(null);
        setFeedback("No errors found. Changes saved.");
      }
    } catch (error) {
      console.error("Proofreading error:", error);
      setEditingSceneId(null);
      setFeedback("Could not proofread. Changes saved without proofreading.");
    } finally {
      setIsProofreading(false);
    }
  };

  const handleAcceptCorrection = () => {
    let correctedParagraph = editableLesson.lesson.find(
      (s) => s.scene === editingSceneId
    ).paragraph;
    let correctedImagePrompt = editableLesson.lesson.find(
      (s) => s.scene === editingSceneId
    ).image_prompt;

    const corrections = proofreadResult.corrections;

    corrections.forEach((correction) => {
      correctedParagraph = correctedParagraph.replace(
        correctedParagraph.substring(
          correction.startIndex,
          correction.endIndex
        ),
        correction.correction
      );
      correctedImagePrompt = correctedImagePrompt.replace(
        correctedImagePrompt.substring(
          correction.startIndex,
          correction.endIndex
        ),
        correction.correction
      );
    });

    setEditableLesson((prev) => ({
      ...prev,
      lesson: prev.lesson.map((scene) =>
        scene.scene === editingSceneId
          ? {
              ...scene,
              paragraph: correctedParagraph,
              image_prompt: correctedImagePrompt,
            }
          : scene
      ),
    }));
    setProofreadResult(null);
    setEditingSceneId(null);
    setFeedback("Corrections applied and changes saved.");
  };

  const handleIgnoreCorrection = () => {
    setProofreadResult(null);
    setEditingSceneId(null);
    setFeedback("Corrections ignored. Changes saved.");
  };

  return (
    <div className="lesson-preview-overlay">
      <div className="lesson-preview-modal">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <header>
          <h2>{editableLesson.title}</h2>
          {!showQuiz && (
            <div className="scene-counter">
              Scene {currentSceneIndex + 1} / {totalScenes}
            </div>
          )}
          {showQuiz && <div className="scene-counter">Quiz</div>}
        </header>

        <main>
          {!showQuiz ? (
            <div className="scene-content">
              {editingSceneId === currentScene.scene ? (
                <div className="scene-editor">
                  <div className="editor-main-content">
                    <div className="edit-field">
                      <label>Paragraph</label>
                      <textarea
                        value={currentScene.paragraph}
                        onSelect={(e) => handleSelection(e, "paragraph")}
                        onChange={(e) =>
                          handleSceneTextChange(
                            currentScene.scene,
                            "paragraph",
                            e.target.value
                          )
                        }
                        rows={10}
                      />
                    </div>
                    <div className="edit-field">
                      <label>Image Prompt</label>
                      <textarea
                        value={currentScene.image_prompt}
                        onSelect={(e) => handleSelection(e, "image_prompt")}
                        onChange={(e) =>
                          handleSceneTextChange(
                            currentScene.scene,
                            "image_prompt",
                            e.target.value
                          )
                        }
                        rows={5}
                      />
                    </div>
                  </div>
                  {isRewritePopupVisible && (
                    <div
                      className="rewrite-popup"
                      style={{
                        top: popupPosition.top,
                        left: popupPosition.left,
                      }}
                    >
                      <textarea
                        value={selectionRewritePrompt}
                        onChange={(e) =>
                          setSelectionRewritePrompt(e.target.value)
                        }
                        placeholder="e.g., Make this part more playful..."
                        rows={3}
                      />
                      <div className="rewrite-popup-actions">
                        <button onClick={handleRewriteSelection}>
                          Rewrite
                        </button>
                        <button onClick={() => setIsRewritePopupVisible(false)}>
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="editor-sidebar">
                    <div className="rewrite-section">
                      <label>Rewrite Prompt</label>
                      <textarea
                        value={rewritePrompt}
                        onChange={(e) => setRewritePrompt(e.target.value)}
                        placeholder="e.g., Make the scene more dramatic and change the setting to a rainy night."
                        rows={4}
                      />
                    </div>
                    <div className="edit-actions">
                      <button
                        onClick={() => handleRewrite(currentScene.scene)}
                        disabled={isRewriting}
                        className="btn-rewrite"
                      >
                        {isRewriting ? "Rewriting..." : "Rewrite Scene"}
                      </button>
                      <button
                        onClick={() =>
                          handleProofreadAndSave(currentScene.scene)
                        }
                        disabled={isProofreading}
                        className="btn-save"
                      >
                        {isProofreading ? "Saving..." : "Save Changes"}
                      </button>
                      <button onClick={handleCancelEdit} className="btn-cancel">
                        Cancel
                      </button>
                    </div>
                    {feedback && (
                      <div className="editor-feedback-box">{feedback}</div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="image-container">
                    <img
                      src={placeholderImage}
                      alt={`Scene ${currentScene.scene}`}
                    />
                    <p className="image-prompt-caption">
                      <strong>Image Prompt:</strong>{" "}
                      <em>"{currentScene.image_prompt}"</em>
                    </p>
                  </div>
                  <div className="paragraph-container">
                    <p>{currentScene.paragraph}</p>
                  </div>
                  <button onClick={() => handleEdit(currentScene.scene)}>
                    Edit Scene
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="quiz-content">
              <h3>Test Your Knowledge!</h3>
              {submitted && (
                <div className="quiz-score">
                  You scored {getScore()} out of {totalQuestions}!
                </div>
              )}
              {editableLesson.quiz.map((q, index) => (
                <div key={index} className="quiz-question">
                  <p>
                    <strong className="quiz-question-text">
                      {index + 1}. {q.question}
                    </strong>
                  </p>
                  <div className="options-container">
                    {q.options.map((opt) => {
                      let className = "option-btn";
                      if (submitted) {
                        if (opt === q.answer) className += " correct";
                        else if (userAnswers[index] === opt)
                          className += " incorrect";
                      } else if (userAnswers[index] === opt) {
                        className += " selected";
                      }
                      return (
                        <button
                          key={opt}
                          className={className}
                          onClick={() =>
                            !submitted && handleAnswerSelect(index, opt)
                          }
                          disabled={submitted}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {!submitted && (
                <button className="submit-quiz-btn" onClick={handleSubmitQuiz}>
                  Submit Quiz
                </button>
              )}
            </div>
          )}
        </main>

        <footer>
          {(currentSceneIndex > 0 || showQuiz) && (
            <button onClick={handlePrev}>&larr; Previous</button>
          )}
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
          {!showQuiz &&
            (currentSceneIndex < totalScenes - 1 ? (
              <button onClick={handleNext}>Next &rarr;</button>
            ) : (
              <button onClick={handleNext}>Go to Quiz &rarr;</button>
            ))}
        </footer>

        {proofreadResult && (
          <div className="proofread-modal">
            <h3>Proofreader Suggestions</h3>
            <p>
              The following corrections are suggested. Do you want to apply
              them?
            </p>
            <ul>
              {proofreadResult.corrections.map((c, i) => (
                <li key={i}>
                  "
                  {(
                    editableLesson.lesson.find(
                      (s) => s.scene === editingSceneId
                    ).paragraph +
                    " " +
                    editableLesson.lesson.find(
                      (s) => s.scene === editingSceneId
                    ).image_prompt
                  ).substring(c.startIndex, c.endIndex)}
                  " should be "{c.correction}"
                </li>
              ))}
            </ul>
            <div class="button-group">
              <button onClick={handleAcceptCorrection}>Accept Changes</button>
              <button onClick={handleIgnoreCorrection}>Ignore and Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonPreview;
