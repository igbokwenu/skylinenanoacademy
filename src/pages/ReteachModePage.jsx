//src/pages/ReteachModePage.jsx
import React, { useState, useMemo } from "react";
import { useLanguageModel } from "../hooks/useLanguageModel";
import { useMonitorDownload } from "../hooks/useMonitorDownload";
import LessonPreview from "../components/LessonPreview";
import LessonSettingsPanel from "../components/LessonSettingsPanel";
import GenerationActionsPanel from "../components/GenerationActionsPanel";
import { fileToGenerativePart, imageModel } from "../lib/firebase";
import "./ReteachModePage.css";

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

const ReteachModePage = () => {
  // State for the reteach-specific inputs
  const [examImage, setExamImage] = useState(null);
  const [examText, setExamText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  // State for the lesson creation process (mirrors LessonCreatorPage)
  const [settings, setSettings] = useState({
    prompt: "",
    format: "Storybook",
    style: "Cartoon",
    tone: "Educational",
    ageGroup: "Grades 3-5 (Ages 8-10)",
    perspective: "Immersive (Student is a character)",
    studentName: "",
  });
  const [sceneCount, setSceneCount] = useState(5);
  const [generatedLesson, setGeneratedLesson] = useState(null);
  const [lessonWithImages, setLessonWithImages] = useState(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  const { getMonitor } = useMonitorDownload();

  // Hook for script analysis
  const { isLoading: isAnalyzing, executePrompt: executeAnalysis } =
    useLanguageModel({
      apiName: "LanguageModel",
      creationOptions: {
        expectedInputs: [{ type: "image" }, { type: "text" }],
      },
    });

  // Hook for lesson generation
  const {
    isLoading,
    status,
    output: streamingOutput,
    executePrompt,
    abortCurrentPrompt,
    tokenInfo,
  } = useLanguageModel({
    apiName: "LanguageModel",
  });

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
        // Auto-populate the lesson settings
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

  const userRequestPrompt = useMemo(() => {
    let characterInfo = "";
    if (settings.perspective.includes("Immersive") && settings.studentName) {
      characterInfo = `The main character is the student, named "${settings.studentName}". Make the story about them.`;
    }

    return `
      Create the content for a JSON object representing a lesson.
      The lesson MUST have a title, EXACTLY ${sceneCount} lesson scenes, and a quiz with EXACTLY ${sceneCount} questions.
      
      Generate the content based on these specifications:
      - Topic: ${settings.prompt}
      - Format: ${settings.format}
      - Visual Style: ${settings.style} for the image prompts.
      - Tone: ${settings.tone} for the story paragraphs.
      - Target Age Group: ${settings.ageGroup}
      - Narrative Perspective: ${settings.perspective}. ${characterInfo}
    `;
  }, [settings, sceneCount]);

  const handleCreateLesson = async () => {
    setIsPreviewVisible(false);
    setGeneratedLesson(null);
    setLessonWithImages(null);
    setGenerationError(null);

    const rawAiResult = await executePrompt(
      userRequestPrompt,
      { responseConstraint: lessonSchema },
      getMonitor()
    );

    if (rawAiResult) {
      const parsedLesson = cleanAndParseJson(rawAiResult);
      if (parsedLesson) {
        setGeneratedLesson(parsedLesson);
      } else {
        setGenerationError(
          "The AI failed to generate a valid lesson structure. Please try again."
        );
      }
    } else if (!isLoading) {
      setGenerationError(
        "Lesson generation failed. The model may be offline or the request was aborted."
      );
    }
  };

  const handleGenerateImages = async () => {
    if (!generatedLesson) return;
    setIsGeneratingImages(true);
    setGenerationError(null);
    try {
      const imagePromises = generatedLesson.lesson.map(async (scene) => {
        const textPrompt = `Generate an image in a ${settings.style} style for the following scene: ${scene.image_prompt}`;
        const result = await imageModel.generateContent(textPrompt);
        const response = await result.response;
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
          const imagePart = candidates[0].content.parts.find(
            (p) => p.inlineData
          );
          if (imagePart) {
            return { ...scene, imageData: imagePart.inlineData.data };
          }
        }
        return { ...scene, imageData: null };
      });
      const scenesWithImages = await Promise.all(imagePromises);
      setLessonWithImages({ ...generatedLesson, lesson: scenesWithImages });
      setIsPreviewVisible(true); // Auto-open preview after generating images
    } catch (error) {
      console.error("Image generation failed:", error);
      setGenerationError("An error occurred during image generation.");
    } finally {
      setIsGeneratingImages(false);
    }
  };

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
            // maxLength="500"
            placeholder="Optionally, add more details here. For example, 'The student really struggled with question 5 about long division.' (500 character limit)"
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
