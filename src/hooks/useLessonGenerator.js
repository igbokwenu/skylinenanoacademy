//src/hooks/useLessonGenerator.js
import { useState, useMemo } from "react";
import { useLanguageModel } from "./useLanguageModel";
import { useMonitorDownload } from "./useMonitorDownload";
import { cloudImageModel as imageModel, fileToGenerativePart } from "../lib/firebase";

const ageGroupToPromptMap = {
"Grades 1-2 (Ages 6-7)": "a 6-7 year old child",
"Grades 3-5 (Ages 8-10)": "an 8-10 year old child",
"Grades 6-8 (Ages 11-13)": "an 11-13 year old adolescent",
"Grades 9-12 (Ages 14-18)": "a 14-18 year old teenager",
"Undergraduate (Ages 18-22)": "an 18-22 year old undergraduate student",
"Graduate (Ages 23-26)": "a 23-26 year old graduate student",
"Postgraduate/Doctoral (Ages 27+)": "a 27+ year old postgraduate or doctoral researcher",
};

const cleanAndParseJson = (rawString) => {
  if (!rawString || typeof rawString !== "string") return null;
  const match = rawString.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonContent = match ? match[1] : rawString;
  try {
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error("Final parsing attempt failed:", error);
    return null;
  }
};

export const useLessonGenerator = (initialSettings) => {
  // All state is now managed inside the hook
  const [settings, setSettings] = useState(initialSettings);
  const [sceneCount, setSceneCount] = useState(5);
  const [generatedLesson, setGeneratedLesson] = useState(null);
  const [lessonWithImages, setLessonWithImages] = useState(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [characterMode, setCharacterMode] = useState("student");
  const [customCharacterImage, setCustomCharacterImage] = useState(null);
  const [customCharacterDescription, setCustomCharacterDescription] =
    useState("");
  const [customCharacterImageUse, setCustomCharacterImageUse] =
    useState("direct");
  const [studentImage, setStudentImage] = useState(null);
  const [studentImageAnalysis, setStudentImageAnalysis] = useState({
    gender: "",
    ethnicity: "",
    facialFeatures: "",
  });
  const [studentImageUse, setStudentImageUse] = useState("description");
  const [mainCharacter, setMainCharacter] = useState({
    name: "",
    description: "",
  });

  const { getMonitor } = useMonitorDownload();
  const {
    isLoading,
    status,
    output: streamingOutput,
    executePrompt,
    abortCurrentPrompt,
    tokenInfo,
  } = useLanguageModel({
    apiName: "LanguageModel",
    creationOptions: { expectedInputs: [{ type: "image" }, { type: "text" }] },
  });
  const { isLoading: isAnalysisLoading, executePrompt: executeImageAnalysis } =
    useLanguageModel({
      apiName: "LanguageModel",
      creationOptions: {
        expectedInputs: [{ type: "image" }, { type: "text" }],
      },
    });

  // All logic (schemas, prompts, handlers) is also inside the hook
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
  const handleCreateLesson = async () => {
    setLessonWithImages(null);
    setGeneratedLesson(null);
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
    if (!generatedLesson) return false; // Return false if no lesson
    setIsGeneratingImages(true);
    setGenerationError(null);

    const isImmersiveDirect =
      settings.perspective.includes("Immersive") &&
      ((characterMode === "student" &&
        studentImage &&
        studentImageUse === "direct") ||
        (characterMode === "custom" &&
          customCharacterImage &&
          customCharacterImageUse === "direct"));

    const characterImage =
      characterMode === "student" ? studentImage : customCharacterImage;
    const ageDescription = ageGroupToPromptMap[settings.ageGroup] || "a person";

    try {
      const imagePromises = generatedLesson.lesson.map(async (scene) => {
        let textPrompt = "";
        let generationContent = [];

        if (isImmersiveDirect && characterImage) {
          textPrompt = `The main character is named ${
            settings.studentName || "the student"
          }. If the main character appears in the following scene, they MUST have the facial features and likeness of the person in the provided image. The scene is: \"${
            scene.image_prompt
          }\". Ensure any character portrayed is ${ageDescription}. The overall style should be ${
            settings.style
          }.`;
          const imagePart = await fileToGenerativePart(characterImage);
          generationContent = [textPrompt, imagePart];
        } else {
          let characterDescription = "";
          if (settings.perspective.includes("Immersive")) {
            if (
              characterMode === "student" &&
              studentImageAnalysis.facialFeatures
            ) {
              characterDescription = `The main character is named ${
                settings.studentName || "the student"
              }. If the main character is in the scene, they MUST have these features: ${
                studentImageAnalysis.facialFeatures
              }. `;
            } else if (
              characterMode === "custom" &&
              customCharacterDescription
            ) {
              characterDescription = `The main character is a custom character. If the main character is in the scene, they are described as: ${customCharacterDescription}. `;
            }
          } else {
            if (mainCharacter.name && mainCharacter.description) {
              characterDescription = `There is a main character named ${mainCharacter.name}. If this character appears in the scene, they MUST be drawn according to this detailed description: "${mainCharacter.description}". `;
            }
          }
          textPrompt = `${characterDescription}Generate an image for the following scene: ${scene.image_prompt}. The overall style should be ${settings.style}. If a character is portrayed, they should match the age of ${ageDescription}.`;
          generationContent = [textPrompt];
        }

        const result = await imageModel.generateContent({
          contents: [
            {
              parts: generationContent.map((content) =>
                typeof content === "string" ? { text: content } : content
              ),
            },
          ],
        });
        const response = await result.response;
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
          const imagePart = candidates[0].content.parts.find(
            (p) => p.inlineData
          );
          if (imagePart)
            return { ...scene, imageData: imagePart.inlineData.data };
        }
        return { ...scene, imageData: null };
      });
      const scenesWithImages = await Promise.all(imagePromises);
      setLessonWithImages({ ...generatedLesson, lesson: scenesWithImages });
      return true; // Return true on success
    } catch (error) {
      console.error("Batch image generation failed:", error);
      setGenerationError(
        "An error occurred during image generation. Please try again."
      );
      return false; // Return false on failure
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleStudentImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStudentImage(file);

    const prompt = [
      {
        role: "user",
        content: [
          { type: "image", value: file },
          {
            type: "text",
            value:
              'Analyze the person in this image. Strictly describe only their facial and head features (like eye shape and color, nose, mouth, jawline, hair style and color, freckles, glasses, etc.), gender, and ethnicity. **Crucially, do NOT describe their clothing, non-facial accessories, or the background.** For the ethnicity, choose one: "American Indian or Alaska Native", "Asian", "Black or African American", "White", "Hispanic or Latino", "Middle Eastern or North African (MENA)", "Native Hawaiian or Pacific Islander". Respond in JSON format with keys: "gender", "ethnicity", "facialFeatures".',
          },
        ],
      },
    ];
    const jsonSchema = {
      type: "object",
      properties: {
        gender: { type: "string" },
        ethnicity: { type: "string" },
        facialFeatures: { type: "string" },
      },
      required: ["gender", "ethnicity", "facialFeatures"],
    };

    const result = await executeImageAnalysis(prompt, {
      responseConstraint: { schema: jsonSchema },
    });
    if (result) {
      const parsedResult = cleanAndParseJson(result);
      if (parsedResult) {
        setStudentImageAnalysis(parsedResult);
        setSettings((prev) => ({
          ...prev,
          studentGender: parsedResult.gender,
          studentEthnicity: parsedResult.ethnicity,
        }));
      }
    }
  };

  const handleCustomCharacterImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setCustomCharacterImage(file);
  };

  const handleGenerateCustomCharacterDescription = async () => {
    if (!customCharacterImage) return;
    const result = await executeImageAnalysis([
      {
        role: "user",
        content: [
          { type: "image", value: customCharacterImage },
          { type: "text", value: "Describe the character in this image." },
        ],
      },
    ]);
    if (result) setCustomCharacterDescription(result);
  };

  const handleGenerateCharacter = async () => {
    const prompt = `Based on the lesson topic "${settings.prompt}", create a main character with a name and a detailed visual description suitable for consistent image generation. Respond in JSON format with the keys: "name", "description".`;
    const jsonSchema = {
      type: "object",
      properties: { name: { type: "string" }, description: { type: "string" } },
      required: ["name", "description"],
    };
    const result = await executeImageAnalysis(
      [{ role: "user", content: [{ type: "text", value: prompt }] }],
      { responseConstraint: { schema: jsonSchema } }
    );
    if (result) {
      const parsedResult = cleanAndParseJson(result);

      if (parsedResult) {
        // Only update the state if parsing was successful.
        // Also, use nullish coalescing (??) as a failsafe in case the AI
        // returns a valid JSON but omits a key. This guarantees the properties
        // are always defined strings.
        setMainCharacter({
          name: parsedResult.name ?? "",
          description: parsedResult.description ?? "",
        });
      }
    }
  };

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  // The hook returns all the state and functions the components will need
  return {
    // State and Setters
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

    // Handlers
    handleCreateLesson,
    handleGenerateImages,
    handleStudentImageUpload,
    handleCustomCharacterImageUpload,
    handleGenerateCustomCharacterDescription,
    handleGenerateCharacter,
    handleSettingChange,
    abortCurrentPrompt,
  };
};
