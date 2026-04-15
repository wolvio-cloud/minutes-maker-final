const mongoose = require("mongoose");

const jobInfoSchema = new mongoose.Schema(
  {
    jobId:        { type: String, default: null },
    jobStatus:    { type: String, enum: ["NotStarted","Accepted", "Pending", "Processing", "Completed", "Failed"], default: "NotStarted" },
    errorMessage: { type: String, default: null },
    outputFiles:  { type: [String], default: [] },
    result:       { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    date:        { type: Date, required: true },
    participants:{ type: [String], default: [] },
    tags:        { type: [String], default: [] },

    // Audio
    audioFileName: { type: String, default: null },
    audioUploaded: { type: Boolean, default: false },

    // Two separate Sarvam jobs
    transcribeJob: { type: jobInfoSchema, default: () => ({}) }, // mode: "transcribe" → Tamil
    translateJob:  { type: jobInfoSchema, default: () => ({}) }, // mode: "translate"  → English
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meeting", meetingSchema);
