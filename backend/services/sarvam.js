const axios = require("axios");

const BASE_URL = process.env.SARVAM_BASE_URL || "https://api.sarvam.ai";
const API_KEY = process.env.SARVAM_API_KEY;

const headers = () => ({
  "api-subscription-key": API_KEY,
  "Content-Type": "application/json",
});

/**
 * Create a Sarvam batch STT job.
 *
 * mode: "transcribe" → Tamil text output  (language_code: "ta-IN")
 * mode: "translate"  → English text output (language_code: "ta-IN", always outputs English)
 *
 * Model: saaras:v3
 * Endpoint: /speech-to-text-translate/job/v1
 */
async function createJobTranscribe({ mode = "transcribe", numSpeakers = 2, withDiarization = true } = {}) {
  const res = await axios.post(
    `${BASE_URL}/speech-to-text/job/v1`,
    {
      job_parameters: {
        model: "saaras:v3",
        mode: "transcribe",                         // "transcribe" | "translate"
        language_code: "ta-IN",           // source language is always Tamil
        with_diarization: withDiarization,
        num_speakers: numSpeakers,
        with_timestamps: true,
      },
    },
    { headers: headers() }
  );
  return res.data; // { job_id: "..." }
}
async function createJobTranslate({ numSpeakers = 2, withDiarization = true } = {}) {
  const res = await axios.post(
    `${BASE_URL}/speech-to-text-translate/job/v1`,
    {
      job_parameters: {
        model: "saaras:v3",                          // "transcribe" | "translate"         // source language is always Tamil
        with_diarization: withDiarization,
        num_speakers: numSpeakers,
        with_timestamps: true,
      },
    },
    { headers: headers() }
  );
  return res.data; // { job_id: "..." }
}
/** Get signed upload URLs for a list of filenames on a job */
async function getUploadUrlsTransribe(jobId, fileNames) {
  const res = await axios.post(
    `${BASE_URL}/speech-to-text/job/v1/upload-files`,
    { job_id: jobId, files: fileNames },
    { headers: headers() }
  );
  console.log("res on url transcribe", res?.data);

  return res.data; // { upload_urls: { filename: { file_url } } }
}

async function getUploadUrlsTranslate(jobId, fileNames) {
  const res = await axios.post(
    `${BASE_URL}/speech-to-text-translate/job/v1/upload-files`,
    { job_id: jobId, files: fileNames },
    { headers: headers() }
  );
  console.log("res on url translate", res?.data);
  return res.data; // { upload_urls: { filename: { file_url } } }
}
/** PUT a file buffer to Sarvam's Azure Blob signed URL */
async function uploadFileToUrl(signedUrl, fileBuffer, contentType = "audio/wav") {
  await axios.put(signedUrl, fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": fileBuffer.length,
      "x-ms-blob-type": "BlockBlob",
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
}

/** Tell Sarvam to start processing the job */
async function startJobTranscribe(jobId) {
  await axios.post(
    `${BASE_URL}/speech-to-text/job/v1/${jobId}/start`,
    {},
    { headers: { "api-subscription-key": API_KEY } }
  );
}

async function startJobTranslate(jobId) {
  await axios.post(
    `${BASE_URL}/speech-to-text-translate/job/v1/${jobId}/start`,
    {},
    { headers: { "api-subscription-key": API_KEY } }
  );
}
/** Poll job status — returns { job_state, job_details, error_message } */
async function getJobStatusTranslate(jobId) {
  const res = await axios.get(
    `${BASE_URL}/speech-to-text-translate/job/v1/${jobId}/status`,
    { headers: { "api-subscription-key": API_KEY } }
  );
  return res.data;
}

async function getJobStatusTranscribe(jobId) {
  const res = await axios.get(
    `${BASE_URL}/speech-to-text/job/v1/${jobId}/status`,
    { headers: { "api-subscription-key": API_KEY } }
  );
  return res.data;
}

/** Get signed download URLs for output files */
async function getDownloadUrlstranscription(jobId, fileNames) {
  const res = await axios.post(
    `${BASE_URL}/speech-to-text/job/v1/download-files`,
    { job_id: jobId, files: fileNames },
    { headers: headers() }
  );
  return res.data; // { download_urls: { filename: { file_url } } }
}

async function getDownloadUrlstranslation(jobId, fileNames) {
  const res = await axios.post(
    `${BASE_URL}/speech-to-text-translate/job/v1/download-files`,
    { job_id: jobId, files: fileNames },
    { headers: headers() }
  );
  return res.data; // { download_urls: { filename: { file_url } } }
}

/** Download the JSON content of a result file from its signed URL */
async function downloadFileContent(signedUrl) {
  const res = await axios.get(signedUrl);
  return res.data;
}

module.exports = {
  createJobTranscribe,
  createJobTranslate,
  startJobTranscribe,
  startJobTranslate,
  uploadFileToUrl,
  getJobStatusTranscribe,
  getUploadUrlsTransribe,
  getUploadUrlsTranslate,
  getJobStatusTranslate,
  getDownloadUrlstranslation,
  getDownloadUrlstranscription,
  downloadFileContent,
};
