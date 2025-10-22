// src/components/LessonPlayer.jsx

import React, { useState, useEffect } from "react";
import "./LessonPlayer.css"; // We will create this CSS file

const LessonPlayer = ({ lesson, onClose, onLessonRated }) => {
  const [currentView, setCurrentView] = useState("scene"); // 'scene', 'quiz', 'rating'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);

  const [currentImageUrl, setCurrentImageUrl] = useState("");

  const currentItem = lesson.lesson[currentIndex];

  useEffect(() => {
    // This effect handles creating and revoking the object URL for the current image
    let url = "";
    const imageBlob = lesson.lesson[currentIndex]?.imageData;

    if (imageBlob instanceof Blob) {
      url = URL.createObjectURL(imageBlob);
      setCurrentImageUrl(url);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [currentIndex, lesson.lesson]);

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

  return (
    <div className="lesson-player-overlay">
      <button className="player-close-btn" onClick={onClose}>
        &times;
      </button>

      {currentView === "scene" && (
        <div className="player-scene-view">
          <div className="player-image-wrapper">
            {/* Use the state variable for the image src */}
            <img src={currentImageUrl} alt={currentItem.image_prompt} />
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
