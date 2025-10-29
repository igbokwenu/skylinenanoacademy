import React, { forwardRef } from "react";

// We must use forwardRef to pass the ref from useReactToPrint to the DOM element
const PrintableLesson = forwardRef(({ lesson }, ref) => {
  const placeholderImage =
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800";

  const coverImageBlob = lesson.lesson[0]?.imageData;
  const coverImageUrl = coverImageBlob
    ? URL.createObjectURL(coverImageBlob)
    : placeholderImage;

  return (
    <div ref={ref} style={styles.printableContainer}>
      {/* ---- Cover Page (Full Screen with Overlay) ---- */}
      <div style={styles.coverPage}>
        <img src={coverImageUrl} alt={lesson.title} style={styles.coverImage} />

        {/* Dark gradient overlay for better text visibility */}
        <div style={styles.coverOverlay} />

        {/* Title at the top */}
        <div style={styles.titleContainer}>
          <h1 style={styles.coverTitle}>{lesson.title}</h1>
        </div>

        {/* Metadata at the bottom */}
        <div style={styles.metadataContainer}>
          <div style={styles.metadataGrid}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Format</span>
              <span style={styles.metadataValue}>{lesson.metadata.format}</span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Style</span>
              <span style={styles.metadataValue}>{lesson.metadata.style}</span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Tone</span>
              <span style={styles.metadataValue}>{lesson.metadata.tone}</span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Age Group</span>
              <span style={styles.metadataValue}>
                {lesson.metadata.ageGroup}
              </span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Perspective</span>
              <span style={styles.metadataValue}>
                {lesson.metadata.perspective}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Blurb Page (Centered) ---- */}
      <div style={styles.blurbPage}>
        <div style={styles.blurbContent}>
          <div style={styles.blurbDecoration} />
          <p style={styles.blurbText}>{lesson.blurb}</p>
          <div style={styles.blurbDecoration} />
        </div>
      </div>

      {/* ---- Lesson Scenes ---- */}
      {lesson.lesson.map((scene, index) => {
        const sceneImageBlob = scene.imageData;
        const sceneImageUrl = sceneImageBlob
          ? URL.createObjectURL(sceneImageBlob)
          : placeholderImage;
        return (
          <div key={`scene-${index}`} style={styles.page}>
            <h2 style={styles.sceneTitle}>Scene {scene.scene}</h2>
            <img
              src={sceneImageUrl}
              alt={`Scene ${scene.scene}`}
              style={styles.sceneImage}
            />
            <p style={styles.sceneParagraph}>{scene.paragraph}</p>
          </div>
        );
      })}

      {/* ---- Quiz Page ---- */}
      <div style={styles.page}>
        <h2 style={styles.quizTitle}>Quiz Time!</h2>
        {lesson.quiz.map((q, index) => (
          <div key={`quiz-${index}`} style={styles.quizItem}>
            <p style={styles.question}>
              <strong>
                {index + 1}. {q.question}
              </strong>
            </p>
            <ol type="A" style={styles.optionsList}>
              {q.options.map((opt) => (
                <li key={opt} style={styles.optionItem}>
                  {opt}
                </li>
              ))}
            </ol>
            <p style={styles.answer}>
              <strong>Answer:</strong> {q.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

const styles = {
  printableContainer: {
    width: "100%",
    background: "white",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Cover Page Styles
  coverPage: {
    width: "100%",
    minHeight: "100vh",
    pageBreakAfter: "always",
    pageBreakInside: "avoid",
    position: "relative",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  coverImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    zIndex: 1,
  },
  coverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)",
    zIndex: 2,
  },
  titleContainer: {
    position: "relative",
    zIndex: 3,
    padding: "60px 80px 40px",
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
  },
  coverTitle: {
    fontSize: "56px",
    fontWeight: "900",
    color: "white",
    margin: 0,
    textShadow: "2px 2px 8px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)",
    lineHeight: "1.2",
    letterSpacing: "-0.5px",
  },
  metadataContainer: {
    position: "relative",
    zIndex: 3,
    padding: "40px 80px 60px",
    background:
      "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
  },
  metadataGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    maxWidth: "700px",
    margin: "0 auto",
  },
  metadataItem: {
    background: "rgba(255, 255, 255, 0.15)",
    backdropFilter: "blur(10px)",
    padding: "20px 24px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  metadataLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
  },
  metadataValue: {
    fontSize: "18px",
    fontWeight: "600",
    color: "white",
    textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
  },

  // Blurb Page Styles
  blurbPage: {
    width: "100%",
    minHeight: "100vh",
    pageBreakAfter: "always",
    pageBreakInside: "avoid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "100px 120px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    boxSizing: "border-box",
  },
  blurbContent: {
    maxWidth: "800px",
    textAlign: "center",
  },
  blurbDecoration: {
    width: "80px",
    height: "4px",
    background: "rgba(255, 255, 255, 0.8)",
    margin: "0 auto 40px",
    borderRadius: "2px",
  },
  blurbText: {
    fontSize: "28px",
    lineHeight: "1.8",
    color: "white",
    margin: "0 0 40px 0",
    fontWeight: "400",
    textShadow: "1px 1px 3px rgba(0,0,0,0.2)",
    fontStyle: "italic",
  },

  // General Page Styles
  page: {
    width: "100%",
    minHeight: "100vh",
    pageBreakAfter: "always",
    pageBreakInside: "avoid",
    padding: "60px 80px",
    boxSizing: "border-box",
    background: "white",
  },

  // Scene Styles
  sceneTitle: {
    fontSize: "36px",
    fontWeight: "700",
    color: "#667eea",
    marginBottom: "30px",
    paddingBottom: "15px",
    borderBottom: "3px solid #667eea",
  },
  sceneImage: {
    width: "100%",
    maxWidth: "700px",
    height: "auto",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    marginBottom: "30px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  },
  sceneParagraph: {
    fontSize: "20px",
    lineHeight: "1.9",
    color: "#2d3748",
    margin: "30px 0",
    textAlign: "justify",
  },

  // Quiz Styles
  quizTitle: {
    fontSize: "42px",
    fontWeight: "800",
    color: "#667eea",
    marginBottom: "40px",
    textAlign: "center",
    paddingBottom: "20px",
    borderBottom: "4px solid #667eea",
  },
  quizItem: {
    background: "#f9fafb",
    padding: "30px",
    borderRadius: "16px",
    marginBottom: "30px",
    border: "2px solid #e2e8f0",
    pageBreakInside: "avoid",
  },
  question: {
    fontSize: "20px",
    color: "#2d3748",
    marginBottom: "20px",
    fontWeight: "600",
    lineHeight: "1.6",
  },
  optionsList: {
    margin: "20px 0",
    paddingLeft: "30px",
  },
  optionItem: {
    fontSize: "18px",
    lineHeight: "1.7",
    color: "#4a5568",
    marginBottom: "12px",
  },
  answer: {
    marginTop: "20px",
    padding: "15px 20px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "10px",
    color: "white",
    fontSize: "18px",
    fontWeight: "600",
  },
};

// Mock lesson data for preview
const mockLesson = {
  title: "The Amazing Journey",
  blurb:
    "Join us on an incredible adventure through time and space, where curiosity meets wonder and every moment brings a new discovery.",
  metadata: {
    format: "Interactive Story",
    style: "Educational",
    tone: "Inspiring",
    ageGroup: "8-12 years",
    perspective: "Third Person",
  },
  lesson: [
    {
      scene: 1,
      paragraph:
        "Once upon a time, in a world not so different from ours, there lived a young explorer named Alex. Alex had always dreamed of discovering something extraordinary, something that would change the world forever.",
      imageData: null,
    },
    {
      scene: 2,
      paragraph:
        "One sunny morning, while exploring the attic, Alex stumbled upon an old, dusty map. The map showed a mysterious island that didn't appear on any modern charts. This was it – the adventure Alex had been waiting for!",
      imageData: null,
    },
  ],
  quiz: [
    {
      question: "What was Alex's dream?",
      options: [
        "To become a teacher",
        "To discover something extraordinary",
        "To travel the world",
        "To write a book",
      ],
      answer: "B",
    },
    {
      question: "Where did Alex find the map?",
      options: [
        "In the basement",
        "In the attic",
        "In the library",
        "In a treasure chest",
      ],
      answer: "B",
    },
  ],
};

export default PrintableLesson;

// Preview component
function App() {
  return (
    <div style={{ padding: "20px", background: "#f5f5f5" }}>
      <PrintableLesson lesson={mockLesson} />
    </div>
  );
}

export { App };
