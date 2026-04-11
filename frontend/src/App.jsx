import React, { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import api from "./api";
import AppHeader from "./components/AppHeader";
import UploadSection from "./components/UploadSection";
import ResultsSection from "./components/ResultsSection";

const processingStages = [
  { key: "uploading", label: "Uploading Video" },
  { key: "moderating", label: "Checking Content Safety" },
  { key: "extracting", label: "Extracting Audio" },
  { key: "transcribing", label: "Transcribing Speech" },
  { key: "summarizing", label: "Generating Summary" },
];

export default function App() {
  const uploadBoxRef = useRef(null);
  const videoUploadRef = useRef(null);
  const videoPlayerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");
  const [previewURL, setPreviewURL] = useState(null);

  const [showResults, setShowResults] = useState(false);
  const [summaryHTML, setSummaryHTML] = useState(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState([]);
  const [timeKeyPoints, setTimeKeyPoints] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [questionInput, setQuestionInput] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaSources, setQaSources] = useState([]);
  const [qaError, setQaError] = useState("");
  const [loadingQA, setLoadingQA] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [summaryLength, setSummaryLength] = useState("medium");
  const [summaryStyle, setSummaryStyle] = useState("general");
  const [outputLanguage, setOutputLanguage] = useState("english");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [includeKeyPoints, setIncludeKeyPoints] = useState(true);
  const [loadingSummarize, setLoadingSummarize] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStep, setProgressStep] = useState("Waiting to start");
  const [progressStage, setProgressStage] = useState("uploading");

  useEffect(() => {
    const videoElement = videoPlayerRef.current;

    return () => {
      if (videoElement && videoElement.src) {
        try {
          URL.revokeObjectURL(videoElement.src);
        } catch (e) {
          console.error("Error revoking object URL:", e);
        }
      }
    };
  }, []);

  useEffect(() => {
    const prev = previewURL;
    return () => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev);
        } catch (e) {
          console.error("Error revoking object URL:", e);
        }
      }
    };
  }, [previewURL]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  function handleBrowseClick() {
    videoUploadRef.current && videoUploadRef.current.click();
  }

  function onFileChange(e) {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      handleFile(selectedFile);
    }
  }

  function handleFile(selectedFile) {
    if (selectedFile && selectedFile.type && selectedFile.type.startsWith("video/")) {
      if (selectedFile.size === 0) {
        setFile(null);
        setFileName("Selected file is empty. Please choose another video.");
        setErrorMessage("Selected file is empty. Please choose another video.");
        return;
      }

      if (previewURL) {
        try {
          URL.revokeObjectURL(previewURL);
        } catch (e) {
          console.error("Error revoking object URL:", e);
        }
      }

      setFile(selectedFile);
      setFileName(selectedFile.name);
      setErrorMessage("");
      setPreviewURL(URL.createObjectURL(selectedFile));
    } else {
      setFile(null);
      setFileName("Please select a valid video file.");
      setErrorMessage("Please select a valid video file.");
      if (previewURL) {
        try {
          URL.revokeObjectURL(previewURL);
        } catch (e) {
          console.error("Error revoking object URL:", e);
        }
        setPreviewURL(null);
      }
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    uploadBoxRef.current?.classList.add("border-amber-500", "bg-amber-50");
  }

  function onDragLeave() {
    uploadBoxRef.current?.classList.remove("border-amber-500", "bg-amber-50");
  }

  function onDrop(e) {
    e.preventDefault();
    uploadBoxRef.current?.classList.remove("border-amber-500", "bg-amber-50");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }

  function updateProgressByPercent(nextPercent) {
    const safePercent = Math.max(0, Math.min(99, nextPercent));
    setProgressPercent(safePercent);
    if (safePercent < 20) {
      setProgressStage("uploading");
      setProgressStep("Uploading video");
    } else if (safePercent < 35) {
      setProgressStage("moderating");
      setProgressStep("Checking content safety");
    } else if (safePercent < 55) {
      setProgressStage("extracting");
      setProgressStep("Extracting audio");
    } else if (safePercent < 80) {
      setProgressStage("transcribing");
      setProgressStep("Transcribing speech");
    } else {
      setProgressStage("summarizing");
      setProgressStep("Summarizing content");
    }
  }

  function startProgressSimulation() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = setInterval(() => {
      setProgressPercent((prev) => {
        let increment = 0.6;
        if (prev < 20) increment = 1.5;
        else if (prev < 35) increment = 1.0;
        else if (prev < 55) increment = 1.1;
        else if (prev < 80) increment = 0.8;
        else if (prev >= 94) increment = 0;

        const next = Math.min(94, prev + increment);
        updateProgressByPercent(next);
        return next;
      });
    }, 400);
  }

  function stopProgressSimulation() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  function makeSafeBaseName(name) {
    const base = (name || "summary")
      .replace(/\.[^/.]+$/, "")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
      .trim();
    return base || "summary";
  }

  function buildSummaryExportText() {
    const lines = [];
    lines.push("AI Video Summarizer Export");
    lines.push("");
    lines.push("Summary");
    lines.push(summaryHTML || "No summary available.");
    lines.push("");

    if (timeKeyPoints.length > 0) {
      lines.push("Time-Based Key Points");
      timeKeyPoints.forEach((item, idx) => {
        const label = `${item.start_label || "00:00"} - ${item.end_label || "00:00"}`;
        lines.push(`${idx + 1}. [${label}] ${item.point || ""}`);
      });
      lines.push("");
    }

    if (qaAnswer) {
      lines.push("Interactive Q&A");
      lines.push(qaAnswer);
      lines.push("");
    }

    lines.push("Transcript");
    lines.push(transcriptText || "No transcript available.");
    return lines.join("\n");
  }

  function handleDownloadTxt() {
    const baseName = makeSafeBaseName(fileName);
    const blob = new Blob([buildSummaryExportText()], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${baseName}_summary.txt`);
  }

  function handleDownloadPdf() {
    const baseName = makeSafeBaseName(fileName);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 44;
    const marginY = 52;
    const lineHeight = 18;
    let cursorY = marginY;

    const writeSection = (title, content) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      if (cursorY > pageHeight - marginY) {
        doc.addPage();
        cursorY = marginY;
      }
      doc.text(title, marginX, cursorY);
      cursorY += lineHeight;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const wrapped = doc.splitTextToSize(content || "-", pageWidth - marginX * 2);
      wrapped.forEach((line) => {
        if (cursorY > pageHeight - marginY) {
          doc.addPage();
          cursorY = marginY;
        }
        doc.text(line, marginX, cursorY);
        cursorY += 14;
      });
      cursorY += 10;
    };

    writeSection("Summary", summaryHTML || "No summary available.");
    const keyPointsText =
      timeKeyPoints.length > 0
        ? timeKeyPoints
            .map(
              (item, idx) =>
                `${idx + 1}. [${item.start_label || "00:00"} - ${item.end_label || "00:00"}] ${
                  item.point || ""
                }`
            )
            .join("\n")
        : "No key points available.";
    writeSection("Time-Based Key Points", keyPointsText);
    if (qaAnswer) {
      writeSection("Interactive Q&A", qaAnswer);
    }
    writeSection("Transcript", transcriptText || "No transcript available.");

    doc.save(`${baseName}_summary.pdf`);
  }

  async function handleDownloadDocx() {
    const baseName = makeSafeBaseName(fileName);
    const children = [
      new Paragraph({
        children: [new TextRun({ text: "AI Video Summarizer Export", bold: true, size: 30 })],
        spacing: { after: 260 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Summary", bold: true, size: 26 })],
      }),
      new Paragraph(summaryHTML || "No summary available."),
      new Paragraph(""),
      new Paragraph({
        children: [new TextRun({ text: "Time-Based Key Points", bold: true, size: 26 })],
      }),
    ];

    if (timeKeyPoints.length === 0) {
      children.push(new Paragraph("No key points available."));
    } else {
      timeKeyPoints.forEach((item, idx) => {
        children.push(
          new Paragraph(
            `${idx + 1}. [${item.start_label || "00:00"} - ${item.end_label || "00:00"}] ${
              item.point || ""
            }`
          )
        );
      });
    }

    children.push(new Paragraph(""));
    if (qaAnswer) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Interactive Q&A", bold: true, size: 26 })],
        })
      );
      children.push(new Paragraph(qaAnswer));
      children.push(new Paragraph(""));
    }
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Transcript", bold: true, size: 26 })],
      })
    );
    children.push(new Paragraph(transcriptText || "No transcript available."));

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${baseName}_summary.docx`);
  }

  const handleSummarizeAPI = async () => {
    if (!file) {
      alert("Please upload a video file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("summary_length", summaryLength);
    formData.append("summary_style", summaryStyle);
    formData.append("output_language", outputLanguage);
    formData.append("transcription_task", outputLanguage === "english" ? "translate" : "transcribe");
    formData.append("source_language", sourceLanguage);
    formData.append("include_key_points", String(includeKeyPoints));

    setShowResults(true);
    setLoadingSummarize(true);
    setErrorMessage("");
    setSummaryHTML(null);
    setTranscriptText("");
    setTranscriptSegments([]);
    setTimeKeyPoints([]);
    setSuggestedQuestions([]);
    setQuestionInput("");
    setQaAnswer("");
    setQaSources([]);
    setQaError("");
    setProgressPercent(5);
    setProgressStage("uploading");
    setProgressStep("Uploading video");
    startProgressSimulation();

    try {
      const res = await api.post("/process-video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10 * 60 * 1000,
        onUploadProgress: (event) => {
          if (!event?.total) return;
          const uploadedPercent = Math.round((event.loaded * 100) / event.total);
          const scaledPercent = Math.min(18, 5 + uploadedPercent * 0.13);
          setProgressPercent((prev) => {
            const next = Math.max(prev, scaledPercent);
            updateProgressByPercent(next);
            return next;
          });
        },
      });

      const data = res.data || {};
      setSummaryHTML(data.summary || "No summary returned from server.");
      setTranscriptText(data.transcript_text || "");
      setTranscriptSegments(Array.isArray(data.transcript_segments) ? data.transcript_segments : []);
      setTimeKeyPoints(Array.isArray(data.time_key_points) ? data.time_key_points : []);
      setSuggestedQuestions(Array.isArray(data.suggested_questions) ? data.suggested_questions : []);
      stopProgressSimulation();
      setProgressPercent(100);
      setProgressStage("summarizing");
      setProgressStep("Summary ready");
    } catch (e) {
      stopProgressSimulation();
      const backendPayload = e?.response?.data;
      const status = e?.response?.status;
      const backendDetail = backendPayload?.detail;
      const debugInfo = {
        message: e?.message || "Unknown error",
        code: e?.code || null,
        status: status || null,
        detail: backendDetail || null,
        response: backendPayload || null,
        requestUrl: e?.config?.url || null,
        baseURL: e?.config?.baseURL || null,
      };

      if (typeof backendDetail === "string" && backendDetail.trim()) {
        setErrorMessage(backendDetail);
      } else if (backendDetail) {
        setErrorMessage(`Backend error: ${JSON.stringify(backendDetail)}`);
      } else if (status) {
        setErrorMessage(`Request failed with status ${status}. Check backend logs for details.`);
      } else {
        setErrorMessage("Network/CORS error. Backend may be down or blocked by CORS.");
      }
      console.error("Summarize API error (raw):", e);
      console.error("Summarize API error (debug):", debugInfo);
    } finally {
      setLoadingSummarize(false);
    }
  };

  async function onSummarizeClick() {
    await handleSummarizeAPI();
  }

  async function askVideoQuestion(nextQuestion) {
    const askedQuestion = (nextQuestion ?? questionInput).trim();
    if (!askedQuestion) {
      setQaError("Enter a question about the video.");
      return;
    }

    setQaError("");
    setQaAnswer("");
    setQaSources([]);
    setLoadingQA(true);

    try {
      const res = await api.post("/ask-video", {
        question: askedQuestion,
        transcript_text: transcriptText,
        transcript_segments: transcriptSegments,
      });

      const data = res.data || {};
      setQuestionInput(askedQuestion);
      setQaAnswer(data.answer || "");
      setQaSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (e) {
      const backendDetail = e?.response?.data?.detail;
      setQaError(
        typeof backendDetail === "string" && backendDetail.trim()
          ? backendDetail
          : "Could not answer that question from the transcript."
      );
    } finally {
      setLoadingQA(false);
    }
  }

  function seekVideoTo(seconds) {
    const video = videoPlayerRef.current;
    const time = Number(seconds);

    if (!video || !Number.isFinite(time)) {
      return;
    }

    const hasDuration = Number.isFinite(video.duration) && video.duration > 0;
    const safeTime = hasDuration ? Math.min(Math.max(0, time), Math.max(0, video.duration - 0.25)) : Math.max(0, time);

    video.currentTime = safeTime;
    video.play().catch(() => {});
  }

  return (
    <div className="container mx-auto px-4 py-6 md:px-8 md:py-10 max-w-7xl min-h-screen">
      <AppHeader />

      <main id="main-content">
        {!showResults && (
          <UploadSection
            uploadBoxRef={uploadBoxRef}
            videoUploadRef={videoUploadRef}
            fileName={fileName}
            summaryLength={summaryLength}
            setSummaryLength={setSummaryLength}
            summaryStyle={summaryStyle}
            setSummaryStyle={setSummaryStyle}
            outputLanguage={outputLanguage}
            setOutputLanguage={setOutputLanguage}
            sourceLanguage={sourceLanguage}
            setSourceLanguage={setSourceLanguage}
            includeKeyPoints={includeKeyPoints}
            setIncludeKeyPoints={setIncludeKeyPoints}
            file={file}
            handleBrowseClick={handleBrowseClick}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onFileChange={onFileChange}
            onSummarizeClick={onSummarizeClick}
          />
        )}

        {showResults && (
          <ResultsSection
            videoPlayerRef={videoPlayerRef}
            previewURL={previewURL}
            errorMessage={errorMessage}
            loadingSummarize={loadingSummarize}
            progressStep={progressStep}
            progressPercent={progressPercent}
            processingStages={processingStages}
            progressStage={progressStage}
            summaryHTML={summaryHTML}
            handleDownloadTxt={handleDownloadTxt}
            handleDownloadPdf={handleDownloadPdf}
            handleDownloadDocx={handleDownloadDocx}
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
            includeKeyPoints={includeKeyPoints}
            timeKeyPoints={timeKeyPoints}
          />
        )}
      </main>
    </div>
  );
}
