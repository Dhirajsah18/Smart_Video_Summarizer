import React from "react";

export default function QuestionAnswerPanel({
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
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Ask About This Video
          </h3>
          <p className="text-sm text-slate-600">Would you like to know more about this topic?</p>
        </div>
        <p className="text-xs font-medium text-slate-500">Grounded answers from transcript evidence</p>
      </div>

      {suggestedQuestions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => askVideoQuestion(question)}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-slate-900"
            >
              {question}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          value={questionInput}
          onChange={(e) => setQuestionInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              askVideoQuestion();
            }
          }}
          placeholder="Ask something based on the transcript"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-500"
        />
        <button
          type="button"
          onClick={() => askVideoQuestion()}
          disabled={loadingQA || !transcriptSegments.length}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loadingQA ? "Thinking..." : "Ask"}
        </button>
      </div>

      {qaError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {qaError}
        </div>
      )}

      {qaAnswer && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Answer</p>
            <p className="mt-2 text-sm leading-7 text-slate-700 whitespace-pre-line">{qaAnswer}</p>
          </div>

          {qaSources.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Transcript Sources
              </p>
              <div className="space-y-2">
                {qaSources.map((source, idx) => (
                  <div key={`${source.start}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
                    <button
                      type="button"
                      onClick={() => seekVideoTo(source.start)}
                      className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      {source.start_label || "00:00"} - {source.end_label || "00:00"}
                    </button>
                    <p className="mt-2 text-sm text-slate-600">{source.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
