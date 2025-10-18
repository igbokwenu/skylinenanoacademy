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