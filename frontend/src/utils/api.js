import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 60000 });

// ── Meetings CRUD ──────────────────────────────────────────────────────────────
export const getMeetings    = ()       => api.get("/meetings");
export const getMeeting     = (id)     => api.get(`/meetings/${id}`);
export const createMeeting  = (data)   => api.post("/meetings", data);
export const updateMeeting  = (id, data) => api.put(`/meetings/${id}`, data);
export const deleteMeeting  = (id)     => api.delete(`/meetings/${id}`);

// ── Sarvam Operations ──────────────────────────────────────────────────────────

/** Upload WAV — backend uploads to BOTH Sarvam jobs */
export const uploadAudio = (id, formData, onProgress) =>
  api.post(`/meetings/${id}/upload-audio`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
    timeout: 300000,
  });

/** Check status of both transcribe + translate jobs */
export const checkJobStatus = (id) => api.get(`/meetings/${id}/job-status`);

/** Pull result from the transcribe job (Tamil) */
export const fetchTranscription = (id) => api.post(`/meetings/${id}/fetch-transcription`);

/** Pull result from the translate job (English) */
export const fetchTranslation = (id) => api.post(`/meetings/${id}/fetch-translation`);
