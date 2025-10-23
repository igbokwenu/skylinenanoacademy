// src/components/LessonPlayer.jsx

import React, { useState, useEffect, useRef, useCallback } from "react"; // 1. Import useCallback
import "./LessonPlayer.css";
import placeholderImage from "../assets/skyline_nano_academy.png";

const AUTO_PLAY_DELAY = 20000;

const LessonPlayer = ({ lesson, onClose, onLessonRated }) => {
  // --- STATE AND REFS (First) ---
  const [currentView, setCurrentView] = useState("scene");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState(placeholderImage);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const autoPlayTimerRef = useRef(null);

  const currentItem = lesson.lesson[currentIndex];

  // --- HANDLER FUNCTIONS (Second - Wrapped in useCallback) ---
  const handleNext = useCallback(() => {
    if (currentIndex < lesson.lesson.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentView("quiz");
    }
  }, [currentIndex, lesson.lesson.length]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleAnswerSelect = (qIndex, option) => {
    setUserAnswers((prev) => ({ ...prev, [qIndex]: option }));
  };

  const handleSubmitQuiz = () => {
    setSubmitted(true);
    setTimeout(() => setCurrentView("rating"), 3000);
  };

  const handleRating = (rateValue) => {
    setRating(rateValue);
    onLessonRated(lesson.id, rateValue);
    setTimeout(onClose, 1500);
  };

  const getScore = useCallback(
    () =>
      lesson.quiz.reduce(
        (score, q, i) => (userAnswers[i] === q.answer ? score + 1 : score),
        0
      ),
    [lesson.quiz, userAnswers]
  );

  // --- USE EFFECT HOOKS (Third) ---

  // Image handling logic
  useEffect(() => {
    let url = "";
    const imageBlob = lesson.lesson[currentIndex]?.imageData;
    if (imageBlob instanceof Blob) {
      url = URL.createObjectURL(imageBlob);
      setCurrentImageUrl(url);
    } else {
      setCurrentImageUrl(placeholderImage);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [currentIndex, lesson.lesson]);

  // Robust TTS logic
  useEffect(() => {
    const synth = window.speechSynthesis;
    const speak = () => {
      if (isTtsEnabled && currentView === "scene" && currentItem.paragraph) {
        if (synth.pending || synth.speaking) synth.cancel();
        const utterance = new SpeechSynthesisUtterance(currentItem.paragraph);

        // --- SPEED CONTROL ---
        utterance.rate = 0.8; // Set playback speed. 1 is default, 0.8 is 80% speed.

        synth.speak(utterance);
      }
    };
    synth.cancel();
    const speakTimeout = setTimeout(speak, 100);
    return () => {
      clearTimeout(speakTimeout);
      if (synth) synth.cancel();
    };
  }, [currentIndex, currentView, isTtsEnabled, currentItem.paragraph]);

  // Auto-play logic
  useEffect(() => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    if (isAutoPlayEnabled && currentView === "scene") {
      autoPlayTimerRef.current = setTimeout(handleNext, AUTO_PLAY_DELAY);
    }
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [currentView, isAutoPlayEnabled, handleNext]); // handleNext is now stable thanks to useCallback

  // Keyboard navigation logic
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && currentView === "scene") handleNext();
      if (e.key === "ArrowLeft" && currentView === "scene") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, handleNext, onClose]); // handleNext is stable here too

  // --- RENDER (Last) ---
  return (
    <div className="lesson-player-overlay">
      <div className="player-controls">
        <button
          onClick={() => setIsTtsEnabled(!isTtsEnabled)}
          className="control-btn"
        >
          {isTtsEnabled ? "Mute TTS" : "Play TTS"}
        </button>
        <button
          onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
          className="control-btn"
        >
          {isAutoPlayEnabled ? "Auto-Play: On" : "Auto-Play: Off"}
        </button>
      </div>
      <button className="player-close-btn" onClick={onClose}>
        &times;
      </button>

      {currentView === "scene" && (
        <div
          className="player-scene-view"
          style={{ "--bg-image": `url(${currentImageUrl})` }}
        >
          <div className="player-image-wrapper">
            <img
              src={currentImageUrl}
              alt={currentItem.image_prompt || "Lesson Scene"}
            />
          </div>
          <div className="player-paragraph-wrapper">
            <p>{currentItem.paragraph}</p>
          </div>
          <button className="player-nav-btn next" onClick={handleNext}>
            Next &rarr;
          </button>
          {currentIndex > 0 && (
            <button className="player-nav-btn prev" onClick={handlePrev}>
              &larr; Prev
            </button>
          )}
        </div>
      )}

      {currentView === "quiz" && (
        <div className="player-quiz-view">
          <h2>Test Your Knowledge</h2>
          {submitted && (
            <div className="player-quiz-score">
              You scored {getScore()} out of {lesson.quiz.length}!
            </div>
          )}
          <div className="player-questions-container">
            {lesson.quiz.map((q, index) => (
              <div key={index} className="player-quiz-question">
                <p>
                  <strong>
                    {index + 1}. {q.question}
                  </strong>
                </p>
                <div className="player-options">
                  {q.options.map((opt) => {
                    let className = "player-option-btn";
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
          </div>
          {!submitted && (
            <button className="player-submit-btn" onClick={handleSubmitQuiz}>
              Submit Quiz
            </button>
          )}
        </div>
      )}

      {currentView === "rating" && (
        <div className="player-rating-view">
          <h2>Rate this Lesson!</h2>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={star <= rating ? "star filled" : "star"}
                onClick={() => handleRating(star)}
              >
                ★
              </span>
            ))}
          </div>
          {rating > 0 && <p>Thank you for your feedback!</p>}
        </div>
      )}
    </div>
  );
};

export default LessonPlayer;
