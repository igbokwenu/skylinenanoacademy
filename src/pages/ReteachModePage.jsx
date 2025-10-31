//src/pages/ReteachModePage.jsx
import React, { useState } from "react";
import { useLessonGenerator } from "../hooks/useLessonGenerator"; // The engine
import { useLanguageModel } from "../hooks/useLanguageModel"; // For analysis only
import LessonPreview from "../components/LessonPreview";
import LessonSettingsPanel from "../components/LessonSettingsPanel";
import GenerationActionsPanel from "../components/GenerationActionsPanel";
import "./ReteachModePage.css";

// This helper is only needed for parsing the analysis result on this page
const cleanAndParseJson = (rawString) => {
  if (!rawString || typeof rawString !== "string") return null;
  const match = rawString.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonContent = match ? match[1] : rawString;
  try {
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error("JSON parsing failed:", error);
    return null;
  }
};

// Reteach mode starts with blank/default settings
const initialReteachSettings = {
  prompt: "",
  format: "Storybook",
  style: "Cartoon",
  tone: "Educational",
  ageGroup: "Grades 3-5 (Ages 8-10)",
  perspective: "Immersive (Student is a character)",
  studentName: "",
  studentGender: "",
  studentEthnicity: "",
  studentPersonalFacts: "",
};

