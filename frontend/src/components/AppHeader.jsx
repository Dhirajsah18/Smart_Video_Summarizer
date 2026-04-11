import React from "react";

export default function AppHeader() {
  return (
    <header className="text-center mb-8 md:mb-10">
      <h1
        className="mt-4 text-3xl md:text-5xl font-bold text-slate-900 tracking-tight"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        AI Video Summarizer
      </h1>
      <p className="text-slate-700 mt-3 text-sm md:text-base max-w-2xl mx-auto">
        Convert long videos into crisp summaries with multilingual transcription and translation support.
      </p>
    </header>
  );
}
