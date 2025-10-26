# React + Vite

chrome://on-device-internals/

npm run dev

http://localhost:5173/

https://skylinenanoacademy.web.app/


//Installing/Updating and debugging gemini CLI:
npm install -g @google/gemini-cli

//If something goes wrong like ENOTEMPTY(The path will be in the error so you might need to copy and paste)
rm -rf /Users/increase/.nvm/versions/node/v22.12.0/lib/node_modules/@google/gemini-cli && npm cache clean --force && npm install -g @google/gemini-cli

npm run build
firebase deploy --only hosting
//Deploying the app this command will run a script that builds the app and deploys it to Firebase Hosting:
npm run deploy

//Uninstall flutter gemini cli extension:
$ gemini extensions uninstall https://github.com/gemini-cli-extensions/flutter



Give me a robust implementation and just show me the parts of the code I need to change to implement this with the full code to replace it with some sort of start here, finish here marker.




dump:
// src/pages/HomePage.jsx

import React from 'react';
import PromptApi from '../components/PromptApi';
import WriterApi from '../components/WriterApi';
import RewriterApi from '../components/RewriterApi';
import ProofreaderApi from '../components/ProofreaderApi';
import SummarizerApi from '../components/SummarizerApi';

const HomePage = () => {
  return (
    <>
      <PromptApi />
      <WriterApi />
      <RewriterApi />
      <ProofreaderApi />
      <SummarizerApi />
    </>
  );
};

export default HomePage;