const ReteachModePage = () => {
  // --- PAGE-SPECIFIC STATE & LOGIC (For Analysis Step) ---
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [examImage, setExamImage] = useState(null);
  const [examText, setExamText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  const { isLoading: isAnalyzing, executePrompt: executeAnalysis } =
    useLanguageModel({
      apiName: "LanguageModel",
      creationOptions: {
        expectedInputs: [{ type: "image" }, { type: "text" }],
      },
    });

  // --- SHARED LESSON GENERATION LOGIC (From the Hook) ---
  const { handleGenerateImages: generateImagesInHook, ...restOfHook } =
    useLessonGenerator(initialReteachSettings);
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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setExamImage(file);
  };

  const handleAnalyzeScript = async () => {
    if (!examImage && !examText) {
      setAnalysisError("Please upload an image or provide text details.");
      return;
    }
    setAnalysisError("");
    setAnalysisResult(null);

    const analysisSchema = {
      type: "object",
      properties: {
        studentName: {
          type: "string",
          description: "The student's name, if visible. Otherwise 'Student'.",
        },
        ageGroup: {
          type: "string",
          description:
            "The most likely age group from the options: 'Grades 1-2 (Ages 6-7)', 'Grades 3-5 (Ages 8-10)', 'Grades 6-8 (Ages 11-13)', 'Grades 9-12 (Ages 14-18)'.",
        },
        failedTopics: {
          type: "array",
          items: { type: "string" },
          description:
            "A list of specific topics or concepts the student struggled with.",
        },
        lessonOutline: {
          type: "string",
          description:
            "A short, one-paragraph suggested lesson plan to reteach the failed topics.",
        },
      },
      required: ["studentName", "ageGroup", "failedTopics", "lessonOutline"],
    };

    // 1. Combine all text parts into a single string
    const textParts = [
      "Analyze the provided student's test/quiz script. Identify the questions or areas where the student struggled or failed. Extract the student's name and estimate their age group. Develop a concise lesson plan outline focusing on the areas where the student failed. Also, list the specific topics that need reteaching.",
      "You MUST respond in a valid JSON object matching the specified schema.",
    ];
    if (examText) {
      textParts.push(`\n\nAdditional Context from Educator:\n${examText}`);
    }
    const combinedText = textParts.join(" ");

    // 2. Build the structured content array for the prompt
    const promptContent = [{ type: "text", value: combinedText }];
    if (examImage) {
      // The hook expects the raw File object for 'image' type
      promptContent.push({ type: "image", value: examImage });
    }

    // 3. Assemble the final prompt in the format the model expects
    const finalPromptForAnalysis = [
      {
        role: "user",
        content: promptContent,
      },
    ];

    // 4. Execute the prompt
    const analysisJson = await executeAnalysis(finalPromptForAnalysis, {
      responseConstraint: analysisSchema, // CORRECT
    });

    if (analysisJson) {
      const parsed = cleanAndParseJson(analysisJson);
      if (parsed) {
        setAnalysisResult(parsed);

        // Defensively check if 'failedTopics' exists and is an array before joining.
        // Use optional chaining (?.) and the nullish coalescing operator (??).
        const topics =
          Array.isArray(parsed.failedTopics) && parsed.failedTopics.length > 0
            ? parsed.failedTopics.join(", ")
            : "the topics identified in the analysis"; // A safe fallback string

        setSettings((prev) => ({
          ...prev,
          studentName: parsed.studentName || "Student",
          ageGroup: parsed.ageGroup,
          // Use the safe 'topics' variable here
          prompt: `A lesson to reteach these topics: ${topics}.`,
        }));
      } else {
        setAnalysisError(
          "AI analysis failed to return a valid format. Please try again."
        );
      }
    } else {
      setAnalysisError("Failed to get a response from the analysis model.");
    }
  };

  // FIX: Create a wrapper function to orchestrate the UI update
  const runImageGenerationAndShowPreview = async () => {
    const success = await generateImagesInHook(); // Call the hook's function
    if (success) {
      setIsPreviewVisible(true); // If it succeeds, update the local UI state
    }
  };

  return (
    <div className="page-container">
      {isPreviewVisible && (generatedLesson || lessonWithImages) && (
        <LessonPreview
          lesson={lessonWithImages || generatedLesson}
          lessonSettings={settings}
          onClose={() => setIsPreviewVisible(false)}
          isReteach={true}
        />
      )}

      <div className="lc-header">
        <h3>Reteach Mode</h3>
        <p>
          Upload a student's work to automatically generate a personalized
          review lesson.
        </p>
      </div>

      <div className="lc-main">
        <div className="reteach-input-panel">
          <h3>1. Upload Student's Work</h3>
          <div className="upload-area">
            <label htmlFor="exam-upload">Upload Image of Exam/Quiz</label>
            <input
              id="exam-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
            {examImage && (
              <p className="file-info">Selected: {examImage.name}</p>
            )}
          </div>
          <textarea
            value={examText}
            onChange={(e) => setExamText(e.target.value)}
            rows="5"
            maxLength="5000"
            placeholder="Optionally, add more details here. For example, 'The student really struggled with question 5 about long division.' (5000 character limit)"
          />
          <button
            onClick={handleAnalyzeScript}
            disabled={isAnalyzing}
            className="analyze-btn"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze and Create Lesson Outline"}
          </button>
          {analysisError && <p className="error-message">{analysisError}</p>}
          {analysisResult && (
            <div className="analysis-results">
              <h4>Analysis Complete!</h4>
              <p>
                <strong>Suggested Lesson Outline:</strong>{" "}
                {analysisResult.lessonOutline}
              </p>
              <p>
                The lesson settings below have been pre-filled. You can adjust
                them before creating the lesson.
              </p>
            </div>
          )}
        </div>

        {analysisResult && (
          <>
            <LessonSettingsPanel
              settings={settings}
              setSettings={setSettings}
              sceneCount={sceneCount}
              setSceneCount={setSceneCount}
              isReteachMode={true}
            >
              {/* This is the same advanced character UI from LessonCreatorPage, now powered by the hook */}
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
                                onChange={() =>
                                  setStudentImageUse("description")
                                }
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
                          <label htmlFor="studentGender">
                            Student's Gender
                          </label>
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
                        <label htmlFor="studentPersonalFacts">
                          Personal Facts
                        </label>
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
                            onChange={() =>
                              setCustomCharacterImageUse("direct")
                            }
                          />
                          <label htmlFor="custom-direct">
                            Use Image Directly
                          </label>
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
                          <label htmlFor="custom-desc">
                            Use Image Description
                          </label>
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
              title="3. Create Reteach Lesson"
              generateButtonText="Create Re-Teach Lesson"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ReteachModePage;
