// //src/components/FirebaseAi.jsx
// import React, { useState, useEffect, useRef } from "react";
// import {
//    cloudTextModel, // No longer a generic 'getModel'
//   cloudImageModel as imageModel, // Aliased for consistency
//   isNanoSupported,
//   fileToGenerativePart,
// } from "../lib/firebase";

// function FirebaseAi() {
//   const [onDeviceStatus, setOnDeviceStatus] = useState("checking...");
//   const [jokeResponse, setJokeResponse] = useState("");
//   const [jokeSource, setJokeSource] = useState("N/A");
//   const [poemResponse, setPoemResponse] = useState("");
//   const [poemSource, setPoemSource] = useState("N/A");
//   const [file, setFile] = useState(null);
//   const [imagePrompt, setImagePrompt] = useState("");
//   const [generatedImage, setGeneratedImage] = useState("");
//   const [imageSource, setImageSource] = useState("N/A");
//   const [isStreaming, setIsStreaming] = useState(false);
//   const abortControllerRef = useRef(null);

//   useEffect(() => {
//     async function checkOnDeviceStatus() {
//       const source = await getSource();
//       setOnDeviceStatus(
//         source === "Built-in AI" ? "available" : "not available"
//       );
//     }
//     checkOnDeviceStatus();
//   }, []);

//   const handleJokeClick = async () => {
//     setJokeResponse("");
//     setJokeSource(await getSource());
//     const prompt = "Tell me a long joke";
//     abortControllerRef.current = new AbortController();
//     setIsStreaming(true);
//     try {
//       const model = await getModel();
//       const result = await model.generateContentStream(prompt, {
//         signal: abortControllerRef.current.signal,
//       });
//       for await (const chunk of result.stream) {
//         const chunkText = chunk.text();
//         setJokeResponse((prev) => prev + chunkText);
//       }
//     } catch (err) {
//       if (err.name === "AbortError") {
//         setJokeResponse("Joke generation stopped.");
//       } else {
//         console.error(err.name, err.message);
//         setJokeResponse(`Error: ${err.message}`);
//       }
//     } finally {
//       setIsStreaming(false);
//       abortControllerRef.current = null;
//     }
//   };

//   const handleFileChange = (e) => {
//     setFile(e.target.files[0]);
//   };

//   const handlePoemClick = async () => {
//     if (!file) {
//       alert("Please select a file first.");
//       return;
//     }
//     setPoemResponse("");
//     setPoemSource(await getSource());
//     const prompt = "Write a poem on this picture";
//     const imagePart = await fileToGenerativePart(file);
//     abortControllerRef.current = new AbortController();
//     setIsStreaming(true);
//     try {
//       const model = await getModel();
//       const result = await model.generateContentStream([prompt, imagePart], {
//         signal: abortControllerRef.current.signal,
//       });
//       for await (const chunk of result.stream) {
//         const chunkText = chunk.text();
//         setPoemResponse((prev) => prev + chunkText);
//       }
//     } catch (err) {
//       if (err.name === "AbortError") {
//         setPoemResponse("Poem generation stopped.");
//       } else {
//         console.error(err.name, err.message);
//         setPoemResponse(`Error: ${err.message}`);
//       }
//     } finally {
//       setIsStreaming(false);
//       abortControllerRef.current = null;
//     }
//   };

//   const handleImageGeneration = async () => {
//     if (!imagePrompt) {
//       alert("Please enter a prompt for image generation.");

//       return;
//     }

//     setGeneratedImage("");

//     setImageSource("Cloud AI");

//     try {
//       const result = await imageModel.generateContent(imagePrompt);

//       const response = await result.response;

//       console.log("Image generation response:", response);

//       const candidates = response.candidates;

//       if (candidates && candidates.length > 0) {
//         const imagePart = candidates[0].content.parts.find(
//           (part) => part.inlineData
//         );

//         if (imagePart) {
//           setGeneratedImage(imagePart.inlineData.data);
//         } else {
//           setGeneratedImage(
//             `Error: No image generated. Full response: ${JSON.stringify(
//               response,
//               null,
//               2
//             )}`
//           );
//         }
//       } else {
//         setGeneratedImage(
//           `Error: No image generated. Full response: ${JSON.stringify(
//             response,
//             null,
//             2
//           )}`
//         );
//       }
//     } catch (err) {
//       console.error(err.name, err.message);

//       setGeneratedImage(`Error: ${err.message}`);
//     }
//   };

//   const handleImageDownload = () => {
//     const link = document.createElement("a");
//     link.href = `data:image/png;base64,${generatedImage}`;
//     link.download = "generated_image.png";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   const handleStop = () => {
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort();
//     }
//   };

//   return (
//     <div>
//       <h1>Firebase AI Logic</h1>
//       <p>On-device AI status: {onDeviceStatus}</p>

//       <h2>Textual prompt</h2>
//       <div>
//         <button onClick={handleJokeClick} disabled={isStreaming}>
//           Tell me a joke
//         </button>
//         <button onClick={handleStop} disabled={!isStreaming}>
//           Stop
//         </button>
//         <br />
//         <small>
//           Response from: <span>{jokeSource}</span>
//         </small>
//         <pre style={{ whiteSpace: "pre-wrap" }}>{jokeResponse}</pre>
//       </div>

//       <h2>Multimodal prompt</h2>
//       <div>
//         <p>Write a poem on this picture:</p>
//         <input type="file" onChange={handleFileChange} accept="image/*" />
//         <button onClick={handlePoemClick} disabled={!file || isStreaming}>
//           Generate Poem
//         </button>
//         <button onClick={handleStop} disabled={!isStreaming}>
//           Stop
//         </button>
//         <br />
//         <small>
//           Response from: <span>{poemSource}</span>
//         </small>
//         <pre style={{ whiteSpace: "pre-wrap" }}>{poemResponse}</pre>
//       </div>

//       <h2>Image Generation</h2>
//       <div>
//         <input
//           type="text"
//           value={imagePrompt}
//           onChange={(e) => setImagePrompt(e.target.value)}
//           placeholder="Enter a prompt for image generation"
//         />
//         <button onClick={handleImageGeneration}>Generate Image</button>
//         <br />
//         <small>
//           Response from: <span>{imageSource}</span>
//         </small>
//         {generatedImage && (
//           <div>
//             {generatedImage.startsWith("Error:") ? (
//               <pre style={{ whiteSpace: "pre-wrap" }}>{generatedImage}</pre>
//             ) : (
//               <>
//                 <img
//                   src={`data:image/png;base64,${generatedImage}`}
//                   alt="Generated"
//                 />
//                 <button onClick={handleImageDownload}>Download Image</button>
//               </>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default FirebaseAi;
