import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";

const TYPES = ["Weekly Review", "Lesson Learned", "Mindset", "Plan Update"];

const typeColors = {
  "Weekly Review": { bg: "bg-[#0d1f2e]", border: "border-[#1a4a6e]/30", text: "text-[#60a5fa]", dot: "bg-[#60a5fa]" },
  "Lesson Learned": { bg: "bg-[#1a1f0d]", border: "border-[#c8f04a]/20", text: "text-[#c8f04a]", dot: "bg-[#c8f04a]" },
  "Mindset": { bg: "bg-[#1f0d2e]", border: "border-[#a855f7]/20", text: "text-[#a855f7]", dot: "bg-[#a855f7]" },
  "Plan Update": { bg: "bg-[#2e1a0d]", border: "border-[#f97316]/20", text: "text-[#f97316]", dot: "bg-[#f97316]" },
};

function ReflectionForm({ onClose, onSaved, editItem }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "Weekly Review",
    title: "",
    content: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) setForm(editItem);
  }, [editItem]);

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    if (editItem) {
      await supabase.from("reflections").update(form).eq("id", editItem.id);
    } else {
      await supabase.from("reflections").insert(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  const set_ = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-[#14141a] border border-[#1f1f2e] rounded-2xl w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f2e]">
          <h2 className="text-white text-sm font-semibold uppercase tracking-widest">
            {editItem ? "Edit Reflection" : "New Reflection"}
          </h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-[#555] text-xs uppercase tracking-widest block mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((type) => {
                const c = typeColors[type];
                const active = form.type === type;
                return (
                  <button
                    key={type}
                    onClick={() => set_("type", type)}
                    className={`px-3 py-2.5 rounded-lg border text-xs text-left transition-colors flex items-center gap-2
                      ${active ? `${c.bg} ${c.border} ${c.text}` : "bg-[#1f1f2e] border-[#2a2a35] text-[#555] hover:text-white"}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? c.dot : "bg-[#444]"}`} />
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-[#555] text-xs uppercase tracking-widest block mb-2">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set_("date", e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors font-mono"
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-[#555] text-xs uppercase tracking-widest block mb-2">Title</label>
            <input
              type="text"
              placeholder="e.g. Week 1 — Lessons from overtrading"
              value={form.title}
              onChange={(e) => set_("title", e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors placeholder-[#333] font-mono"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-[#555] text-xs uppercase tracking-widest block mb-2">Content</label>
            <textarea
              rows={8}
              placeholder="Write your thoughts, lessons, review or plan update here..."
              value={form.content}
              onChange={(e) => set_("content", e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors placeholder-[#333] font-mono resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1f1f2e] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-transparent border border-[#2a2a35] text-[#666] text-sm rounded-xl py-3 hover:text-white hover:border-[#444] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#c8f04a] text-[#0c0c0f] font-semibold text-sm rounded-xl py-3 uppercase tracking-widest hover:bg-[#b8e03a] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : editItem ? "Save Changes" : "Save Reflection"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Reflections() {
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState("All");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from("reflections")
      .select("*")
      .order("date", { ascending: false });
    setReflections(data || []);
    setLoading(false);
  }

  async function deleteReflection(id) {
    await supabase.from("reflections").delete().eq("id", id);
    setReflections((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = filterType === "All"
    ? reflections
    : reflections.filter((r) => r.type === filterType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#555] text-sm">
        Loading reflections...
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-lg font-semibold tracking-wide">Reflections</h1>
          <p className="text-[#555] text-xs mt-1">
            Weekly reviews, lessons, mindset notes and plan updates.
          </p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="bg-[#c8f04a] text-[#0c0c0f] font-semibold text-xs rounded-xl px-5 py-2.5 uppercase tracking-widest hover:bg-[#b8e03a] transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> New Reflection
        </button>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        {["All", ...TYPES].map((type) => {
          const c = typeColors[type];
          const active = filterType === type;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1.5
                ${active && type !== "All"
                  ? `${c.bg} ${c.border} ${c.text}`
                  : active && type === "All"
                  ? "bg-[#1a1f0d] border-[#c8f04a]/30 text-[#c8f04a]"
                  : "bg-[#14141a] border-[#2a2a35] text-[#555] hover:text-white"}`}
            >
              {type !== "All" && (
                <div className={`w-1.5 h-1.5 rounded-full ${active ? c.dot : "bg-[#444]"}`} />
              )}
              {type}
            </button>
          );
        })}
      </div>

      {/* Reflections list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-[#444] text-sm">No reflections yet.</p>
          <p className="text-[#333] text-xs mt-1">
            Hit New Reflection to write your first weekly review or lesson.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const c = typeColors[r.type] || typeColors["Weekly Review"];
            const isExpanded = expandedId === r.id;
            return (
              <div
                key={r.id}
                className={`border rounded-xl overflow-hidden transition-colors ${c.bg} ${c.border}`}
              >
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${c.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium ${c.text}`}>{r.type}</span>
                      <span className="text-[#444] text-xs">·</span>
                      <span className="text-[#555] text-xs font-mono">{r.date}</span>
                    </div>
                    <p className="text-white text-sm font-medium truncate">{r.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditItem(r); setShowForm(true); }}
                      className="text-[#444] hover:text-[#c8f04a] transition-colors p-1"
                    >
                      <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M11.5 2.5l2 2-9 9H2.5v-2l9-9z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteReflection(r.id)}
                      className="text-[#444] hover:text-[#f87171] transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="text-[#444] hover:text-white transition-colors p-1"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/5">
                    <p className="text-[#aaa] text-sm leading-relaxed whitespace-pre-wrap">
                      {r.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ReflectionForm
          onClose={() => setShowForm(false)}
          onSaved={fetchAll}
          editItem={editItem}
        />
      )}
    </div>
  );
}
