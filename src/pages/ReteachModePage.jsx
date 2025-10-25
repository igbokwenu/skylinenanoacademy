//src/pages/ReteachModePage.jsx
import React, { useState, useMemo } from "react";
import { useLessonGenerator } from "../hooks/useLessonGenerator";
import { useLanguageModel } from "../hooks/useLanguageModel";
import { useMonitorDownload } from "../hooks/useMonitorDownload";
import LessonPreview from "../components/LessonPreview";
import LessonSettingsPanel from "../components/LessonSettingsPanel";
import GenerationActionsPanel from "../components/GenerationActionsPanel";
import { fileToGenerativePart, imageModel } from "../lib/firebase";
import "./ReteachModePage.css";

// Reteach mode starts with blank settings
const initialReteachSettings = {
  prompt: "",
  format: "Storybook",
  style: "Cartoon",
  tone: "Funny",
  ageGroup: "Grades 3-5 (Ages 8-10)",
  perspective: "Immersive (Student is a character)",
  studentName: "",
  studentGender: "",
  studentEthnicity: "",
  studentPersonalFacts: "",
};

const ReteachModePage = () => {
  // State for the reteach-specific inputs
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [examImage, setExamImage] = useState(null);
  const [examText, setExamText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  // Hook for script analysis
  const { isLoading: isAnalyzing, executePrompt: executeAnalysis } =
    useLanguageModel({
      apiName: "LanguageModel",
      creationOptions: {
        expectedInputs: [{ type: "image" }, { type: "text" }],
      },
    });

  // Use the lesson generator hook
  const {
    // We get setSettings from the hook to populate it
    // ... pull in all the other states and handlers from the hook
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

    // Model Status
    isLoading,
    isAnalysisLoading,
    status,
    streamingOutput,
    tokenInfo,
    getMonitor,

    // Handlers
    handleCreateLesson,
    handleGenerateImages,
    handleStudentImageUpload,
    handleCustomCharacterImageUpload,
    handleGenerateCustomCharacterDescription,
    handleGenerateCharacter,
    handleSettingChange,
    abortCurrentPrompt,
  } = useLessonGenerator(initialReteachSettings);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setExamImage(file);
  };

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

  const handleAnalyzeScript = async () => {
    if (!examImage && !examText) {
      setAnalysisError("Please upload an image or provide text details.");
      return;
    }
    setAnalysisError("");
    setAnalysisResult(null);

    const promptParts = [
      "Analyze the provided student's test/quiz script. Identify the questions or areas where the student struggled or failed. Extract the student's name and estimate their age group. Develop a concise lesson plan outline focusing on the areas where the student failed. Also, list the specific topics that need reteaching.",
      "You MUST respond in a valid JSON object matching the specified schema.",
    ];

    if (examText) {
      promptParts.push(`\n\nAdditional Context from Educator:\n${examText}`);
    }
    if (examImage) {
      const imagePart = await fileToGenerativePart(examImage);
      promptParts.push(imagePart);
    }

    const analysisJson = await executeAnalysis(promptParts.join(""), {
      responseConstraint: analysisSchema,
    });

    if (analysisJson) {
      const parsed = cleanAndParseJson(analysisJson);
      if (parsed) {
        setAnalysisResult(parsed);
        // CRITICAL STEP: Use the setter from the hook to update the engine's state
        setSettings((prev) => ({
          ...prev,
          studentName: parsed.studentName || "Student",
          ageGroup: parsed.ageGroup,
          prompt: `A lesson to reteach these topics: ${parsed.failedTopics.join(
            ", "
          )}.`,
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

  // Lesson generation logic (same as LessonCreatorPage, just memoizing the prompt differently)
  const lessonSchema = useMemo(
    () => ({
      type: "object",
      properties: {
        title: { type: "string" },
        lesson: {
          type: "array",
          minItems: Number(sceneCount),
          maxItems: Number(sceneCount),
          items: {
            type: "object",
            properties: {
              scene: { type: "number" },
              image_prompt: { type: "string" },
              paragraph: { type: "string" },
            },
            required: ["scene", "image_prompt", "paragraph"],
          },
        },
        quiz: {
          type: "array",
          minItems: Number(sceneCount),
          maxItems: Number(sceneCount),
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                items: { type: "string" },
                minItems: 4,
                maxItems: 4,
              },
              answer: { type: "string" },
            },
            required: ["question", "options", "answer"],
          },
        },
      },
      required: ["title", "lesson", "quiz"],
    }),
    [sceneCount]
  );

  // FULL, COMPLEX PROMPT LOGIC IS RESTORED
  const userRequestPrompt = useMemo(() => {
    let characterInfo = "";
    if (settings.perspective.includes("Immersive")) {
      if (characterMode === "student") {
        characterInfo = `The main character is a student.`;
        if (settings.studentName)
          characterInfo += ` Their name is "${settings.studentName}".`;
        if (studentImageUse === "description") {
          if (studentImageAnalysis.gender)
            characterInfo += ` Their gender is ${studentImageAnalysis.gender}.`;
          if (studentImageAnalysis.ethnicity)
            characterInfo += ` Their ethnicity is ${studentImageAnalysis.ethnicity}.`;
          if (studentImageAnalysis.facialFeatures)
            characterInfo += ` Facial features: ${studentImageAnalysis.facialFeatures}.`;
        } else {
          if (settings.studentGender)
            characterInfo += ` Their gender is ${settings.studentGender}.`;
          if (settings.studentEthnicity)
            characterInfo += ` Their ethnicity is ${settings.studentEthnicity}.`;
        }
        if (settings.studentPersonalFacts)
          characterInfo += ` Here are some personal facts about them: ${settings.studentPersonalFacts}.`;
      } else {
        characterInfo = `The main character is a custom character.`;
        if (customCharacterDescription)
          characterInfo += ` Description: ${customCharacterDescription}.`;
      }
    } else {
      if (mainCharacter.name && mainCharacter.description) {
        characterInfo = `The main character is named ${mainCharacter.name}. Description: ${mainCharacter.description}.`;
      }
    }
    return `Create the content for a JSON object representing a lesson. The lesson MUST have a title, EXACTLY ${sceneCount} lesson scenes, and a quiz with EXACTLY ${sceneCount} questions. Generate the content based on these specifications:
- Topic: ${settings.prompt}
- Format: ${settings.format}
- Visual Style: ${settings.style} for the image prompts.
- Tone: ${settings.tone} for the story paragraphs.
- Target Age Group: ${settings.ageGroup}
- Narrative Perspective: ${settings.perspective}. ${characterInfo}`;
  }, [
    settings,
    sceneCount,
    characterMode,
    studentImageUse,
    studentImageAnalysis,
    customCharacterDescription,
    mainCharacter,
  ]);

  return (
    <div className="page-container">
      {isPreviewVisible && (generatedLesson || lessonWithImages) && (
        <LessonPreview
          lesson={lessonWithImages || generatedLesson}
          lessonSettings={settings}
          onClose={() => setIsPreviewVisible(false)}
          isReteach={true} // Explicitly TRUE for this page
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
          <h3>Upload Student's Work</h3>
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
                The lesson settings have been pre-filled. You can adjust them
                before creating the lesson.
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
            />
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
              handleGenerateImages={handleGenerateImages}
              handlePreview={() => setIsPreviewVisible(true)}
              title="3. Create Reteach Lesson"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ReteachModePage;
