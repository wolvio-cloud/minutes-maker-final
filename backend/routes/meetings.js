const express = require("express");
const router = express.Router();
const multer = require("multer");
const Meeting = require("../models/Meeting");
const sarvam = require("../services/sarvam");

// ─── Multer (WAV in memory) ────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "audio/wav" || file.mimetype === "audio/wave" || file.originalname.endsWith(".wav")) {
      cb(null, true);
    } else {
      cb(new Error("Only WAV files are accepted"));
    }
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Collect output filenames from Sarvam job_details array */
function extractOutputFiles(jobDetails = []) {
  const files = [];
  jobDetails.forEach((d) => {
    (d.outputs || []).forEach((o) => files.push(o.file_name));
  });
  return files;
}

/**
 * Normalise Sarvam result JSON into a consistent shape for the frontend:
 * { language, label, segments: [{ speaker, start, end, text }], raw }
 */
function normalizeResult(raw, mode) {
  if (!raw) return raw;

  const segments = Array.isArray(raw?.transcript)
    ? raw.transcript
    : Array.isArray(raw)
      ? raw
      : null;

  if (!segments) return raw;

  return {
    language: mode === "transcribe" ? "ta-IN" : "en-IN",
    label: mode === "transcribe" ? "Tamil Transcription" : "English Translation",
    segments: segments.map((seg) => ({
      speaker: seg.speaker || seg.spk || null,
      start: seg.start ?? seg.start_time ?? null,
      end: seg.end ?? seg.end_time ?? null,
      text: seg.text || seg.transcript || seg.translation || "",
    })),
    raw,
  };
}

// ─── MEETINGS CRUD ─────────────────────────────────────────────────────────────

