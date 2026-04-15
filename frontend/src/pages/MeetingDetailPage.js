import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getMeeting, uploadAudio, checkJobStatus,
  fetchTranscription, fetchTranslation, updateMeeting,
} from "../utils/api";
import { convertMp4ToWav } from "../utils/audioConverter";
import { StatusBadge, Modal, Field, Input, Textarea, ProgressBar } from "../components/UI";
import { useToast } from "../context/ToastContext";

export default function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [mp4File, setMp4File] = useState(null);
  const [wavBlob, setWavBlob] = useState(null);
  const [wavName, setWavName] = useState("");
  const [converting, setConverting] = useState(false);
  const [convProgress, setConvProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const [checkingStatus, setCheckingStatus] = useState(false);
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const [fetchingTranslation, setFetchingTranslation] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadMeeting(); }, [id]);

  async function loadMeeting() {
    try {
      setLoading(true);
      const res = await getMeeting(id);
      const m = res.data.data;
      setMeeting(m);
      setEditForm({
        title:        m.title,
        description:  m.description || "",
        date:         new Date(m.date).toISOString().slice(0, 16),
        participants: (m.participants || []).join(", "),
        tags:         (m.tags || []).join(", "),
      });
    } catch {
      addToast("Meeting not found", "error");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMp4File(file);
    setWavBlob(null);
    setConvProgress(0);
  }

  async function handleConvert() {
    if (!mp4File) return;
    try {
      setConverting(true);
      const blob = await convertMp4ToWav(mp4File, setConvProgress);
      const name = mp4File.name.replace(/\.[^/.]+$/, "") + ".wav";
      setWavBlob(blob);
      setWavName(name);
      addToast("Converted to WAV successfully", "success");
    } catch (err) {
      addToast("Conversion failed: " + err.message, "error");
    } finally {
      setConverting(false);
    }
  }

  async function handleUpload() {
    if (!wavBlob) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("audio", new File([wavBlob], wavName, { type: "audio/wav" }));
      const res = await uploadAudio(id, formData, (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      setMeeting(res.data.data);
      addToast("Audio uploaded — both jobs started!", "success");
      setWavBlob(null); setMp4File(null); setWavName("");
    } catch (err) {
      addToast(err.response?.data?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleCheckStatus() {
    try {
      setCheckingStatus(true);
      const res = await checkJobStatus(id);
      // Merge job statuses back into meeting state
      const { transcribeJob, translateJob } = res.data.data;
      setMeeting((prev) => ({
        ...prev,
        transcribeJob: { ...prev.transcribeJob, ...transcribeJob },
        translateJob:  { ...prev.translateJob,  ...translateJob  },
      }));
      const tsc = transcribeJob?.jobStatus;
      const trn = translateJob?.jobStatus;
      addToast(`Transcribe: ${tsc} | Translate: ${trn}`,
        (tsc === "Completed" && trn === "Completed") ? "success" : "info");
    } catch (err) {
      addToast(err.response?.data?.message || "Status check failed", "error");
    } finally {
      setCheckingStatus(false);
    }
  }

  async function handleFetchTranscription() {
    try {
      setFetchingTranscript(true);
      const res = await fetchTranscription(id);
      setMeeting((prev) => ({
        ...prev,
        transcribeJob: { ...prev.transcribeJob, result: res.data.data },
      }));
      setActiveTab("transcription");
      addToast("Tamil transcription loaded", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to fetch transcription", "error");
    } finally {
      setFetchingTranscript(false);
    }
  }

  async function handleFetchTranslation() {
    try {
      setFetchingTranslation(true);
      const res = await fetchTranslation(id);
      setMeeting((prev) => ({
        ...prev,
        translateJob: { ...prev.translateJob, result: res.data.data },
      }));
      setActiveTab("translation");
      addToast("English translation loaded", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to fetch translation", "error");
    } finally {
      setFetchingTranslation(false);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...editForm,
        participants: editForm.participants.split(",").map((s) => s.trim()).filter(Boolean),
        tags:         editForm.tags.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const res = await updateMeeting(id, payload);
      setMeeting(res.data.data);
      setEditOpen(false);
      addToast("Meeting updated", "success");
    } catch {
      addToast("Update failed", "error");
    } finally {
      setSaving(false);
    }
  }

  const tscCompleted = meeting?.transcribeJob?.jobStatus === "Completed";
  const trnCompleted = meeting?.translateJob?.jobStatus  === "Completed";

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          Loading meeting…
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "overview",      label: "Overview" },
    { key: "audio",         label: "Audio" },
    { key: "transcription", label: "Tamil Transcript",   dot: meeting?.transcribeJob?.result ? "bg-orange-400" : null },
    { key: "translation",   label: "English Translation", dot: meeting?.translateJob?.result  ? "bg-blue-400"   : null },
  ];

  return (
    <div className="min-h-screen bg-surface-soft">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-surface-border">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors text-sm font-medium">
            ← Back
          </button>
          <div className="w-px h-5 bg-surface-border" />
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md bg-brand-soft border border-brand-border flex items-center justify-center flex-shrink-0">
              <span className="text-brand text-xs">◎</span>
            </div>
            <span className="font-display font-semibold text-slate-900 truncate text-sm">{meeting?.title}</span>
          </div>
          <button onClick={() => setEditOpen(true)} className="btn-ghost text-sm px-3 py-1.5 rounded-lg border border-surface-border">
            Edit
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-7">
        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <MetaPill icon="📅" label={new Date(meeting.date).toLocaleString()} />
          {meeting.participants?.length > 0 && <MetaPill icon="👥" label={meeting.participants.join(", ")} />}
          {meeting.audioFileName && <MetaPill icon="🎵" label={meeting.audioFileName} />}
        </div>

        {/* Job status summary bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <JobStatusPill
            label="Transcribe Job"
            jobId={meeting.transcribeJob?.jobId}
            status={meeting.transcribeJob?.jobStatus}
            color="orange"
          />
          <JobStatusPill
            label="Translate Job"
            jobId={meeting.translateJob?.jobId}
            status={meeting.translateJob?.jobStatus}
            color="blue"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-muted rounded-xl p-1 w-fit flex-wrap">
          {tabs.map(({ key, label, dot }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium font-display transition-all ${
                activeTab === key
                  ? "bg-white text-brand shadow-card border border-surface-border"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
              {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <OverviewTab meeting={meeting} />}

        {activeTab === "audio" && (
          <AudioTab
            meeting={meeting}
            mp4File={mp4File} wavBlob={wavBlob} wavName={wavName}
            converting={converting} convProgress={convProgress}
            uploading={uploading} uploadProgress={uploadProgress}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onConvert={handleConvert}
            onUpload={handleUpload}
            checkingStatus={checkingStatus}
            onCheckStatus={handleCheckStatus}
            tscCompleted={tscCompleted}
            trnCompleted={trnCompleted}
            fetchingTranscript={fetchingTranscript}
            fetchingTranslation={fetchingTranslation}
            onFetchTranscription={handleFetchTranscription}
            onFetchTranslation={handleFetchTranslation}
          />
        )}

        {activeTab === "transcription" && (
          <ResultTab
            data={meeting.transcribeJob?.result}
            emptyMessage="Pull Tamil transcription from the Audio tab once the Transcribe job is Completed"
            label="Tamil Transcription"
          />
        )}

        {activeTab === "translation" && (
          <ResultTab
            data={meeting.translateJob?.result}
            emptyMessage="Pull English translation from the Audio tab once the Translate job is Completed"
            label="English Translation"
          />
        )}
      </main>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Meeting">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Field label="Title *">
            <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
          </Field>
          <Field label="Description">
            <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
          </Field>
          <Field label="Date & Time">
            <Input type="datetime-local" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
          </Field>
          <Field label="Participants" hint="Comma-separated">
            <Input value={editForm.participants} onChange={(e) => setEditForm({ ...editForm, participants: e.target.value })} />
          </Field>
          <Field label="Tags" hint="Comma-separated">
            <Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-ghost text-sm px-4 py-2 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm px-5 py-2 rounded-xl">{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MetaPill({ icon, label, mono }) {
  return (
    <div className={`flex items-center gap-1.5 bg-white border border-surface-border px-3 py-1.5 rounded-full text-xs text-slate-500 ${mono ? "font-mono" : ""}`}>
      <span>{icon}</span>
      <span className="truncate max-w-[200px]">{label}</span>
    </div>
  );
}

function JobStatusPill({ label, jobId, status, color }) {
  const colorMap = {
    orange: {
      NotStarted: "bg-slate-50 border-slate-200 text-slate-500",
      Pending:    "bg-orange-50 border-orange-200 text-orange-600",
      Processing: "bg-orange-50 border-orange-200 text-orange-600",
      Completed:  "bg-orange-50 border-orange-300 text-orange-700",
      Failed:     "bg-red-50 border-red-200 text-red-600",
    },
    blue: {
      NotStarted: "bg-slate-50 border-slate-200 text-slate-500",
      Pending:    "bg-blue-50 border-blue-200 text-blue-600",
      Processing: "bg-blue-50 border-blue-200 text-blue-600",
      Completed:  "bg-blue-50 border-blue-300 text-blue-700",
      Failed:     "bg-red-50 border-red-200 text-red-600",
    },
  };
  const cls = colorMap[color]?.[status] || colorMap[color]?.NotStarted;

  return (
    <div className={`flex items-center gap-2.5 border rounded-xl px-3.5 py-2 text-xs font-medium ${cls}`}>
      <div>
        <span className="font-semibold font-display">{label}</span>
        {jobId && <span className="font-mono text-xs opacity-60 ml-1.5">{jobId.slice(0, 12)}…</span>}
      </div>
      <StatusBadge status={status || "NotStarted"} />
    </div>
  );
}

function OverviewTab({ meeting }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card rounded-xl p-5 space-y-3 border border-surface-border">
        <h3 className="font-display font-semibold text-slate-800 text-sm">Meeting Info</h3>
        {meeting.description
          ? <p className="text-sm text-slate-500 leading-relaxed">{meeting.description}</p>
          : <p className="text-sm text-slate-300 italic">No description provided</p>
        }
        {meeting.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {meeting.tags.map((tag) => (
              <span key={tag} className="text-xs bg-brand-soft text-brand border border-brand-border px-2.5 py-0.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}
        {meeting.participants?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {meeting.participants.map((p) => (
              <span key={p} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        )}
      </div>

      <div className="card rounded-xl p-5 border border-surface-border space-y-4">
        <h3 className="font-display font-semibold text-slate-800 text-sm">Sarvam Jobs</h3>

        {/* Transcribe job */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-600 font-mono uppercase tracking-wide">Transcribe (Tamil)</span>
            <StatusBadge status={meeting.transcribeJob?.jobStatus || "NotStarted"} />
          </div>
          <p className="text-xs text-slate-400 font-mono truncate">{meeting.transcribeJob?.jobId || "—"}</p>
          {meeting.transcribeJob?.errorMessage && (
            <p className="text-xs text-red-500 bg-red-50 rounded p-1.5">{meeting.transcribeJob.errorMessage}</p>
          )}
        </div>

        <div className="border-t border-surface-border" />

        {/* Translate job */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 font-mono uppercase tracking-wide">Translate (English)</span>
            <StatusBadge status={meeting.translateJob?.jobStatus || "NotStarted"} />
          </div>
          <p className="text-xs text-slate-400 font-mono truncate">{meeting.translateJob?.jobId || "—"}</p>
          {meeting.translateJob?.errorMessage && (
            <p className="text-xs text-red-500 bg-red-50 rounded p-1.5">{meeting.translateJob.errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AudioTab({
  meeting, mp4File, wavBlob, wavName, converting, convProgress,
  uploading, uploadProgress, fileInputRef, onFileSelect, onConvert, onUpload,
  checkingStatus, onCheckStatus, tscCompleted, trnCompleted,
  fetchingTranscript, fetchingTranslation, onFetchTranscription, onFetchTranslation,
}) {
  return (
    <div className="space-y-4">

      {/* Step 1 — Select file */}
      <StepCard step="1" title="Select Video / Audio File" done={!!mp4File}>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            mp4File ? "border-brand bg-brand-soft" : "border-slate-200 hover:border-brand/40 hover:bg-brand-soft/40"
          }`}
        >
          <input ref={fileInputRef} type="file" accept="video/mp4,audio/*" onChange={onFileSelect} className="hidden" />
          <div className="text-3xl mb-2">{mp4File ? "🎬" : "📁"}</div>
          {mp4File ? (
            <div>
              <p className="font-display font-semibold text-slate-800 text-sm">{mp4File.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{(mp4File.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 font-medium">Click to select MP4 or audio file</p>
              <p className="text-xs text-slate-400 mt-1">MP4, WAV, MP3, M4A supported</p>
            </div>
          )}
        </div>
      </StepCard>

      {/* Step 2 — Convert */}
      <StepCard step="2" title="Convert to WAV" done={!!wavBlob}>
        {converting && <div className="mb-4"><ProgressBar value={convProgress} label="Converting audio…" /></div>}
        {wavBlob && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3">
            <span className="text-emerald-500 text-lg">✓</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800">{wavName}</p>
              <p className="text-xs text-emerald-600">{(wavBlob.size / 1024 / 1024).toFixed(1)} MB — Ready to upload</p>
            </div>
          </div>
        )}
        <button onClick={onConvert} disabled={!mp4File || converting} className="btn-primary text-sm px-5 py-2.5 rounded-xl w-full">
          {converting ? `Converting… ${convProgress}%` : wavBlob ? "Re-convert" : "Convert to WAV"}
        </button>
      </StepCard>

      {/* Step 3 — Upload to BOTH jobs */}
      <StepCard step="3" title="Upload to Sarvam — Starts Both Jobs" done={meeting.audioUploaded}>
        {meeting.audioUploaded && (
          <div className="flex items-center gap-2 mb-3 text-sm text-emerald-600 font-medium">
            <span>✓</span>
            <span>Uploaded <span className="font-mono text-xs text-slate-500">{meeting.audioFileName}</span> — both jobs started</span>
          </div>
        )}
        {uploading && <div className="mb-4"><ProgressBar value={uploadProgress} label="Uploading WAV to both Sarvam jobs…" /></div>}
        <button onClick={onUpload} disabled={!wavBlob || uploading} className="btn-primary text-sm px-5 py-2.5 rounded-xl w-full">
          {uploading ? `Uploading… ${uploadProgress}%` : meeting.audioUploaded ? "Re-upload Audio" : "Upload & Start Both Jobs"}
        </button>
      </StepCard>

      {/* Step 4 — Status + Pull */}
      <StepCard step="4" title="Check Status & Pull Results">

        {/* Dual job status */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-orange-700 font-mono uppercase tracking-wide">Transcribe</p>
            <StatusBadge status={meeting.transcribeJob?.jobStatus || "NotStarted"} />
            {meeting.transcribeJob?.outputFiles?.length > 0 && (
              <p className="text-xs text-orange-500 font-mono">{meeting.transcribeJob.outputFiles.length} output file(s)</p>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-blue-700 font-mono uppercase tracking-wide">Translate</p>
            <StatusBadge status={meeting.translateJob?.jobStatus || "NotStarted"} />
            {meeting.translateJob?.outputFiles?.length > 0 && (
              <p className="text-xs text-blue-500 font-mono">{meeting.translateJob.outputFiles.length} output file(s)</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onCheckStatus}
            disabled={checkingStatus}
            className="btn-primary text-sm px-4 py-2.5 rounded-xl font-display font-semibold"
          >
            {checkingStatus ? "Checking…" : "Check Both Status"}
          </button>

          <button
            onClick={onFetchTranscription}
            disabled={!tscCompleted || fetchingTranscript}
            className="btn-primary text-sm px-4 py-2.5 rounded-xl font-display font-semibold"
            title={!tscCompleted ? "Transcribe job must be Completed" : "Pull Tamil transcription"}
          >
            {fetchingTranscript ? "Pulling…" : "Pull Transcription"}
          </button>

          <button
            onClick={onFetchTranslation}
            disabled={!trnCompleted || fetchingTranslation}
            className="btn-primary text-sm px-4 py-2.5 rounded-xl font-display font-semibold"
            title={!trnCompleted ? "Translate job must be Completed" : "Pull English translation"}
          >
            {fetchingTranslation ? "Pulling…" : "Pull Translation"}
          </button>
        </div>

        {(!tscCompleted || !trnCompleted) &&
          (meeting.transcribeJob?.jobStatus !== "NotStarted" || meeting.translateJob?.jobStatus !== "NotStarted") && (
          <p className="text-xs text-slate-400 mt-3 text-center">
            Each Pull button unlocks independently when its job reaches <span className="text-emerald-600 font-semibold">Completed</span>
          </p>
        )}
      </StepCard>
    </div>
  );
}

function StepCard({ step, title, done, children }) {
  return (
    <div className={`card rounded-xl p-5 border transition-colors ${done ? "border-emerald-200 bg-emerald-50/20" : "border-surface-border"}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 ${
          done ? "bg-emerald-100 text-emerald-600" : "bg-brand-soft text-brand border border-brand-border"
        }`}>
          {done ? "✓" : step}
        </div>
        <h3 className="font-display font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ResultTab({ data, emptyMessage, label }) {
  const [viewMode, setViewMode] = useState("segments");

  if (!data) {
    return (
      <div className="card rounded-xl p-12 text-center border border-surface-border">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl mx-auto mb-3">📄</div>
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  const segments = data?.segments || (Array.isArray(data?.transcript) ? data.transcript : null);
  const langCode  = data?.language || "";
  const langLabel = data?.label || label;
  const isTamil   = langCode === "ta-IN";

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data?.raw || data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${label.toLowerCase().replace(/ /g, "_")}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTxt = () => {
    const lines = segments
      ? segments.map((s) => {
          const time    = s.start != null ? `[${formatTime(s.start)}] ` : "";
          const speaker = s.speaker ? `${s.speaker}: ` : "";
          return `${time}${speaker}${s.text}`.trim();
        }).join("\n\n")
      : JSON.stringify(data, null, 2);
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${label.toLowerCase().replace(/ /g, "_")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card rounded-xl border border-surface-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border bg-surface-soft flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display font-semibold text-slate-800 text-sm">{langLabel}</h3>
          {langCode && (
            <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border font-medium ${
              isTamil ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-blue-50 text-blue-600 border-blue-200"
            }`}>
              {langCode} {isTamil ? "தமிழ்" : "English"}
            </span>
          )}
          {segments && <span className="text-xs text-slate-400">{segments.length} segments</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-surface-border rounded-lg p-0.5 text-xs">
            <button onClick={() => setViewMode("segments")} className={`px-3 py-1 rounded-md transition-colors font-medium ${viewMode === "segments" ? "bg-brand text-white" : "text-slate-500 hover:text-slate-700"}`}>Segments</button>
            <button onClick={() => setViewMode("raw")} className={`px-3 py-1 rounded-md transition-colors font-medium ${viewMode === "raw" ? "bg-brand text-white" : "text-slate-500 hover:text-slate-700"}`}>Raw JSON</button>
          </div>
          <button onClick={downloadTxt}  className="btn-ghost text-xs px-2.5 py-1.5 rounded-lg border border-surface-border">↓ TXT</button>
          <button onClick={downloadJson} className="btn-ghost text-xs px-2.5 py-1.5 rounded-lg border border-surface-border">↓ JSON</button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {viewMode === "segments" && segments ? (
          <div className="divide-y divide-surface-border">
            {segments.map((seg, i) => <SegmentRow key={i} seg={seg} isTamil={isTamil} />)}
          </div>
        ) : viewMode === "segments" && !segments ? (
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
          </p>
        ) : (
          <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap overflow-auto max-h-[60vh] bg-surface-soft rounded-xl p-4 border border-surface-border">
            {JSON.stringify(data?.raw || data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function SegmentRow({ seg, isTamil }) {
  const palette = [
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
  ];
  const idx = seg.speaker ? parseInt(seg.speaker.replace(/\D/g, "") || "0", 10) % palette.length : 0;

  return (
    <div className="flex gap-4 py-3.5">
      <div className="flex-shrink-0 w-24 text-right space-y-1">
        {seg.speaker && (
          <span className={`inline-block text-xs font-mono px-2 py-0.5 rounded-full border font-medium ${palette[idx]}`}>
            {seg.speaker.replace("SPEAKER_", "SPK ")}
          </span>
        )}
        {seg.start != null && (
          <div className="text-xs text-slate-400 font-mono">{formatTime(seg.start)}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-relaxed">{seg.text}</p>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
