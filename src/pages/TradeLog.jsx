import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Plus, X, Upload } from "lucide-react";

function getTodayNairobi() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

function getYesterdayNairobi() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

function getLastWeekRange() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diff);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  return {
    from: lastMonday.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }),
    to: lastSunday.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }),
  };
}

function Label({ children }) {
  return (
    <label className="text-xs uppercase tracking-widest block mb-2" style={{ color: "var(--text-muted)" }}>
      {children}
    </label>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full text-sm rounded-lg px-4 py-2.5 outline-none font-mono transition-colors"
      style={{ background: "var(--bg-primary)", border: "0.5px solid var(--border-light)", color: "var(--text-primary)" }}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full text-sm rounded-lg px-4 py-2.5 outline-none font-mono transition-colors"
      style={{ background: "var(--bg-primary)", border: "0.5px solid var(--border-light)", color: "var(--text-primary)" }}
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
      className="w-full text-sm rounded-lg px-4 py-2.5 outline-none font-mono resize-none transition-colors"
      style={{ background: "var(--bg-primary)", border: "0.5px solid var(--border-light)", color: "var(--text-primary)" }}
    />
  );
}

function ChartUpload({ label, value, onChange }) {
  const [preview, setPreview] = useState(value || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setPreview(value || null); }, [value]);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("charts").upload(filename, file, { contentType: file.type });
    if (!error) {
      const { data: urlData } = supabase.storage.from("charts").getPublicUrl(filename);
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
          <img src={preview} alt={label} className="w-full h-32 object-cover rounded-lg" style={{ border: "0.5px solid var(--border-light)" }} />
          <button
            onClick={() => { setPreview(null); onChange(""); }}
            className="absolute top-2 right-2 rounded-full p-1"
            style={{ background: "var(--bg-primary)", color: "var(--loss)" }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-32 rounded-lg cursor-pointer transition-colors" style={{ border: "1px dashed var(--border-light)", background: "var(--bg-primary)" }}>
          {uploading ? (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Uploading...</span>
          ) : (
            <>
              <Upload size={18} style={{ color: "var(--text-faint)" }} className="mb-2" />
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>Upload chart</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
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
  const [saving, setSaving] = useState(false);
  const [formReady, setFormReady] = useState(false);

  const [form, setForm] = useState({
    date: getTodayNairobi(),
    instrument_id: "",
    session_id: "",
    pnl: "",
    outcome: "",
    trade_type: "",
    setup_id: "",
    target_achieved: "",
    followed_plan: "",
    plan_notes: "",
    notes: "",
    improvement_areas: "",
    overall_feedback: "",
    chart_before: "",
    chart_after: "",
    chart_other: "",
    selectedEmotions: [],
    rulesFollowed: {},
  });

  useEffect(() => { fetchFormData(); }, []);

  async function fetchFormData() {
    const [ins, ses, set, emo, rul] = await Promise.all([
      supabase.from("instruments").select("*").order("created_at"),
      supabase.from("sessions").select("*").order("created_at"),
      supabase.from("setups").select("*").order("created_at"),
      supabase.from("emotions").select("*").order("created_at"),
      supabase.from("rules").select("*").order("created_at"),
    ]);
    setInstruments(ins.data || []);
    setSessions(ses.data || []);
    setSetups(set.data || []);
    setEmotions(emo.data || []);
    setRules(rul.data || []);
    const rulesMap = Object.fromEntries((rul.data || []).map((r) => [r.id, true]));

    if (editTrade) {
      const [existingEmotions, existingRules] = await Promise.all([
        supabase.from("trade_emotions").select("emotion_id").eq("trade_id", editTrade.id),
        supabase.from("trade_rules").select("rule_id, followed").eq("trade_id", editTrade.id),
      ]);
      const selectedEmotions = (existingEmotions.data || []).map((e) => e.emotion_id);
      const rulesFollowed = { ...rulesMap };
      (existingRules.data || []).forEach((r) => { rulesFollowed[r.rule_id] = r.followed; });
      setForm((f) => ({ ...f, ...editTrade, selectedEmotions, rulesFollowed }));
    } else {
      setForm((f) => ({ ...f, rulesFollowed: rulesMap }));
    }
    setFormReady(true);
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
    setForm((f) => ({ ...f, rulesFollowed: { ...f.rulesFollowed, [id]: !f.rulesFollowed[id] } }));
  }

  async function handleSave() {
    if (!form.pnl || !form.outcome || !form.trade_type) return;
    setSaving(true);
    const tradeData = {
      date: form.date,
      day: new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }),
      instrument_id: form.instrument_id || null,
      session_id: form.session_id || null,
      pnl: parseFloat(form.pnl),
      outcome: form.outcome,
      trade_type: form.trade_type,
      setup_id: form.setup_id || null,
      target_achieved: form.target_achieved || null,
      followed_plan: form.followed_plan || null,
      plan_notes: form.plan_notes,
      notes: form.notes,
      improvement_areas: form.improvement_areas,
      overall_feedback: form.overall_feedback,
      chart_before: form.chart_before,
      chart_after: form.chart_after,
      chart_other: form.chart_other,
    };

    let tradeId;
    if (editTrade) {
      const { data } = await supabase.from("trades").update(tradeData).eq("id", editTrade.id).select().single();
      tradeId = data.id;
      await supabase.from("trade_emotions").delete().eq("trade_id", tradeId);
      await supabase.from("trade_rules").delete().eq("trade_id", tradeId);
    } else {
      const { data } = await supabase.from("trades").insert(tradeData).select().single();
      tradeId = data.id;
    }

    if (form.selectedEmotions.length > 0) {
      await supabase.from("trade_emotions").insert(
        form.selectedEmotions.map((eid) => ({ trade_id: tradeId, emotion_id: eid }))
      );
    }

    const ruleEntries = Object.entries(form.rulesFollowed).map(([rid, followed]) => ({
      trade_id: tradeId, rule_id: rid, followed,
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

  if (!formReady) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="rounded-2xl px-10 py-8 text-sm" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
          Loading form...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="rounded-2xl w-full max-w-2xl" style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>
            {editTrade ? "Edit Trade" : "Log New Trade"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 01 Basic Info */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-4 font-semibold" style={{ color: "var(--accent)" }}>01 — Basic Info</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date</Label><Input type="date" value={f.date} onChange={(e) => set_("date", e.target.value)} /></div>
              <div>
                <Label>Instrument</Label>
                <Select value={f.instrument_id} onChange={(e) => set_("instrument_id", e.target.value)}>
                  <option value="">— Select —</option>
                  {instruments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Select value={f.session_id} onChange={(e) => set_("session_id", e.target.value)}>
                  <option value="">— Select —</option>
                  {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Trade Type</Label>
                <Select value={f.trade_type} onChange={(e) => set_("trade_type", e.target.value)}>
                  <option value="">— Select —</option>
                  <option>Long</option>
                  <option>Short</option>
                </Select>
              </div>
              <div>
                <Label>Setup</Label>
                <Select value={f.setup_id} onChange={(e) => set_("setup_id", e.target.value)}>
                  <option value="">— Select —</option>
                  {setups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Outcome</Label>
                <Select value={f.outcome} onChange={(e) => set_("outcome", e.target.value)}>
                  <option value="">— Select —</option>
                  <option>Win</option>
                  <option>Loss</option>
                  <option>Break-even</option>
                </Select>
              </div>
            </div>
          </div>

          {/* 02 Financials */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-4 font-semibold" style={{ color: "var(--accent)" }}>02 — Financials</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>P&L ($)</Label>
                <Input type="number" placeholder="e.g. 12.50 or -5" value={f.pnl} onChange={(e) => set_("pnl", e.target.value)} />
              </div>
              <div>
                <Label>Target Achieved?</Label>
                <Select value={f.target_achieved} onChange={(e) => set_("target_achieved", e.target.value)}>
                  <option value="">— Select —</option>
                  <option>Yes</option>
                  <option>No</option>
                  <option>Partial</option>
                </Select>
              </div>
            </div>
          </div>

          {/* 03 Discipline */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-4 font-semibold" style={{ color: "var(--accent)" }}>03 — Discipline & Emotions</p>
            <div className="space-y-4">
              <div>
                <Label>Followed Plan?</Label>
                <Select value={f.followed_plan} onChange={(e) => set_("followed_plan", e.target.value)}>
                  <option value="">— Select —</option>
                  <option>Yes</option>
                  <option>Partially</option>
                  <option>No</option>
                </Select>
              </div>

              {rules.length > 0 && (
                <div>
                  <Label>Rules Checklist</Label>
                  <div className="space-y-2">
                    {rules.map((rule, i) => (
                      <div
                        key={rule.id}
                        onClick={() => toggleRule(rule.id)}
                        className="flex items-start gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors"
                        style={{
                          background: f.rulesFollowed[rule.id] ? "var(--accent-dim)" : "var(--bg-tertiary)",
                          border: `0.5px solid ${f.rulesFollowed[rule.id] ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--border-light)"}`,
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center mt-0.5 flex-shrink-0"
                          style={{
                            background: f.rulesFollowed[rule.id] ? "var(--accent)" : "transparent",
                            border: `1.5px solid ${f.rulesFollowed[rule.id] ? "var(--accent)" : "var(--text-muted)"}`,
                          }}
                        >
                          {f.rulesFollowed[rule.id] && (
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#0c0c0f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs leading-relaxed" style={{ color: f.rulesFollowed[rule.id] ? "var(--text-primary)" : "var(--text-muted)" }}>
                          <span className="font-bold mr-2" style={{ color: "var(--accent)" }}>{String(i + 1).padStart(2, "0")}</span>
                          {rule.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Plan Notes</Label>
                <Textarea placeholder="Explain any deviations from your plan..." value={f.plan_notes} onChange={(e) => set_("plan_notes", e.target.value)} />
              </div>

              {emotions.length > 0 && (
                <div>
                  <Label>Emotions</Label>
                  <div className="flex flex-wrap gap-2">
                    {emotions.map((emo) => (
                      <button
                        key={emo.id}
                        onClick={() => toggleEmotion(emo.id)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                        style={{
                          background: f.selectedEmotions.includes(emo.id) ? "var(--accent-dim)" : "var(--bg-tertiary)",
                          border: `0.5px solid ${f.selectedEmotions.includes(emo.id) ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--border-light)"}`,
                          color: f.selectedEmotions.includes(emo.id) ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        {emo.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 04 Charts */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-4 font-semibold" style={{ color: "var(--accent)" }}>04 — Charts</p>
            <div className="grid grid-cols-3 gap-4">
              <ChartUpload label="Before Entry" value={f.chart_before} onChange={(url) => set_("chart_before", url)} />
              <ChartUpload label="After Entry" value={f.chart_after} onChange={(url) => set_("chart_after", url)} />
              <ChartUpload label="Any Other" value={f.chart_other} onChange={(url) => set_("chart_other", url)} />
            </div>
          </div>

          {/* 05 Notes */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-4 font-semibold" style={{ color: "var(--accent)" }}>05 — Notes & Reflection</p>
            <div className="space-y-4">
              <div><Label>Trade Notes</Label><Textarea placeholder="Why it worked / didn't / why you missed it..." value={f.notes} onChange={(e) => set_("notes", e.target.value)} /></div>
              <div><Label>Areas of Improvement</Label><Textarea placeholder="What would you do differently?" value={f.improvement_areas} onChange={(e) => set_("improvement_areas", e.target.value)} /></div>
              <div><Label>Overall Feedback</Label><Textarea placeholder="General thoughts on this trade..." value={f.overall_feedback} onChange={(e) => set_("overall_feedback", e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex gap-3" style={{ borderTop: "0.5px solid var(--border)" }}>
          <button onClick={onClose} className="flex-1 text-sm rounded-xl py-3 transition-colors" style={{ border: "0.5px solid var(--border-light)", color: "var(--text-muted)", background: "transparent" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 font-semibold text-sm rounded-xl py-3 uppercase tracking-widest transition-colors disabled:opacity-50" style={{ background: "var(--accent)", color: "#0c0c0f" }}>
            {saving ? "Saving..." : editTrade ? "Save Changes" : "Log Trade"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TradeDetailModal({ trade, instruments, sessions, setups, emotions, tradeEmotions, rules, tradeRules, onClose, onEdit }) {
  const getInstrumentName = (id) => instruments.find((i) => i.id === id)?.name || "—";
  const getSessionName = (id) => sessions.find((s) => s.id === id)?.name || "—";
  const getSetupName = (id) => setups.find((s) => s.id === id)?.name || "—";
  const fmt = (n) => (parseFloat(n) >= 0 ? "+" : "") + "$" + Math.abs(parseFloat(n)).toFixed(2);

  const myEmotions = tradeEmotions
    .filter((te) => te.trade_id === trade.id)
    .map((te) => emotions.find((e) => e.id === te.emotion_id)?.name)
    .filter(Boolean);

  const myRules = tradeRules
    .filter((tr) => tr.trade_id === trade.id)
    .map((tr) => ({ rule: rules.find((r) => r.id === tr.rule_id)?.description, followed: tr.followed }))
    .filter((r) => r.rule);

  const pnl = parseFloat(trade.pnl);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-2xl w-full max-w-2xl" style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ background: pnl >= 0 ? "var(--accent)" : "var(--loss)" }} />
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {getInstrumentName(trade.instrument_id)}
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {trade.date} · {trade.day}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onEdit}
              className="text-xs px-4 py-2 rounded-lg font-medium uppercase tracking-widest transition-colors"
              style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}
            >
              Edit
            </button>
            <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* P&L Hero */}
          <div className="rounded-xl p-5 text-center" style={{ background: pnl >= 0 ? "var(--accent-dim)" : "var(--loss-dim)", border: `0.5px solid ${pnl >= 0 ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "color-mix(in srgb, var(--loss) 20%, transparent)"}` }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>P&L</p>
            <p className="text-4xl font-bold font-mono" style={{ color: pnl >= 0 ? "var(--accent)" : "var(--loss)" }}>
              {fmt(trade.pnl)}
            </p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: trade.outcome === "Win" ? "var(--win-dim)" : trade.outcome === "Loss" ? "var(--loss-dim)" : "var(--bg-tertiary)", color: trade.outcome === "Win" ? "#4ade80" : trade.outcome === "Loss" ? "var(--loss)" : "var(--text-muted)" }}>
                {trade.outcome}
              </span>
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: trade.trade_type === "Long" ? "var(--win-dim)" : "var(--loss-dim)", color: trade.trade_type === "Long" ? "#4ade80" : "var(--loss)" }}>
                {trade.trade_type}
              </span>
              {trade.target_achieved && (
                <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                  Target: {trade.target_achieved}
                </span>
              )}
            </div>
          </div>

          {/* Trade Details */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--accent)" }}>Trade Details</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Session", value: getSessionName(trade.session_id) },
                { label: "Setup", value: getSetupName(trade.setup_id) },
                { label: "Followed Plan", value: trade.followed_plan || "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg px-4 py-3" style={{ background: "var(--bg-tertiary)", border: "0.5px solid var(--border-light)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          {myRules.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--accent)" }}>Rules Checklist</p>
              <div className="space-y-2">
                {myRules.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: r.followed ? "var(--accent-dim)" : "var(--loss-dim)", border: `0.5px solid ${r.followed ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "color-mix(in srgb, var(--loss) 20%, transparent)"}` }}>
                    <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: r.followed ? "var(--accent)" : "var(--loss)" }}>
                      {r.followed
                        ? <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#0c0c0f" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                        : <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M2 2l6 6M8 2l-6 6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                      }
                    </div>
                    <span className="text-xs" style={{ color: "var(--text-primary)" }}>{r.rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emotions */}
          {myEmotions.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--accent)" }}>Emotions</p>
              <div className="flex flex-wrap gap-2">
                {myEmotions.map((e) => (
                  <span key={e} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-tertiary)", border: "0.5px solid var(--border-light)", color: "var(--text-secondary)" }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          {(trade.chart_before || trade.chart_after || trade.chart_other) && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: "var(--accent)" }}>Charts</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {trade.chart_before && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Before Entry</p>
                    <img src={trade.chart_before} alt="Before" className="w-full rounded-lg" style={{ border: "0.5px solid var(--border-light)" }} />
                  </div>
                )}
                {trade.chart_after && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>After Entry</p>
                    <img src={trade.chart_after} alt="After" className="w-full rounded-lg" style={{ border: "0.5px solid var(--border-light)" }} />
                  </div>
                )}
                {trade.chart_other && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Any Other</p>
                    <img src={trade.chart_other} alt="Other" className="w-full rounded-lg" style={{ border: "0.5px solid var(--border-light)" }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {(trade.notes || trade.plan_notes || trade.improvement_areas || trade.overall_feedback) && (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--accent)" }}>Notes & Reflection</p>
              {trade.notes && (
                <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-tertiary)", border: "0.5px solid var(--border-light)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Trade Notes</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{trade.notes}</p>
                </div>
              )}
              {trade.plan_notes && (
                <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-tertiary)", border: "0.5px solid var(--border-light)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Plan Notes</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{trade.plan_notes}</p>
                </div>
              )}
              {trade.improvement_areas && (
                <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-tertiary)", border: "0.5px solid var(--border-light)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Areas of Improvement</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{trade.improvement_areas}</p>
                </div>
              )}
              {trade.overall_feedback && (
                <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-tertiary)", border: "0.5px solid var(--border-light)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Overall Feedback</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{trade.overall_feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4" style={{ borderTop: "0.5px solid var(--border)" }}>
          <button onClick={onClose} className="w-full text-sm rounded-xl py-3 transition-colors" style={{ border: "0.5px solid var(--border-light)", color: "var(--text-muted)", background: "transparent" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TradeLog() {
  const [trades, setTrades] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [emotions, setEmotions] = useState([]);
  const [tradeEmotions, setTradeEmotions] = useState([]);
  const [rules, setRules] = useState([]);
  const [tradeRules, setTradeRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [viewTrade, setViewTrade] = useState(null);
  const [filterOutcome, setFilterOutcome] = useState("All");
  const [filterInstrument, setFilterInstrument] = useState("All");
  const [activePeriod, setActivePeriod] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [tr, ins, ses, set, emo, te, rul, trul] = await Promise.all([
      supabase.from("trades").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("instruments").select("*"),
      supabase.from("sessions").select("*"),
      supabase.from("setups").select("*"),
      supabase.from("emotions").select("*"),
      supabase.from("trade_emotions").select("*"),
      supabase.from("rules").select("*"),
      supabase.from("trade_rules").select("*"),
    ]);
    setTrades(tr.data || []);
    setInstruments(ins.data || []);
    setSessions(ses.data || []);
    setSetups(set.data || []);
    setEmotions(emo.data || []);
    setTradeEmotions(te.data || []);
    setRules(rul.data || []);
    setTradeRules(trul.data || []);
    setLoading(false);
  }

  function getInstrumentName(id) { return instruments.find((i) => i.id === id)?.name || "—"; }
  function getSessionName(id) { return sessions.find((s) => s.id === id)?.name || "—"; }

  const getDateRange = () => {
    const today = getTodayNairobi();
    const yesterday = getYesterdayNairobi();
    const lastWeek = getLastWeekRange();
    if (activePeriod === "today") return { from: today, to: today };
    if (activePeriod === "yesterday") return { from: yesterday, to: yesterday };
    if (activePeriod === "lastweek") return { from: lastWeek.from, to: lastWeek.to };
    if (activePeriod === "custom") return { from: customFrom, to: customTo };
    return { from: "", to: "" };
  };

  const { from, to } = getDateRange();

  const filtered = trades.filter((t) => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (filterOutcome !== "All" && t.outcome !== filterOutcome) return false;
    if (filterInstrument !== "All" && t.instrument_id !== filterInstrument) return false;
    return true;
  });

  const fmt = (n) => (parseFloat(n) >= 0 ? "+" : "") + "$" + Math.abs(parseFloat(n)).toFixed(2);

  const periodButtons = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "lastweek", label: "Last Week" },
    { key: "custom", label: "Custom" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--text-muted)" }}>
        Loading trades...
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>Trade Log</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {filtered.length} trade{filtered.length !== 1 ? "s" : ""} · {trades.length} total
          </p>
        </div>
        <button
          onClick={() => { setEditTrade(null); setShowForm(true); }}
          className="font-semibold text-xs rounded-xl px-5 py-2.5 uppercase tracking-widest flex items-center gap-2"
          style={{ background: "var(--accent)", color: "#0c0c0f" }}
        >
          <Plus size={14} /> Log Trade
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border)" }}>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Period:</span>
          {periodButtons.map((p) => (
            <button
              key={p.key}
              onClick={() => { setActivePeriod(p.key); setShowCustom(p.key === "custom"); }}
              className="px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                background: activePeriod === p.key ? "var(--accent-dim)" : "var(--bg-tertiary)",
                border: `0.5px solid ${activePeriod === p.key ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--border-light)"}`,
                color: activePeriod === p.key ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {showCustom && (
          <div className="flex gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>From</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="text-xs rounded-lg px-3 py-2 outline-none font-mono" style={{ background: "var(--bg-primary)", border: "0.5px solid var(--border-light)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>To</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="text-xs rounded-lg px-3 py-2 outline-none font-mono" style={{ background: "var(--bg-primary)", border: "0.5px solid var(--border-light)", color: "var(--text-primary)" }} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Outcome:</span>
          {["All", "Win", "Loss", "Break-even"].map((o) => (
            <button
              key={o}
              onClick={() => setFilterOutcome(o)}
              className="px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                background: filterOutcome === o ? "var(--accent-dim)" : "var(--bg-tertiary)",
                border: `0.5px solid ${filterOutcome === o ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--border-light)"}`,
                color: filterOutcome === o ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {o}
            </button>
          ))}
          <span className="text-xs uppercase tracking-widest ml-2" style={{ color: "var(--text-faint)" }}>Pair:</span>
          <select
            value={filterInstrument}
            onChange={(e) => setFilterInstrument(e.target.value)}
            className="text-xs rounded-lg px-3 py-1.5 outline-none font-mono"
            style={{ background: "var(--bg-primary)", border: "0.5px solid var(--border-light)", color: "var(--text-muted)" }}
          >
            <option value="All">All</option>
            {instruments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>

      {/* Trade list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center rounded-xl" style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No trades found for this period.</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
            {activePeriod === "today" ? "Hit Log Trade to record today's first trade." : "Try a different period or filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((trade) => {
            const pnl = parseFloat(trade.pnl);
            return (
              <div
                key={trade.id}
                className="rounded-xl px-4 py-3 flex items-center gap-4"
                style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border)" }}
              >
                {/* Color bar */}
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: pnl >= 0 ? "var(--accent)" : "var(--loss)" }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {getInstrumentName(trade.instrument_id)}
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        background: trade.trade_type === "Long" ? "var(--win-dim)" : "var(--loss-dim)",
                        color: trade.trade_type === "Long" ? "#4ade80" : "var(--loss)",
                      }}
                    >
                      {trade.trade_type}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        background: trade.outcome === "Win" ? "var(--win-dim)" : trade.outcome === "Loss" ? "var(--loss-dim)" : "var(--bg-tertiary)",
                        color: trade.outcome === "Win" ? "#4ade80" : trade.outcome === "Loss" ? "var(--loss)" : "var(--text-muted)",
                      }}
                    >
                      {trade.outcome}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {trade.date} · {trade.day?.slice(0, 3)} · {getSessionName(trade.session_id)}
                  </p>
                </div>

                {/* P&L */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold font-mono" style={{ color: pnl >= 0 ? "var(--accent)" : "var(--loss)" }}>
                    {fmt(trade.pnl)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setViewTrade(trade)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)", border: "0.5px solid var(--border-light)" }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => { setEditTrade(trade); setShowForm(true); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Forms and modals */}
      {showForm && (
        <TradeForm
          onClose={() => setShowForm(false)}
          onSaved={fetchAll}
          editTrade={editTrade}
        />
      )}

      {viewTrade && (
        <TradeDetailModal
          trade={viewTrade}
          instruments={instruments}
          sessions={sessions}
          setups={setups}
          emotions={emotions}
          tradeEmotions={tradeEmotions}
          rules={rules}
          tradeRules={tradeRules}
          onClose={() => setViewTrade(null)}
          onEdit={() => { setEditTrade(viewTrade); setViewTrade(null); setShowForm(true); }}
        />
      )}
    </div>
  );
}
