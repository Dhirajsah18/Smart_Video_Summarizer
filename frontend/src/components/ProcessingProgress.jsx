import React from "react";

export default function ProcessingProgress({
  progressStep,
  progressPercent,
  processingStages,
  progressStage,
}) {
  return (
    <div className="py-8">
      <p className="font-semibold text-slate-800 mb-3">{progressStep}</p>
      <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="progress-fill h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-600">
        <span>Processing</span>
        <span>{Math.round(progressPercent)}%</span>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {processingStages.map((stage) => {
          const stageOrder = processingStages.findIndex((item) => item.key === stage.key);
          const activeOrder = processingStages.findIndex((item) => item.key === progressStage);
          const isDone = stageOrder < activeOrder;
          const isActive = stage.key === progressStage;

          return (
            <div
              key={stage.key}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isActive
                  ? "border-amber-400 bg-amber-50 text-amber-900"
                  : isDone
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {stage.label}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-slate-500 mt-4">Keep this tab open while your video is being processed.</p>
    </div>
  );
}
