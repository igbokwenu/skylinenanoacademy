// src/pages/LessonCreatorPage.jsx

import React, { useState, useMemo } from 'react';
import { useLanguageModel } from '../hooks/useLanguageModel';
import { useMonitorDownload } from '../hooks/useMonitorDownload';
import LessonPreview from '../components/LessonPreview';
import lessonCreatorIcon from '../assets/skyline_nano_academy.png';

// --- Configuration (Unchanged) ---
const lessonParams = {
  formats: ['Manga', 'Storybook', 'Comic Book', 'Science Journal'],
  styles: ['Cartoon', 'Photorealistic', '3D Animation', 'Anime', 'Watercolor'],
  tones: ['Educational', 'Funny', 'Suspenseful', 'Dramatic', 'Mysterious'],
  ageGroups: ['Grades 1-2 (Ages 6-7)', 'Grades 3-5 (Ages 8-10)', 'Grades 6-8 (Ages 11-13)', 'Grades 9-12 (Ages 14-18)'],
  perspectives: ['Third Person', 'First Person', 'Immersive (Student is a character)']
};
const examplePrompts = [
    'Create a lesson about how red blood cells carry oxygen through the body.',
    'Explain the process of photosynthesis in a magical forest.',
    'Create a detective story where students solve a mystery using the scientific method.',
    'Tell a story about the water cycle from the perspective of a single drop of water.',
];

// --- Schema (Unchanged, this will now be used as a hard constraint) ---
const lessonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    lesson: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          scene: { type: "number" },
          image_prompt: { type: "string" },
          paragraph: { type: "string" }
        },
        required: ["scene", "image_prompt", "paragraph"]
      }
    },
    quiz: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
          answer: { type: "string" }
        },
        required: ["question", "options", "answer"]
      }
    }
  },
  required: ["title", "lesson", "quiz"]
};

// FINAL FIX 1: The parser bug is corrected. It now properly extracts the captured group.
const cleanAndParseJson = (rawString) => {
  if (!rawString || typeof rawString !== 'string') return null;
  
  const match = rawString.match(/```json\s*([\s\S]*?)\s*```/);
  // The clean JSON is in the first captured group (match[1]), not the full match.
  const jsonContent = match ? match[1] : rawString;

  try {
    // This is now a failsafe. The responseConstraint should make this unnecessary.
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error("Final parsing attempt failed:", error);
    return null;
  }
};


