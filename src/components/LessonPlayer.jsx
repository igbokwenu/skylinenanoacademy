// src/components/LessonPlayer.jsx

import React, { useState, useEffect, useRef } from "react";
import "./LessonPlayer.css";
import placeholderImage from "../assets/skyline_nano_academy.png";

const AUTO_PLAY_DELAY = 10000; // 10 seconds for auto-advancing slides

const LessonPlayer = ({ lesson, onClose, onLessonRated }) => {
  const [currentView, setCurrentView] = useState("scene"); // 'scene', 'quiz', 'rating'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  // --- NEW STATE FOR TTS AND AUTOPLAY ---
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const autoPlayTimerRef = useRef(null);

  const currentItem = lesson.lesson[currentIndex];

  useEffect(() => {
    let url = "";
    const imageBlob = lesson.lesson[currentIndex]?.imageData;

    if (imageBlob instanceof Blob) {
      url = URL.createObjectURL(imageBlob);
      setCurrentImageUrl(url);
    } else {
      // If no image data, use the imported placeholder
      setCurrentImageUrl(placeholderImage);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [currentIndex, lesson.lesson]);

  // --- TTS LOGIC ---
  useEffect(() => {
    // Cancel any speech that might be ongoing from a previous slide
    window.speechSynthesis.cancel();

    if (isTtsEnabled && currentView === "scene" && currentItem.paragraph) {
      const utterance = new SpeechSynthesisUtterance(currentItem.paragraph);
      window.speechSynthesis.speak(utterance);
    }

    // Cleanup: stop speech when the component unmounts
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentIndex, currentView, isTtsEnabled, currentItem.paragraph]);

  // --- AUTOPLAY LOGIC ---
  useEffect(() => {
    // Clear any existing timer when dependencies change
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }

    if (isAutoPlayEnabled && currentView === "scene") {
      autoPlayTimerRef.current = setTimeout(() => {
        handleNext();
      }, AUTO_PLAY_DELAY);
    }

    // Cleanup: clear the timer if the component unmounts or auto-play is turned off
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [currentIndex, currentView, isAutoPlayEnabled]);

  const handleNext = () => {
    if (currentIndex < lesson.lesson.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentView("quiz");
    }
  };

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
    // Move to rating view after a short delay
    setTimeout(() => setCurrentView("rating"), 3000);
  };

  const handleRating = (rateValue) => {
    setRating(rateValue);
    onLessonRated(lesson.id, rateValue);
    setTimeout(onClose, 1500); // Close after rating
  };

  const getScore = () =>
    lesson.quiz.reduce(
      (score, q, i) => (userAnswers[i] === q.answer ? score + 1 : score),
      0
    );

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight" && currentView === "scene") handleNext();
    if (e.key === "ArrowLeft" && currentView === "scene") handlePrev();
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentView]);

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