// GET  /api/meetings
router.get("/", async (req, res) => {
  try {
    const meetings = await Meeting.find().sort({ createdAt: -1 });
    res.json({ success: true, data: meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET  /api/meetings/:id
router.get("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });
    res.json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/meetings  — creates meeting + two Sarvam jobs (transcribe + translate)
router.post("/", async (req, res) => {
  try {
    const { title, description, date, participants, tags, numSpeakers, withDiarization } = req.body;

    const jobOpts = {
      numSpeakers: numSpeakers || 2,
      withDiarization: withDiarization !== false,
    };

    // Create both jobs in parallel
    let transcribeJobId = null;
    let translateJobId = null;

    try {
      const [tscRes, trnRes] = await Promise.all([
        sarvam.createJobTranscribe({ mode: "transcribe", ...jobOpts }),
        sarvam.createJobTranslate({ mode: "translate", ...jobOpts }),
      ]);
      transcribeJobId = tscRes.job_id;
      translateJobId = trnRes.job_id;
      console.log("Transcribe job:", transcribeJobId, "| Translate job:", translateJobId);
    } catch (sarvamErr) {
      console.error("Sarvam job creation failed:", sarvamErr.response?.data || sarvamErr.message);
    }

    const initialStatus = (id) => id ? "Pending" : "NotStarted";

    const meeting = new Meeting({
      title,
      description,
      date,
      participants: participants || [],
      tags: tags || [],
      transcribeJob: { jobId: transcribeJobId, jobStatus: initialStatus(transcribeJobId) },
      translateJob: { jobId: translateJobId, jobStatus: initialStatus(translateJobId) },
    });

    await meeting.save();
    res.status(201).json({ success: true, data: meeting });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT  /api/meetings/:id
router.put("/:id", async (req, res) => {
  try {
    const { title, description, date, participants, tags } = req.body;
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { title, description, date, participants, tags },
      { new: true, runValidators: true }
    );
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });
    res.json({ success: true, data: meeting });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/meetings/:id
router.delete("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });
    res.json({ success: true, message: "Meeting deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── AUDIO UPLOAD ──────────────────────────────────────────────────────────────

/**
 * POST /api/meetings/:id/upload-audio
 * Uploads the WAV to BOTH Sarvam jobs and starts them.
 */
router.post("/:id/upload-audio", upload.single("audio"), async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });

    const tscJobId = meeting.transcribeJob?.jobId;
    const trnJobId = meeting.translateJob?.jobId;

    if (!tscJobId && !trnJobId)
      return res.status(400).json({ success: false, message: "No Sarvam jobs found on this meeting" });

    if (!req.file)
      return res.status(400).json({ success: false, message: "No WAV file provided" });

    const fileName = req.file.originalname || "audio.wav";
    const fileBuffer = req.file.buffer;
    const contentType = req.file.mimetype || "audio/wav";

    // Upload file + start both jobs in parallel
    const uploadAndStartTranscribe = async (jobId) => {
      if (!jobId) return;
      const uploadData = await sarvam.getUploadUrlsTransribe(jobId, [fileName]);
      const signedUrl = uploadData.upload_urls?.[fileName]?.file_url;
      if (!signedUrl) throw new Error(`No upload URL returned for job ${jobId}`);
      await sarvam.uploadFileToUrl(signedUrl, fileBuffer, contentType);
      await sarvam.startJobTranscribe(jobId);
      console.log(`Job ${jobId} started`);
    };

    const uploadAndStartTranslate = async (jobId) => {
      if (!jobId) return;
      const uploadData = await sarvam.getUploadUrlsTranslate(jobId, [fileName]);
      const signedUrl = uploadData.upload_urls?.[fileName]?.file_url;
      if (!signedUrl) throw new Error(`No upload URL returned for job ${jobId}`);
      await sarvam.uploadFileToUrl(signedUrl, fileBuffer, contentType);
      await sarvam.startJobTranslate(jobId);
      console.log(`Job ${jobId} started`);
    };

    await uploadAndStartTranscribe(tscJobId)
    await uploadAndStartTranslate(trnJobId)

    meeting.audioFileName = fileName;
    meeting.audioUploaded = true;
    meeting.transcribeJob.jobStatus = tscJobId ? "Processing" : "NotStarted";
    meeting.translateJob.jobStatus = trnJobId ? "Processing" : "NotStarted";
    await meeting.save();

    res.json({ success: true, message: "Audio uploaded to both jobs and processing started", data: meeting });
  } catch (err) {
    console.error("Upload error:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

// ─── STATUS CHECKS ─────────────────────────────────────────────────────────────

/**
 * GET /api/meetings/:id/job-status
 * Checks BOTH jobs and saves updated status.
 */
router.get("/:id/job-status", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });

    const checkOneTranscribe = async (jobDoc, label) => {
      if (!jobDoc?.jobId) return null;
      try {
        const statusData = await sarvam.getJobStatusTranscribe(jobDoc.jobId);
        const state = statusData.job_state;
        jobDoc.jobStatus = state;
        if (state === "Completed") {
          jobDoc.outputFiles = extractOutputFiles(statusData.job_details);
        }
        if (state === "Failed") {
          jobDoc.errorMessage = statusData.error_message || `${label} job failed`;
        }
        console.log(`${label} job ${jobDoc.jobId}: ${state}`);
        return { state, outputFiles: jobDoc.outputFiles };
      } catch (err) {
        console.error(`${label} status error:`, err.response?.data || err.message);
        return null;
      }
    };

    const checkOneTranslate = async (jobDoc, label) => {
      if (!jobDoc?.jobId) return null;
      try {
        const statusData = await sarvam.getJobStatusTranslate(jobDoc.jobId);
        const state = statusData.job_state;
        jobDoc.jobStatus = state;
        if (state === "Completed") {
          jobDoc.outputFiles = extractOutputFiles(statusData.job_details);
        }
        if (state === "Failed") {
          jobDoc.errorMessage = statusData.error_message || `${label} job failed`;
        }
        console.log(`${label} job ${jobDoc.jobId}: ${state}`);
        return { state, outputFiles: jobDoc.outputFiles };
      } catch (err) {
        console.error(`${label} status error:`, err.response?.data || err.message);
        return null;
      }
    };

    const [tscResult, trnResult] = await Promise.all([
      checkOneTranscribe(meeting.transcribeJob, "Transcribe"),
      checkOneTranslate(meeting.translateJob, "Translate"),
    ]);

    await meeting.save();

    res.json({
      success: true,
      data: {
        transcribeJob: {
          jobId: meeting.transcribeJob.jobId,
          jobStatus: meeting.transcribeJob.jobStatus,
          outputFiles: meeting.transcribeJob.outputFiles,
          error: meeting.transcribeJob.errorMessage,
        },
        translateJob: {
          jobId: meeting.translateJob.jobId,
          jobStatus: meeting.translateJob.jobStatus,
          outputFiles: meeting.translateJob.outputFiles,
          error: meeting.translateJob.errorMessage,
        },
      },
    });
  } catch (err) {
    console.error("Status check error:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

// ─── PULL RESULTS ──────────────────────────────────────────────────────────────

/**
 * POST /api/meetings/:id/fetch-transcription
 * Downloads output from the transcribe job and saves Tamil result.
 */
router.post("/:id/fetch-transcription", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });

    const job = meeting.transcribeJob;
    if (job.jobStatus !== "Completed")
      return res.status(400).json({ success: false, message: "Transcribe job not completed yet" });

    const outputFile = job.outputFiles?.[0];
    if (!outputFile)
      return res.status(400).json({ success: false, message: "No output file found for transcribe job" });

    const downloadData = await sarvam.getDownloadUrlstranscription(job.jobId, [outputFile]);
    const fileUrl = downloadData.download_urls?.[outputFile]?.file_url;
    if (!fileUrl) return res.status(500).json({ success: false, message: "Failed to get download URL" });

    const raw = await sarvam.downloadFileContent(fileUrl);
    const normalized = normalizeResult(raw, "transcribe");

    job.result = normalized;
    await meeting.save();

    res.json({ success: true, data: normalized });
  } catch (err) {
    console.error("Fetch transcription error:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

/**
 * POST /api/meetings/:id/fetch-translation
 * Downloads output from the translate job and saves English result.
 */
router.post("/:id/fetch-translation", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });

    const job = meeting.translateJob;
    if (job.jobStatus !== "Completed")
      return res.status(400).json({ success: false, message: "Translate job not completed yet" });

    const outputFile = job.outputFiles?.[0];
    if (!outputFile)
      return res.status(400).json({ success: false, message: "No output file found for translate job" });

    const downloadData = await sarvam.getDownloadUrlstranslation(job.jobId, [outputFile]);
    const fileUrl = downloadData.download_urls?.[outputFile]?.file_url;
    if (!fileUrl) return res.status(500).json({ success: false, message: "Failed to get download URL" });

    const raw = await sarvam.downloadFileContent(fileUrl);
    const normalized = normalizeResult(raw, "translate");

    job.result = normalized;
    await meeting.save();

    res.json({ success: true, data: normalized });
  } catch (err) {
    console.error("Fetch translation error:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

module.exports = router;