const LessonCreatorPage = () => {
  const [settings, setSettings] = useState({
    prompt: examplePrompts[1],
    format: lessonParams.formats[1],
    style: lessonParams.styles[0],
    tone: lessonParams.tones[1],
    ageGroup: lessonParams.ageGroups[1],
    perspective: lessonParams.perspectives[0],
    studentName: '',
    studentGender: '',
    studentEthnicity: '',
    studentPersonalFacts: ''
  });
  // NEW: State for adjustable scene count
  const [sceneCount, setSceneCount] = useState(5); 
  const [generatedLesson, setGeneratedLesson] = useState(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [isStreamVisible, setIsStreamVisible] = useState(false);

  const { getMonitor } = useMonitorDownload();
  const { 
    isLoading, status, output: streamingOutput,
    executePrompt, abortCurrentPrompt, tokenInfo
  } = useLanguageModel({ apiName: 'LanguageModel' });

  // FEATURE UPDATE: The schema is now dynamic based on sceneCount.
  const lessonSchema = useMemo(() => ({
    type: "object",
    properties: {
      title: { type: "string" },
      lesson: {
        type: "array",
        minItems: Number(sceneCount),
        maxItems: Number(sceneCount),
        items: {
          type: "object",
          properties: { scene: { type: "number" }, image_prompt: { type: "string" }, paragraph: { type: "string" } },
          required: ["scene", "image_prompt", "paragraph"]
        }
      },
      quiz: {
        type: "array",
        minItems: Number(sceneCount),
        maxItems: Number(sceneCount),
        items: {
          type: "object",
          properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 }, answer: { type: "string" } },
          required: ["question", "options", "answer"]
        }
      }
    },
    required: ["title", "lesson", "quiz"]
  }), [sceneCount]); // Re-generate the schema whenever sceneCount changes.


  // FEATURE UPDATE: The prompt now includes the dynamic sceneCount.
  const userRequestPrompt = useMemo(() => {
    let studentInfo = '';
    if (settings.perspective.includes('Immersive')) {
      studentInfo = `The main character is a student.`;
      if (settings.studentName) {
        studentInfo += ` Their name is "${settings.studentName}".`;
      }
      if (settings.studentGender) {
        studentInfo += ` Their gender is ${settings.studentGender}.`;
      }
      if (settings.studentEthnicity) {
        studentInfo += ` Their ethnicity is ${settings.studentEthnicity}.`;
      }
      if (settings.studentPersonalFacts) {
        studentInfo += ` Here are some personal facts about them: ${settings.studentPersonalFacts}.`;
      }
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
      - Narrative Perspective: ${settings.perspective}. ${studentInfo}

      For each of the ${sceneCount} scenes, create a detailed 'image_prompt' and a 'paragraph'.
      For each of the ${sceneCount} quiz questions, create a 'question', 4 'options', and an 'answer'.
    `;
  }, [settings, sceneCount]); // Re-generate the prompt if settings or sceneCount change.

  const handleCreateLesson = async () => {
    setIsPreviewVisible(false);
    setGeneratedLesson(null);
    setGenerationError(null);
    
    const rawAiResult = await executePrompt(
        userRequestPrompt, 
        { responseConstraint: lessonSchema },
        getMonitor()
    );

    if (rawAiResult) {
      console.log("--- Raw AI Tool Output Log ---");
      console.log(rawAiResult);
      console.log("----------------------------");
      const parsedLesson = cleanAndParseJson(rawAiResult);
      if (parsedLesson) {
        setGeneratedLesson(parsedLesson);
      } else {
        setGenerationError("The AI failed to generate a response. This could be due to a network issue or an internal model error. Please try again.");
      }
    } else if (!isLoading) {
        setGenerationError("Lesson generation failed. The model may be offline or the request was aborted.");
    }
  };
  
  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    // The JSX for the component remains unchanged. The fixes are in the logic.
    <div className="lesson-creator-container">
      {isPreviewVisible && generatedLesson && (
        <LessonPreview lesson={generatedLesson} onClose={() => setIsPreviewVisible(false)} />
      )}
      <div className="lc-header">
        <img src={lessonCreatorIcon} alt="Lesson Creator" className="lc-header-icon" />
        <h1>Lesson Creator</h1>
        <p>Design engaging, story-driven lessons tailored to your students' needs.</p>
      </div>
      <div className="lc-main">
        <div className="lc-settings-panel">
          <h3>1. Describe Your Lesson</h3>
          <textarea name="prompt" value={settings.prompt} onChange={handleSettingChange} rows="4" placeholder="e.g., Create a lesson about the solar system..." />
          <div className="example-prompts">
            <strong>Or try an example:</strong>
            {examplePrompts.map(p => (
              <button key={p} className="example-prompt-btn" onClick={() => setSettings(s => ({ ...s, prompt: p }))}>
                {p.substring(0, 35)}...
              </button>
            ))}
          </div>
          <h3>2. Customize the Experience</h3>
          <div className="settings-grid">
            {Object.entries(lessonParams).map(([key, values]) => (
               <div className="setting-item" key={key}>
                  <label htmlFor={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                  <select name={key.replace(/s$/, '')} id={key} value={settings[key.replace(/s$/, '')] || ''} onChange={handleSettingChange}>
                    {values.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
               </div>
            ))}
            {settings.perspective.includes('Immersive') && (
              <>
                <div className="setting-item student-name-input">
                  <label htmlFor="studentName">Student's Name</label>
                  <input type="text" id="studentName" name="studentName" value={settings.studentName} onChange={handleSettingChange} placeholder="Enter name for immersive story" />
                </div>
                <div className="immersive-grid">
                  <div className="setting-item">
                    <label htmlFor="studentGender">Student's Gender</label>
                    <select id="studentGender" name="studentGender" value={settings.studentGender} onChange={handleSettingChange}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label htmlFor="studentEthnicity">Student's Ethnicity</label>
                    <select id="studentEthnicity" name="studentEthnicity" value={settings.studentEthnicity} onChange={handleSettingChange}>
                      <option value="">Select Ethnicity</option>
                      <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                      <option value="Asian">Asian</option>
                      <option value="Black or African American">Black or African American</option>
                      <option value="Hispanic or Latino">Hispanic or Latino</option>
                      <option value="Middle Eastern or North African (MENA)">Middle Eastern or North African (MENA)</option>
                      <option value="Native Hawaiian or Pacific Islander">Native Hawaiian or Pacific Islander</option>
                      <option value="White">White</option>
                    </select>
                  </div>
                </div>
                <div className="setting-item student-name-input">
                  <label htmlFor="studentPersonalFacts">Personal Facts</label>
                  <textarea id="studentPersonalFacts" name="studentPersonalFacts" value={settings.studentPersonalFacts} onChange={handleSettingChange} maxLength="180" placeholder="You can input other interesting or personal facts to further personalize the lesson. (max 180 characters)"></textarea>
                </div>
              </>
            )}
                        {/* NEW: Slider for Scene/Quiz Count */}
            <div className="setting-item scene-count-slider">
              <label htmlFor="sceneCount">Scenes & Quizzes: <strong>{sceneCount}</strong></label>
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
                 {generatedLesson && !isLoading && (
            <div className="preview-ready" style={{ textAlign: 'center' }}>
              <h4>Your lesson is ready!</h4>
              <p>"{generatedLesson.title}"</p>
              <button className="preview-btn" onClick={() => setIsPreviewVisible(true)}>
                Preview Lesson
              </button>
            </div>
          )}
        </div>
        <div className="lc-actions-panel">
          <h3>3. Generate & Preview</h3>
          <p>The AI will generate your lesson below. When complete, a "Preview" button will appear.</p>
          <div className="button-group" style={{flexDirection: 'column'}}>
            <button className="generate-btn" onClick={handleCreateLesson} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Create Lesson'}
            </button>
            {isLoading && <button className="abort-btn" onClick={abortCurrentPrompt}>Abort</button>}
          </div>
          <div className="api-status-details">
            <strong>Status:</strong> {status} <br />
            <strong>{tokenInfo}</strong>
          </div>
          {generationError && (
            <div className="error-message">
              <strong>Generation Failed</strong>
              <p>{generationError}</p>
            </div>
          )}
                    {streamingOutput && (
            <div className="collapsible-stream">
              <button onClick={() => setIsStreamVisible(!isStreamVisible)} className="stream-toggle-btn">
                {isStreamVisible ? 'Hide Stream' : 'Click to view stream'}
              </button>
              {isStreamVisible && <pre className='output'>{streamingOutput}</pre>}
            </div>
          )}
          {generatedLesson && !isLoading && (
            <div className="preview-ready">
              <h4>Your lesson is ready!</h4>
              <p>"{generatedLesson.title}"</p>
              <button className="preview-btn" onClick={() => setIsPreviewVisible(true)}>
                Preview Lesson
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonCreatorPage;