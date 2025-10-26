// src/components/DebugPanel.jsx

import React, { useState } from "react";

const DebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const checkQuotas = async () => {
    setIsLoading(true);
    setDebugInfo("Checking API quotas...");
    try {
      const quotas = {};
      if (self.LanguageModel) {
        const lm = await self.LanguageModel.create();
        quotas.LanguageModel = lm.inputQuota;
        lm.destroy();
      }
      if (self.Summarizer) {
        const sm = await self.Summarizer.create();
        quotas.Summarizer = sm.inputQuota;
        sm.destroy();
      }
      if (self.Rewriter) {
        const rw = await self.Rewriter.create();
        quotas.Rewriter = rw.inputQuota;
        rw.destroy();
      }
      if (self.Writer) {
        const wr = await self.Writer.create();
        quotas.Writer = wr.inputQuota;
        wr.destroy();
      }
      setDebugInfo(JSON.stringify(quotas, null, 2));
    } catch (error) {
      setDebugInfo(`Error checking quotas: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // This component will only render in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      style={{
        margin: "20px 0",
        padding: "15px",
        border: "2px dashed #ffc107",
        background: "#fffbeb",
        borderRadius: "8px",
      }}
    >
      <h4>Debug Info (Dev Mode Only)</h4>
      <button onClick={checkQuotas} disabled={isLoading}>
        {isLoading ? "Checking..." : "Check API Context Quotas"}
      </button>
      {debugInfo && (
        <pre style={{ marginTop: "10px", whiteSpace: "pre-wrap" }}>
          {debugInfo}
        </pre>
      )}
    </div>
  );
};

export default DebugPanel;
