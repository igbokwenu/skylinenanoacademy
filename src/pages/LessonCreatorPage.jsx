// src/pages/LessonCreatorPage.jsx

import React, { useState, useEffect } from "react"; // <-- Import useEffect
import { useLocation } from "react-router-dom";
import { useLessonGenerator } from "../hooks/useLessonGenerator";
import LessonPreview from "../components/LessonPreview";
import LessonSettingsPanel from "../components/LessonSettingsPanel";
import GenerationActionsPanel from "../components/GenerationActionsPanel";

const initialCreatorSettings = {
  prompt: "Explain the process of photosynthesis in a magical forest.",
  format: "Storybook",
  style: "Cartoon",
  tone: "Funny",
  ageGroup: "Grades 3-5 (Ages 8-10)",
  perspective: "Third Person",
  studentName: "",
  studentGender: "",
  studentEthnicity: "",
  studentPersonalFacts: "",
};

const LessonCreatorPage = () => {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const location = useLocation();

  // --- SHARED LESSON GENERATION LOGIC (From the Hook) ---
  const { handleGenerateImages: generateImagesInHook, ...restOfHook } =
    useLessonGenerator(initialCreatorSettings);
  const {
    settings,
    setSettings,
    sceneCount,
    setSceneCount,
    generatedLesson,
    lessonWithImages,
    isGeneratingImages,
    generationError,
    characterMode,
    setCharacterMode,
    customCharacterImage,
    customCharacterDescription,
    setCustomCharacterDescription,
    customCharacterImageUse,
    setCustomCharacterImageUse,
    studentImage,
    studentImageAnalysis,
    studentImageUse,
    setStudentImageUse,
    mainCharacter,
    setMainCharacter,
    isLoading,
    isAnalysisLoading,
    status,
    streamingOutput,
    tokenInfo,
    handleCreateLesson,
    handleStudentImageUpload,
    handleCustomCharacterImageUpload,
    handleGenerateCustomCharacterDescription,
    handleGenerateCharacter,
    handleSettingChange,
    abortCurrentPrompt,
  } = restOfHook;

  useEffect(() => {
    if (location.state) {
      setSettings((prevSettings) => ({
        ...prevSettings,
        // Use the prompt if it exists, otherwise keep the old one
        prompt: location.state.defaultPrompt || prevSettings.prompt,
        // Use the ageGroup if it exists, otherwise keep the old one
        ageGroup: location.state.ageGroup || prevSettings.ageGroup,
      }));
    }
  }, [location.state, setSettings]);

  const runImageGenerationAndShowPreview = async () => {
    const success = await generateImagesInHook(); // Call the hook's function
    if (success) {
      setIsPreviewVisible(true); // Update local UI state on success
    }
  };

  return (
    <div className="page-container">
      {isPreviewVisible && (generatedLesson || lessonWithImages) && (
        <LessonPreview
          lesson={lessonWithImages || generatedLesson}
          lessonSettings={settings}
          onClose={() => setIsPreviewVisible(false)}
          isReteach={false}
        />
      )}
      <div className="lc-header">
        <h3>Design Engaging, Story-Driven Lessons</h3>
      </div>
      <div className="lc-main">
        <LessonSettingsPanel
          settings={settings}
          setSettings={setSettings}
          sceneCount={sceneCount}
          setSceneCount={setSceneCount}
        >
          {/* ALL CHARACTER UI IS NOW PASSED AS CHILDREN */}
          {!settings.perspective.includes("Immersive") ? (
            <div className="setting-item main-character-panel">
              <label>Main Character</label>
              <button
                onClick={handleGenerateCharacter}
                disabled={isAnalysisLoading}
              >
                {isAnalysisLoading ? "Generating..." : "Generate Character"}
              </button>
              <input
                type="text"
                placeholder="Character Name"
                value={mainCharacter.name}
                onChange={(e) =>
                  setMainCharacter((p) => ({ ...p, name: e.target.value }))
                }
              />
              <textarea
                placeholder="Character Description"
                value={mainCharacter.description}
                onChange={(e) =>
                  setMainCharacter((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                rows={4}
              />
            </div>
          ) : (
            <>
              <div className="setting-item">
                <label>Character Mode</label>
                <div>
                  <input
                    type="radio"
                    id="student-char"
                    name="characterMode"
                    value="student"
                    checked={characterMode === "student"}
                    onChange={() => setCharacterMode("student")}
                  />
                  <label htmlFor="student-char">Student as character</label>
                  <input
                    type="radio"
                    id="custom-char"
                    name="characterMode"
                    value="custom"
                    checked={characterMode === "custom"}
                    onChange={() => setCharacterMode("custom")}
                  />
                  <label htmlFor="custom-char">Custom character</label>
                </div>
              </div>
              {characterMode === "student" ? (
                <>
                  <div className="setting-item student-name-input">
                    <label htmlFor="studentName">Student's Name</label>
                    <input
                      type="text"
                      id="studentName"
                      name="studentName"
                      value={settings.studentName}
                      onChange={handleSettingChange}
                      placeholder="Enter name for immersive story"
                    />
                  </div>
                  <div className="setting-item">
                    <label>Upload Student Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleStudentImageUpload}
                    />
                    {isAnalysisLoading && <div className="loader"></div>}
                  </div>
                  {studentImage && (
                    <>
                      <div className="setting-item">
                        <label>Image Usage</label>
                        <div>
                          <input
                            type="radio"
                            id="student-direct"
                            name="studentImageUse"
                            value="direct"
                            checked={studentImageUse === "direct"}
                            onChange={() => setStudentImageUse("direct")}
                          />
                          <label htmlFor="student-direct">
                            Use Image Directly
                          </label>
                          <input
                            type="radio"
                            id="student-desc"
                            name="studentImageUse"
                            value="description"
                            checked={studentImageUse === "description"}
                            onChange={() => setStudentImageUse("description")}
                          />
                          <label htmlFor="student-desc">
                            Use Image Description
                          </label>
                        </div>
                      </div>
                      {studentImageUse === "description" && (
                        <div className="image-analysis-results">
                          <p>
                            <strong>Gender:</strong>{" "}
                            {studentImageAnalysis.gender}
                          </p>
                          <p>
                            <strong>Ethnicity:</strong>{" "}
                            {studentImageAnalysis.ethnicity}
                          </p>
                          <p>
                            <strong>Facial Features:</strong>{" "}
                            {studentImageAnalysis.facialFeatures}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="immersive-grid">
                    <div className="setting-item">
                      <label htmlFor="studentGender">Student's Gender</label>
                      <select
                        id="studentGender"
                        name="studentGender"
                        value={settings.studentGender}
                        onChange={handleSettingChange}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="setting-item">
                      <label htmlFor="studentEthnicity">
                        Student's Ethnicity
                      </label>
                      <select
                        id="studentEthnicity"
                        name="studentEthnicity"
                        value={settings.studentEthnicity}
                        onChange={handleSettingChange}
                      >
                        <option value="">Select Ethnicity</option>
                        <option value="American Indian or Alaska Native">
                          American Indian or Alaska Native
                        </option>
                        <option value="Asian">Asian</option>
                        <option value="Black or African American">
                          Black or African American
                        </option>
                        <option value="White">White</option>
                        <option value="Hispanic or Latino">
                          Hispanic or Latino
                        </option>
                        <option value="Middle Eastern or North African (MENA)">
                          Middle Eastern or North African (MENA)
                        </option>
                        <option value="Native Hawaiian or Pacific Islander">
                          Native Hawaiian or Pacific Islander
                        </option>
                      </select>
                    </div>
                  </div>
                  <div className="setting-item student-name-input">
                    <label htmlFor="studentPersonalFacts">Personal Facts</label>
                    <textarea
                      id="studentPersonalFacts"
                      name="studentPersonalFacts"
                      value={settings.studentPersonalFacts}
                      onChange={handleSettingChange}
                      maxLength="180"
                      placeholder="You can input other interesting or personal facts to further personalize the lesson. e.g., Loves to play the guitar, has a pet cat named Randy, favorite; food, cartoon, Pokemon, etc. (max 180 characters)"
                    ></textarea>
                  </div>
                </>
              ) : (
                <>
                  <div className="setting-item">
                    <label>Upload Character Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomCharacterImageUpload}
                    />
                  </div>
                  <div className="setting-item">
                    <label>Character Description</label>
                    <textarea
                      value={customCharacterDescription}
                      onChange={(e) =>
                        setCustomCharacterDescription(e.target.value)
                      }
                    />
                    <button
                      onClick={handleGenerateCustomCharacterDescription}
                      disabled={!customCharacterImage || isAnalysisLoading}
                    >
                      {isAnalysisLoading
                        ? "Generating..."
                        : "Generate from Image"}
                    </button>
                  </div>
                  <div className="setting-item">
                    <label>Image Usage</label>
                    <div>
                      <input
                        type="radio"
                        id="custom-direct"
                        name="customImageUse"
                        value="direct"
                        checked={customCharacterImageUse === "direct"}
                        onChange={() => setCustomCharacterImageUse("direct")}
                      />
                      <label htmlFor="custom-direct">Use Image Directly</label>
                      <input
                        type="radio"
                        id="custom-desc"
                        name="customImageUse"
                        value="description"
                        checked={customCharacterImageUse === "description"}
                        onChange={() =>
                          setCustomCharacterImageUse("description")
                        }
                      />
                      <label htmlFor="custom-desc">Use Image Description</label>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </LessonSettingsPanel>
        <GenerationActionsPanel
          isLoading={isLoading}
          status={status}
          tokenInfo={tokenInfo}
          generationError={generationError}
          streamingOutput={streamingOutput}
          generatedLesson={generatedLesson}
          isGeneratingImages={isGeneratingImages}
          handleCreateLesson={handleCreateLesson}
          abortCurrentPrompt={abortCurrentPrompt}
          handleGenerateImages={runImageGenerationAndShowPreview}
          handlePreview={() => setIsPreviewVisible(true)}
          generateButtonText="Generate Lesson"
        />
      </div>
    </div>
  );
};

export default LessonCreatorPage;
