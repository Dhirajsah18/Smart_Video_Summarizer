import React from "react";

export default function UploadSection({
  uploadBoxRef,
  videoUploadRef,
  fileName,
  summaryLength,
  setSummaryLength,
  summaryStyle,
  setSummaryStyle,
  outputLanguage,
  setOutputLanguage,
  sourceLanguage,
  setSourceLanguage,
  includeKeyPoints,
  setIncludeKeyPoints,
  includeSpeakerDiarization,
  setIncludeSpeakerDiarization,
  file,
  handleBrowseClick,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onSummarizeClick,
}) {
  return (
    <div
      id="upload-section"
      className="bg-white/95 backdrop-blur-sm p-5 md:p-8 rounded-2xl shadow-lg border border-slate-200"
    >
      <h2 className="text-xl font-semibold mb-4 text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        1. Start Here
      </h2>
      <div
        id="upload-box"
        ref={uploadBoxRef}
        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors"
        onClick={handleBrowseClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          id="video-upload"
          ref={videoUploadRef}
          className="hidden"
          accept="video/*"
          onChange={onFileChange}
        />
        <div className="flex flex-col items-center">
          <svg
            className="w-12 h-12 text-slate-400 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="font-semibold text-slate-700">Click to browse or drag & drop your video file</p>
          <p id="file-name" className="text-sm text-slate-500 mt-1">
            {fileName}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold text-slate-800 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          2. Configure Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label htmlFor="summary-length" className="block text-sm font-medium text-slate-600 mb-1">
              Summary Length
            </label>
            <select
              id="summary-length"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={summaryLength}
              onChange={(e) => setSummaryLength(e.target.value)}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Detailed</option>
            </select>
          </div>
          <div>
            <label htmlFor="summary-style" className="block text-sm font-medium text-slate-600 mb-1">
              Summary Style
            </label>
            <select
              id="summary-style"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={summaryStyle}
              onChange={(e) => setSummaryStyle(e.target.value)}
            >
              <option value="general">General</option>
              <option value="business">Business-focused</option>
              <option value="student">Student-focused</option>
              <option value="casual">Casual</option>
            </select>
          </div>
          <div>
            <label htmlFor="output-language" className="block text-sm font-medium text-slate-600 mb-1">
              Summary Language
            </label>
            <select
              id="output-language"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={outputLanguage}
              onChange={(e) => setOutputLanguage(e.target.value)}
            >
              <option value="english">English (translate if needed)</option>
              <option value="original">Original spoken language</option>
            </select>
          </div>
          <div>
            <label htmlFor="source-language" className="block text-sm font-medium text-slate-600 mb-1">
              Video Speech Language
            </label>
            <select
              id="source-language"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
            >
              <option value="auto">Auto detect</option>
              <option value="hinglish">Hinglish</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="bn">Bengali</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="mr">Marathi</option>
              <option value="gu">Gujarati</option>
              <option value="kn">Kannada</option>
              <option value="ml">Malayalam</option>
              <option value="pa">Punjabi</option>
              <option value="ur">Urdu</option>
              <option value="or">Odia</option>
              <option value="as">Assamese</option>
            </select>
          </div>
        </div>
        <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            checked={includeKeyPoints}
            onChange={(e) => setIncludeKeyPoints(e.target.checked)}
          />
          Generate time-based key points (slightly slower)
        </label>
        <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            checked={includeSpeakerDiarization}
            onChange={(e) => setIncludeSpeakerDiarization(e.target.checked)}
          />
          Detect speaker turns (diarization)
        </label>
      </div>

      <div className="mt-6 text-center md:text-right">
        <button
          id="summarize-btn"
          className={`bg-slate-900 text-white font-bold py-3 px-8 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-all shadow-md ${
            !file ? "disabled:bg-slate-400 disabled:text-white disabled:cursor-not-allowed" : ""
          }`}
          disabled={!file}
          onClick={onSummarizeClick}
        >
          Summarize Video
        </button>
      </div>
    </div>
  );
}
