import React from "react";
import ProcessingProgress from "./ProcessingProgress";
import QuestionAnswerPanel from "./QuestionAnswerPanel";

export default function ResultsSection({
  videoPlayerRef,
  previewURL,
  errorMessage,
  loadingSummarize,
  progressStep,
  progressPercent,
  processingStages,
  progressStage,
  summaryHTML,
  handleDownloadTxt,
  handleDownloadPdf,
  handleDownloadDocx,
  suggestedQuestions,
  askVideoQuestion,
  questionInput,
  setQuestionInput,
  loadingQA,
  transcriptSegments,
  qaError,
  qaAnswer,
  qaSources,
  seekVideoTo,
  includeKeyPoints,
  timeKeyPoints,
}) {
  return (
    <div id="results-section" className="mt-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <div className="xl:col-span-1 bg-white/95 backdrop-blur-sm p-4 md:p-5 rounded-2xl shadow-lg border border-slate-200 h-fit">
          <h2 className="text-xl font-semibold mb-4 text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Video Preview
          </h2>
          <video
            id="video-player"
            className="w-full rounded-lg"
            controls
            ref={videoPlayerRef}
            src={previewURL || undefined}
          />
        </div>

        <div className="xl:col-span-2 bg-white/95 backdrop-blur-sm p-5 md:p-6 rounded-2xl shadow-lg border border-slate-200">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Summary
            </h2>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{errorMessage}</div>
          )}

          {loadingSummarize ? (
            <ProcessingProgress
              progressStep={progressStep}
              progressPercent={progressPercent}
              processingStages={processingStages}
              progressStage={progressStage}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  disabled={!summaryHTML}
                >
                  Download TXT
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  disabled={!summaryHTML}
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  disabled={!summaryHTML}
                >
                  Download DOCX
                </button>
              </div>

              <div id="content-text" className="space-y-4 custom-scrollbar" style={{ maxHeight: 260, overflowY: "auto" }}>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {summaryHTML ||
                    "Your paragraph summary will appear here. It will be a concise overview of the video's content."}
                </p>
              </div>

              {summaryHTML && (
                <QuestionAnswerPanel
                  suggestedQuestions={suggestedQuestions}
                  askVideoQuestion={askVideoQuestion}
                  questionInput={questionInput}
                  setQuestionInput={setQuestionInput}
                  loadingQA={loadingQA}
                  transcriptSegments={transcriptSegments}
                  qaError={qaError}
                  qaAnswer={qaAnswer}
                  qaSources={qaSources}
                  seekVideoTo={seekVideoTo}
                />
              )}

              {includeKeyPoints && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Time-Based Key Points
                  </h3>
                  <div className="space-y-2">
                    {timeKeyPoints.length > 0 ? (
                      timeKeyPoints.map((item, idx) => (
                        <div key={`${item.start}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-amber-700 mb-1">
                            <button
                              type="button"
                              onClick={() => seekVideoTo(item.start)}
                              className="rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                              title="Jump video to this point"
                            >
                              {item.start_label || "00:00"} - {item.end_label || "00:00"}
                            </button>
                          </p>
                          <p className="text-sm text-slate-700">{item.point}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Key points will appear after processing.</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Full Transcript
                </h3>
                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                  {transcriptSegments.length > 0 ? (
                    transcriptSegments.map((segment, idx) => (
                      <div key={`${segment.start}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3">
                        <button
                          type="button"
                          onClick={() => seekVideoTo(segment.start)}
                          className="mb-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                          title="Jump video to this timestamp"
                        >
                          {segment.start_label || "00:00"} - {segment.end_label || "00:00"}
                        </button>
                        <p className="text-sm text-slate-700">{segment.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Transcript will appear here after processing.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
