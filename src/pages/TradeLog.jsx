import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Plus, Trash2, X, Upload, ChevronDown, ChevronUp } from "lucide-react";

function Label({ children }) {
  return (
    <label className="text-[#555] text-xs uppercase tracking-widest block mb-2">
      {children}
    </label>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors placeholder-[#333] font-mono"
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors font-mono"
    >
      {children}
    </select>
  );
}

function Textarea({ ...props }) {
  return (
    <textarea
      {...props}
      rows={3}
      className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors placeholder-[#333] font-mono resize-none"
    />
  );
}

function ChartUpload({ label, value, onChange }) {
  const [preview, setPreview] = useState(value || null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("charts")
      .upload(filename, file, { contentType: file.type });
    if (!error) {
      const { data: urlData } = supabase.storage
        .from("charts")
        .getPublicUrl(filename);
      setPreview(urlData.publicUrl);
      onChange(urlData.publicUrl);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={label}
            className="w-full h-40 object-cover rounded-lg border border-[#2a2a35]"
          />
          <button
            onClick={() => { setPreview(null); onChange(""); }}
            className="absolute top-2 right-2 bg-[#0c0c0f]/80 text-[#f87171] rounded-full p-1 hover:bg-[#2e0d0d] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-32 border border-dashed border-[#2a2a35] rounded-lg cursor-pointer hover:border-[#c8f04a] transition-colors bg-[#0c0c0f]">
          {uploading ? (
            <span className="text-[#555] text-xs">Uploading...</span>
          ) : (
            <>
              <Upload size={20} className="text-[#444] mb-2" />
              <span className="text-[#444] text-xs">Click to upload chart</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}

function TradeForm({ onClose, onSaved, editTrade }) {
  const [instruments, setInstruments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [emotions, setEmotions] = useState([]);
  const [rules, setRules] = useState([]);
  const [dailyTarget, setDailyTarget] = useState(5);
  const [saving, setSaving] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Africa/Nairobi",
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    day: today,
    instrument_id: "",
    session_id: "",
    no_of_trades: 1,
    lot_size: "",
    initial_capital: "",
    pnl: "",
    outcome: "Win",
    trade_type: "Long",
    setup_id: "",
    daily_target: "",
    target_achieved: "Yes",
    followed_plan: "Yes",
    plan_notes: "",
    notes: "",
    improvement_areas: "",
    overall_feedback: "",
    chart_before: "",
    chart_after: "",
    selectedEmotions: [],
    rulesFollowed: {},
  });

  useEffect(() => {
    fetchFormData();
  }, []);

  async function fetchFormData() {
    const [ins, ses, set, emo, rul, cfg] = await Promise.all([
      supabase.from("instruments").select("*").order("created_at"),
      supabase.from("sessions").select("*").order("created_at"),
      supabase.from("setups").select("*").order("created_at"),
      supabase.from("emotions").select("*").order("created_at"),
      supabase.from("rules").select("*").order("created_at"),
      supabase.from("settings").select("*"),
    ]);
    setInstruments(ins.data || []);
    setSessions(ses.data || []);
    setSetups(set.data || []);
    setEmotions(emo.data || []);
    setRules(rul.data || []);
    const target = cfg.data?.find((d) => d.key === "daily_target")?.value || "5";
    setDailyTarget(parseFloat(target));

    // Build rules followed map
    const rulesMap = Object.fromEntries((rul.data || []).map((r) => [r.id, true]));

    if (editTrade) {
      // Editing — fetch existing emotions and rules for this trade
      const [existingEmotions, existingRules] = await Promise.all([
        supabase.from("trade_emotions").select("emotion_id").eq("trade_id", editTrade.id),
        supabase.from("trade_rules").select("rule_id, followed").eq("trade_id", editTrade.id),
      ]);

      const selectedEmotions = (existingEmotions.data || []).map((e) => e.emotion_id);
      const rulesFollowed = { ...rulesMap };
      (existingRules.data || []).forEach((r) => {
        rulesFollowed[r.rule_id] = r.followed;
      });

      // Use the trade's existing values — don't override with defaults
      setForm((f) => ({
        ...f,
        ...editTrade,
        daily_target: editTrade.daily_target || target,
        selectedEmotions,
        rulesFollowed,
      }));
    } else {
      // New trade — use defaults
      setForm((f) => ({
        ...f,
        instrument_id: ins.data?.[0]?.id || "",
        session_id: ses.data?.[0]?.id || "",
        setup_id: set.data?.[0]?.id || "",
        daily_target: target,
        rulesFollowed: rulesMap,
        selectedEmotions: [],
      }));
    }
  }

  function toggleEmotion(id) {
    setForm((f) => ({
      ...f,
      selectedEmotions: f.selectedEmotions.includes(id)
        ? f.selectedEmotions.filter((e) => e !== id)
        : [...f.selectedEmotions, id],
    }));
  }

  function toggleRule(id) {
    setForm((f) => ({
      ...f,
      rulesFollowed: { ...f.rulesFollowed, [id]: !f.rulesFollowed[id] },
    }));
  }

  async function handleSave() {
    if (!form.lot_size || !form.initial_capital || !form.pnl) return;
    setSaving(true);

    const tradeData = {
      date: form.date,
      day: new Date(form.date).toLocaleDateString("en-US", { weekday: "long" }),
      instrument_id: form.instrument_id,
      session_id: form.session_id,
      no_of_trades: form.no_of_trades,
      lot_size: parseFloat(form.lot_size),
      initial_capital: parseFloat(form.initial_capital),
      pnl: parseFloat(form.pnl),
      outcome: form.outcome,
      trade_type: form.trade_type,
      setup_id: form.setup_id || null,
      daily_target: parseFloat(form.daily_target),
      target_achieved: form.target_achieved,
      followed_plan: form.followed_plan,
      plan_notes: form.plan_notes,
      notes: form.notes,
      improvement_areas: form.improvement_areas,
      overall_feedback: form.overall_feedback,
      chart_before: form.chart_before,
      chart_after: form.chart_after,
    };

    let tradeId;

    if (editTrade) {
      const { data } = await supabase
        .from("trades")
        .update(tradeData)
        .eq("id", editTrade.id)
        .select()
        .single();
      tradeId = data.id;
      await supabase.from("trade_emotions").delete().eq("trade_id", tradeId);
      await supabase.from("trade_rules").delete().eq("trade_id", tradeId);
    } else {
      const { data } = await supabase
        .from("trades")
        .insert(tradeData)
        .select()
        .single();
      tradeId = data.id;
    }

    // Save emotions
    if (form.selectedEmotions.length > 0) {
      await supabase.from("trade_emotions").insert(
        form.selectedEmotions.map((eid) => ({ trade_id: tradeId, emotion_id: eid }))
      );
    }

    // Save rules
    const ruleEntries = Object.entries(form.rulesFollowed).map(([rid, followed]) => ({
      trade_id: tradeId,
      rule_id: rid,
      followed,
    }));
    if (ruleEntries.length > 0) {
      await supabase.from("trade_rules").insert(ruleEntries);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  const f = form;
  const set_ = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-[#14141a] border border-[#1f1f2e] rounded-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f2e]">
          <h2 className="text-white text-sm font-semibold uppercase tracking-widest">
            {editTrade ? "Edit Trade" : "Log New Trade"}
          </h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Basic Info */}
          <div>
            <p className="text-[#c8f04a] text-xs uppercase tracking-widest mb-4 font-semibold">
              01 — Basic Info
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={f.date} onChange={(e) => set_("date", e.target.value)} />
              </div>
              <div>
                <Label>Instrument</Label>
                <Select value={f.instrument_id} onChange={(e) => set_("instrument_id", e.target.value)}>
                  {instruments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Select value={f.session_id} onChange={(e) => set_("session_id", e.target.value)}>
                  {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Trade Type</Label>
                <Select value={f.trade_type} onChange={(e) => set_("trade_type", e.target.value)}>
                  <option>Long</option>
                  <option>Short</option>
                </Select>
              </div>
              <div>
                <Label>Setup</Label>
                <Select value={f.setup_id} onChange={(e) => set_("setup_id", e.target.value)}>
                  <option value="">— Select setup —</option>
                  {setups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>No. of Trades</Label>
                <Input type="number" min="1" value={f.no_of_trades} onChange={(e) => set_("no_of_trades", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Financials */}
          <div>
            <p className="text-[#c8f04a] text-xs uppercase tracking-widest mb-4 font-semibold">
              02 — Financials
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Initial Capital ($)</Label>
                <Input type="number" placeholder="e.g. 500" value={f.initial_capital} onChange={(e) => set_("initial_capital", e.target.value)} />
              </div>
              <div>
                <Label>Lot Size</Label>
                <Input type="number" step="0.01" placeholder="e.g. 0.01" value={f.lot_size} onChange={(e) => set_("lot_size", e.target.value)} />
              </div>
              <div>
                <Label>P&L ($)</Label>
                <Input type="number" placeholder="e.g. 12.50 or -5" value={f.pnl} onChange={(e) => set_("pnl", e.target.value)} />
              </div>
              <div>
                <Label>Outcome</Label>
                <Select value={f.outcome} onChange={(e) => set_("outcome", e.target.value)}>
                  <option>Win</option>
                  <option>Loss</option>
                  <option>Break-even</option>
                </Select>
              </div>
              <div>
                <Label>Daily Target ($)</Label>
                <Input type="number" value={f.daily_target} onChange={(e) => set_("daily_target", e.target.value)} />
              </div>
              <div>
                <Label>Target Achieved?</Label>
                <Select value={f.target_achieved} onChange={(e) => set_("target_achieved", e.target.value)}>
                  <option>Yes</option>
                  <option>No</option>
                  <option>Partial</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Discipline */}
          <div>
            <p className="text-[#c8f04a] text-xs uppercase tracking-widest mb-4 font-semibold">
              03 — Discipline & Emotions
            </p>
            <div className="space-y-4">
              <div>
                <Label>Followed Plan?</Label>
                <Select value={f.followed_plan} onChange={(e) => set_("followed_plan", e.target.value)}>
                  <option>Yes</option>
                  <option>Partially</option>
                  <option>No</option>
                </Select>
              </div>

              {/* Rules checklist */}
              {rules.length > 0 && (
                <div>
                  <Label>Rules Checklist</Label>
                  <div className="space-y-2">
                    {rules.map((rule, i) => (
                      <div
                        key={rule.id}
                        onClick={() => toggleRule(rule.id)}
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors
                          ${f.rulesFollowed[rule.id]
                            ? "bg-[#1a1f0d] border-[#c8f04a]/20 text-white"
                            : "bg-[#1f1f2e] border-[#2a2a35] text-[#666]"}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors
                          ${f.rulesFollowed[rule.id] ? "bg-[#c8f04a] border-[#c8f04a]" : "border-[#444]"}`}>
                          {f.rulesFollowed[rule.id] && (
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#0c0c0f" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                          )}
                        </div>
                        <span className="text-xs leading-relaxed">
                          <span className="text-[#c8f04a] font-bold mr-2">{String(i + 1).padStart(2, "0")}</span>
                          {rule.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Plan Notes (what did you break or skip?)</Label>
                <Textarea placeholder="Explain any deviations from your plan..." value={f.plan_notes} onChange={(e) => set_("plan_notes", e.target.value)} />
              </div>

              {/* Emotions */}
              {emotions.length > 0 && (
                <div>
                  <Label>Emotions (select all that apply)</Label>
                  <div className="flex flex-wrap gap-2">
                    {emotions.map((emo) => (
                      <button
                        key={emo.id}
                        onClick={() => toggleEmotion(emo.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
                          ${f.selectedEmotions.includes(emo.id)
                            ? "bg-[#1a1f0d] border-[#c8f04a]/30 text-[#c8f04a]"
                            : "bg-[#1f1f2e] border-[#2a2a35] text-[#666] hover:text-white"}`}
                      >
                        {emo.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div>
            <p className="text-[#c8f04a] text-xs uppercase tracking-widest mb-4 font-semibold">
              04 — Charts
            </p>
            <div className="grid grid-cols-2 gap-4">
              <ChartUpload
                label="Chart Before Entry"
                value={f.chart_before}
                onChange={(url) => set_("chart_before", url)}
              />
              <ChartUpload
                label="Chart After Entry"
                value={f.chart_after}
                onChange={(url) => set_("chart_after", url)}
              />
            </div>
          </div>

          {/* Notes & Reflection */}
          <div>
            <p className="text-[#c8f04a] text-xs uppercase tracking-widest mb-4 font-semibold">
              05 — Notes & Reflection
            </p>
            <div className="space-y-4">
              <div>
                <Label>Trade Notes (why it worked / didn't / why you missed it)</Label>
                <Textarea placeholder="Write your trade analysis here..." value={f.notes} onChange={(e) => set_("notes", e.target.value)} />
              </div>
              <div>
                <Label>Areas of Improvement</Label>
                <Textarea placeholder="What would you do differently?" value={f.improvement_areas} onChange={(e) => set_("improvement_areas", e.target.value)} />
              </div>
              <div>
                <Label>Overall Feedback</Label>
                <Textarea placeholder="General thoughts on this trade..." value={f.overall_feedback} onChange={(e) => set_("overall_feedback", e.target.value)} />
              </div>
            </div>
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
            className="flex-2 flex-1 bg-[#c8f04a] text-[#0c0c0f] font-semibold text-sm rounded-xl py-3 uppercase tracking-widest hover:bg-[#b8e03a] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : editTrade ? "Save Changes" : "Log Trade"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }) {
  const styles = {
    Win: "bg-[#0d2e1a] text-[#4ade80]",
    Loss: "bg-[#2e0d0d] text-[#f87171]",
    "Break-even": "bg-[#1f1f2e] text-[#888]",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[outcome]}`}>
      {outcome}
    </span>
  );
}

export default function TradeLog() {
  const [trades, setTrades] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterOutcome, setFilterOutcome] = useState("All");
  const [filterInstrument, setFilterInstrument] = useState("All");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [tr, ins, ses, set] = await Promise.all([
      supabase.from("trades").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("instruments").select("*"),
      supabase.from("sessions").select("*"),
      supabase.from("setups").select("*"),
    ]);
    setTrades(tr.data || []);
    setInstruments(ins.data || []);
    setSessions(ses.data || []);
    setSetups(set.data || []);
    setLoading(false);
  }

  async function deleteTrade(id) {
    await supabase.from("trades").delete().eq("id", id);
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }

  function getInstrumentName(id) {
    return instruments.find((i) => i.id === id)?.name || "—";
  }
  function getSessionName(id) {
    return sessions.find((s) => s.id === id)?.name || "—";
  }
  function getSetupName(id) {
    return setups.find((s) => s.id === id)?.name || "—";
  }

  const filtered = trades.filter((t) => {
    if (filterOutcome !== "All" && t.outcome !== filterOutcome) return false;
    if (filterInstrument !== "All" && t.instrument_id !== filterInstrument) return false;
    return true;
  });

  const fmt = (n) => {
    const num = parseFloat(n);
    return (num >= 0 ? "+" : "") + "$" + Math.abs(num).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#555] text-sm">
        Loading trades...
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-lg font-semibold tracking-wide">Trade Log</h1>
          <p className="text-[#555] text-xs mt-1">{trades.length} trade{trades.length !== 1 ? "s" : ""} recorded</p>
        </div>
        <button
          onClick={() => { setEditTrade(null); setShowForm(true); }}
          className="bg-[#c8f04a] text-[#0c0c0f] font-semibold text-xs rounded-xl px-5 py-2.5 uppercase tracking-widest hover:bg-[#b8e03a] transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> Log Trade
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[#444] text-xs uppercase tracking-widest">Filter:</span>
        {["All", "Win", "Loss", "Break-even"].map((o) => (
          <button
            key={o}
            onClick={() => setFilterOutcome(o)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
              ${filterOutcome === o
                ? "bg-[#1a1f0d] border-[#c8f04a]/30 text-[#c8f04a]"
                : "bg-[#14141a] border-[#2a2a35] text-[#666] hover:text-white"}`}
          >
            {o}
          </button>
        ))}
        <span className="text-[#444] text-xs uppercase tracking-widest ml-2">Pair:</span>
        <select
          value={filterInstrument}
          onChange={(e) => setFilterInstrument(e.target.value)}
          className="bg-[#14141a] border border-[#2a2a35] text-[#666] text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#c8f04a] font-mono"
        >
          <option value="All">All</option>
          {instruments.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </div>

      {/* Trade list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-[#444] text-sm">No trades found.</p>
          <p className="text-[#333] text-xs mt-1">Hit Log Trade to record your first trade.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((trade) => (
            <div key={trade.id} className="bg-[#14141a] border border-[#1f1f2e] rounded-xl overflow-hidden">
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 items-center">
                  <div>
                    <p className="text-white text-sm font-medium">{getInstrumentName(trade.instrument_id)}</p>
                    <p className="text-[#555] text-xs">{trade.date} · {trade.day?.slice(0,3)}</p>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${trade.trade_type === "Long" ? "bg-[#0d2e1a] text-[#4ade80]" : "bg-[#2e0d0d] text-[#f87171]"}`}>
                      {trade.trade_type}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[#555] text-xs">Session</p>
                    <p className="text-white text-xs">{getSessionName(trade.session_id)}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[#555] text-xs">Lot</p>
                    <p className="text-white text-xs">{trade.lot_size}</p>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${parseFloat(trade.pnl) >= 0 ? "text-[#c8f04a]" : "text-[#f87171]"}`}>
                      {fmt(trade.pnl)}
                    </p>
                    <OutcomeBadge outcome={trade.outcome} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditTrade(trade); setShowForm(true); }}
                    className="text-[#444] hover:text-[#c8f04a] transition-colors p-1"
                  >
                    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11.5 2.5l2 2-9 9H2.5v-2l9-9z"/></svg>
                  </button>
                  <button
                    onClick={() => deleteTrade(trade.id)}
                    className="text-[#444] hover:text-[#f87171] transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
                    className="text-[#444] hover:text-white transition-colors p-1"
                  >
                    {expandedId === trade.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === trade.id && (
                <div className="border-t border-[#1f1f2e] px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div><p className="text-[#555] mb-1">Setup</p><p className="text-white">{getSetupName(trade.setup_id)}</p></div>
                    <div><p className="text-[#555] mb-1">Initial Capital</p><p className="text-white">${parseFloat(trade.initial_capital).toFixed(2)}</p></div>
                    <div><p className="text-[#555] mb-1">No. of Trades</p><p className="text-white">{trade.no_of_trades}</p></div>
                    <div><p className="text-[#555] mb-1">Daily Target</p><p className="text-white">${parseFloat(trade.daily_target).toFixed(2)}</p></div>
                    <div><p className="text-[#555] mb-1">Target Achieved</p><p className="text-white">{trade.target_achieved}</p></div>
                    <div><p className="text-[#555] mb-1">Followed Plan</p><p className="text-white">{trade.followed_plan}</p></div>
                  </div>

                  {trade.notes && <div><p className="text-[#555] text-xs mb-1">Trade Notes</p><p className="text-white text-xs leading-relaxed">{trade.notes}</p></div>}
                  {trade.plan_notes && <div><p className="text-[#555] text-xs mb-1">Plan Notes</p><p className="text-white text-xs leading-relaxed">{trade.plan_notes}</p></div>}
                  {trade.improvement_areas && <div><p className="text-[#555] text-xs mb-1">Areas of Improvement</p><p className="text-white text-xs leading-relaxed">{trade.improvement_areas}</p></div>}
                  {trade.overall_feedback && <div><p className="text-[#555] text-xs mb-1">Overall Feedback</p><p className="text-white text-xs leading-relaxed">{trade.overall_feedback}</p></div>}

                  {/* Charts */}
                  {(trade.chart_before || trade.chart_after) && (
                    <div className="grid grid-cols-2 gap-3">
                      {trade.chart_before && (
                        <div>
                          <p className="text-[#555] text-xs mb-2">Before Entry</p>
                          <img src={trade.chart_before} alt="Before" className="w-full rounded-lg border border-[#2a2a35]" />
                        </div>
                      )}
                      {trade.chart_after && (
                        <div>
                          <p className="text-[#555] text-xs mb-2">After Entry</p>
                          <img src={trade.chart_after} alt="After" className="w-full rounded-lg border border-[#2a2a35]" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <TradeForm
          onClose={() => setShowForm(false)}
          onSaved={fetchAll}
          editTrade={editTrade}
        />
      )}
    </div>
  );
}
