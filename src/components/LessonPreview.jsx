// src/components/LessonPreview.jsx

import React, { useState, useEffect } from 'react';
import placeholderImage from '../assets/skyline_nano_academy.png';

const LessonPreview = ({ lesson, onClose }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const currentScene = lesson.lesson[currentSceneIndex];
  const totalScenes = lesson.lesson.length;
  const totalQuestions = lesson.quiz.length;

  const handleNext = () => {
    if (currentSceneIndex < totalScenes - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    } else {
      setShowQuiz(true);
    }
  };

  const handlePrev = () => {
    if (showQuiz) {
      setShowQuiz(false);
    } else if (currentSceneIndex > 0) {
      setCurrentSceneIndex(prev => prev - 1);
    }
  };

  const handleAnswerSelect = (qIndex, option) => {
    setUserAnswers(prev => ({ ...prev, [qIndex]: option }));
  };

  const handleSubmitQuiz = () => {
    setSubmitted(true);
  };
  
  // Handle Escape key to close the preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getScore = () => {
    return lesson.quiz.reduce((score, question, index) => {
      return userAnswers[index] === question.answer ? score + 1 : score;
    }, 0);
  };

  return (
    <div className="lesson-preview-overlay">
      <div className="lesson-preview-modal">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <header>
          <h2>{lesson.title}</h2>
          {!showQuiz && <div className="scene-counter">Scene {currentSceneIndex + 1} / {totalScenes}</div>}
          {showQuiz && <div className="scene-counter">Quiz</div>}
        </header>

        <main>
          {!showQuiz ? (
            <div className="scene-content">
              <div className="image-container">
                <img src={placeholderImage} alt={`Scene ${currentScene.scene}`} />
                <p className="image-prompt-caption"><strong>Image Prompt:</strong> <em>"{currentScene.image_prompt}"</em></p>
              </div>
              <div className="paragraph-container">
                <p>{currentScene.paragraph}</p>
              </div>
            </div>
          ) : (
            <div className="quiz-content">
              <h3>Test Your Knowledge!</h3>
              {submitted && (
                <div className="quiz-score">
                  You scored {getScore()} out of {totalQuestions}!
                </div>
              )}
              {lesson.quiz.map((q, index) => (
                <div key={index} className="quiz-question">
                  <p><strong className="quiz-question-text">{index + 1}. {q.question}</strong></p>
                  <div className="options-container">
                    {q.options.map(opt => {
                      let className = 'option-btn';
                      if (submitted) {
                        if (opt === q.answer) className += ' correct';
                        else if (userAnswers[index] === opt) className += ' incorrect';
                      } else if (userAnswers[index] === opt) {
                         className += ' selected';
                      }
                      return (
                        <button
                          key={opt}
                          className={className}
                          onClick={() => !submitted && handleAnswerSelect(index, opt)}
                          disabled={submitted}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {!submitted && <button className="submit-quiz-btn" onClick={handleSubmitQuiz}>Submit Quiz</button>}
            </div>
          )}
        </main>

        <footer>
          {(currentSceneIndex > 0 || showQuiz) && (
            <button onClick={handlePrev}>&larr; Previous</button>
          )}
          {/* <button onClick={onClose}>&larr; Exit</button> */}
          <button className="close-btn" onClick={onClose}>&times;</button>
                  {!showQuiz && (
            currentSceneIndex < totalScenes - 1 ? (
              <button onClick={handleNext}>Next &rarr;</button>
            ) : (
              <button onClick={handleNext}>Go to Quiz &rarr;</button>
            )
          )}
        </footer>
      </div>
    </div>
  );
};

export default LessonPreview;