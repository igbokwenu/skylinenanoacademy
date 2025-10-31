//src/components/LessonSettingsPanel.jsx
import React from "react";
import "./LessonFormCore.css"; // Shared styles

const lessonParams = {
  formats: ["Manga", "Storybook", "Comic Book", "Science Journal"],
  styles: ["Cartoon", "Photorealistic", "3D Animation", "Anime", "Watercolor"],
  tones: ["Educational", "Funny", "Suspenseful", "Dramatic", "Mysterious"],
  ageGroups: [
    "Grades 1-2 (Ages 6-7)",
    "Grades 3-5 (Ages 8-10)",
    "Grades 6-8 (Ages 11-13)",
    "Grades 9-12 (Ages 14-18)",
    "Undergraduate (Ages 18-22)",
    "Graduate (Ages 23-26)",
    "Postgraduate/Doctoral (Ages 27+)",
  ],
  perspectives: [
    "Third Person",
    "First Person",
    "Immersive (Student is a character)",
  ],
};

const examplePrompts = [
  "Create a lesson about how red blood cells carry oxygen through the body.",
  "Write a lesson that helps students understand metaphors and similes by turning them into living characters in a poem.",
  "Create a lesson that explains quantum entanglement through a story about two best friends.",
  "Create a chemistry lesson where students explore how atoms bond by imagining a school dance where elements form friendships based on shared electrons.",
  "Explain the process of photosynthesis in a magical forest.",
  "Create a detective story where students solve a mystery using the scientific method.",
  "Tell a story about the water cycle from the perspective of a single drop of water.",
];

const LessonSettingsPanel = ({
  settings,
  setSettings,
  sceneCount,
  setSceneCount,
  children, // This will now hold all the complex character UI
  isReteachMode = false,
}) => {
  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="lc-settings-panel">
      <h3>
        {isReteachMode
          ? "1. Review Student & Lesson Details"
          : "1. Describe Your Lesson"}
      </h3>
      <textarea
        name="prompt"
        value={settings.prompt}
        onChange={handleSettingChange}
        rows="4"
        placeholder={
          isReteachMode
            ? "The AI will suggest a lesson topic here based on its analysis."
            : "e.g., Create a lesson about the solar system..."
        }
      />
      {!isReteachMode && (
        <div className="example-prompts">
          <strong>Or try an example:</strong>
          {examplePrompts.map((p) => (
            <button
              key={p}
              className="example-prompt-btn"
              onClick={() => setSettings((s) => ({ ...s, prompt: p }))}
            >
              {p.substring(0, 35)}...
            </button>
          ))}
        </div>
      )}

      <h3>
        {isReteachMode
          ? "2. Adjust Lesson Style"
          : "2. Customize the Experience"}
      </h3>
      <div className="settings-grid">
        {Object.entries(lessonParams).map(([key, values]) => (
          <div className="setting-item" key={key}>
            <label htmlFor={key}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            <select
              name={key.replace(/s$/, "")}
              id={key}
              value={settings[key.replace(/s$/, "")] || ""}
              onChange={handleSettingChange}
            >
              {values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* The children prop injects all character-related UI here */}
        {children}

        <div className="setting-item scene-count-slider">
          <label htmlFor="sceneCount">
            Scenes & Quizzes: <strong>{sceneCount}</strong>
          </label>
          <input
            type="range"
            id="sceneCount"
            name="sceneCount"
            min="5"
            max="12"
            value={sceneCount}
            onChange={(e) => setSceneCount(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default LessonSettingsPanel;
