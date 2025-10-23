// src/components/PrintableLesson.jsx

import React, { forwardRef } from "react";
import placeholderImage from "../assets/skyline_nano_academy.png";
import "./PrintableLesson.css";

// We must use forwardRef to pass the ref from useReactToPrint to the DOM element
const PrintableLesson = forwardRef(({ lesson }, ref) => {
  const coverImageBlob = lesson.lesson[0]?.imageData;
  const coverImageUrl = coverImageBlob
    ? URL.createObjectURL(coverImageBlob)
    : placeholderImage;

  return (
    <div ref={ref} className="printable-container">
      {/* ---- Cover Page ---- */}
      <div className="page cover-page">
        <img src={coverImageUrl} alt={lesson.title} className="cover-image" />
        <h1>{lesson.title}</h1>
        <p className="blurb">{lesson.blurb}</p>
        <div className="metadata-grid">
          <div>
            <strong>Format:</strong> {lesson.metadata.format}
          </div>
          <div>
            <strong>Style:</strong> {lesson.metadata.style}
          </div>
          <div>
            <strong>Tone:</strong> {lesson.metadata.tone}
          </div>
          <div>
            <strong>Age Group:</strong> {lesson.metadata.ageGroup}
          </div>
          <div>
            <strong>Perspective:</strong> {lesson.metadata.perspective}
          </div>
        </div>
      </div>

      {/* ---- Lesson Scenes ---- */}
      {lesson.lesson.map((scene, index) => {
        const sceneImageBlob = scene.imageData;
        const sceneImageUrl = sceneImageBlob
          ? URL.createObjectURL(sceneImageBlob)
          : placeholderImage;
        return (
          <div key={`scene-${index}`} className="page scene-page">
            <h2>Scene {scene.scene}</h2>
            <img
              src={sceneImageUrl}
              alt={`Scene ${scene.scene}`}
              className="scene-image"
            />
            <p className="scene-paragraph">{scene.paragraph}</p>
          </div>
        );
      })}

      {/* ---- Quiz Page ---- */}
      <div className="page quiz-page">
        <h2>Quiz Time!</h2>
        {lesson.quiz.map((q, index) => (
          <div key={`quiz-${index}`} className="quiz-item">
            <p className="question">
              <strong>
                {index + 1}. {q.question}
              </strong>
            </p>
            <ol type="A">
              {q.options.map((opt) => (
                <li key={opt}>{opt}</li>
              ))}
            </ol>
            <p className="answer">
              <strong>Answer:</strong> {q.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

export default PrintableLesson;
