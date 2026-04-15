import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMeetings, createMeeting, deleteMeeting } from "../utils/api";
import { StatusBadge, SkeletonCard, Modal, Field, Input, Textarea, EmptyState } from "../components/UI";
import { useToast } from "../context/ToastContext";

const EMPTY_FORM = {
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 16),
  participants: "",
  tags: "",
  numSpeakers: 2,
  withDiarization: true,
};

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => { loadMeetings(); }, []);

  async function loadMeetings() {
    try {
      setLoading(true);
      const res = await getMeetings();
      setMeetings(res.data.data);
    } catch {
      addToast("Failed to load meetings", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    try {
      setCreating(true);
      const payload = {
        ...form,
        participants: form.participants ? form.participants.split(",").map((s) => s.trim()).filter(Boolean) : [],
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };
      const res = await createMeeting(payload);
      setMeetings((prev) => [res.data.data, ...prev]);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      addToast("Meeting created & Sarvam job initialized", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to create meeting", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMeeting(id);
      setMeetings((prev) => prev.filter((m) => m._id !== id));
      setDeleteConfirm(null);
      addToast("Meeting deleted", "success");
    } catch {
      addToast("Failed to delete meeting", "error");
    }
  }

  const filtered = meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface-soft">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-white text-xs font-bold">◎</span>
            </div>
            <span className="font-display font-bold text-slate-900 tracking-tight">Minutes Maker</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <span className="text-base leading-none font-light">+</span>
            New Meeting
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {/* Title + search row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              All <span className="text-gradient">Meetings</span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{meetings.length} total meetings</p>
          </div>
          <div className="sm:ml-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meetings…"
              className="input-field w-64"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🎙️"
            title="No meetings yet"
            description="Create your first meeting to start transcribing and translating Tamil audio recordings."
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-5 py-2.5 rounded-xl font-display font-semibold">
                Create Meeting
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((meeting, i) => (
              <MeetingCard
                key={meeting._id}
                meeting={meeting}
                index={i}
                onClick={() => navigate(`/meeting/${meeting._id}`)}
                onDelete={() => setDeleteConfirm(meeting._id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Meeting">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Title *">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Q4 Strategy Review" required />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description…" rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date & Time *">
              <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </Field>
            <Field label="Num Speakers">
              <Input type="number" min={1} max={10} value={form.numSpeakers} onChange={(e) => setForm({ ...form, numSpeakers: parseInt(e.target.value) })} />
            </Field>
          </div>
          <Field label="Participants" hint="Comma-separated names">
            <Input value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} placeholder="Alice, Bob, Carol" />
          </Field>
          <Field label="Tags" hint="Comma-separated tags">
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="strategy, q4, product" />
          </Field>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={form.withDiarization} onChange={(e) => setForm({ ...form, withDiarization: e.target.checked })} className="w-4 h-4 accent-brand rounded" />
            <span className="text-sm text-slate-600">Enable speaker diarization</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost text-sm px-4 py-2 rounded-xl">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary text-sm px-5 py-2 rounded-xl">
              {creating ? "Creating…" : "Create Meeting"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Meeting?">
        <p className="text-sm text-slate-500 mb-6">This action is permanent and cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteConfirm(null)} className="btn-ghost text-sm px-4 py-2 rounded-xl">Cancel</button>
          <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-500 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-colors">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

function MeetingCard({ meeting, index, onClick, onDelete }) {
  const date = new Date(meeting.date);
  const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      className="card rounded-xl p-5 cursor-pointer hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 group animate-fade-up border border-surface-border"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "backwards" }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <h3 className="font-display font-semibold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors">
          {meeting.title}
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
        >
          ×
        </button>
      </div>

      {meeting.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">{meeting.description}</p>
      )}

      <div className="flex items-center justify-between">
        <StatusBadge status={meeting.jobStatus} />
        <span className="text-xs text-slate-400 font-mono">{formatted}</span>
      </div>

      {meeting.participants?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-surface-border">
          {meeting.participants.slice(0, 3).map((p) => (
            <span key={p} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{p}</span>
          ))}
          {meeting.participants.length > 3 && (
            <span className="text-xs text-slate-400">+{meeting.participants.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
}
