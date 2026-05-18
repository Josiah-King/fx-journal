import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Plus, Trash2, Save } from "lucide-react";

function Section({ title, description, children }) {
  return (
    <div className="bg-[#14141a] border border-[#1f1f2e] rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-white text-sm font-semibold uppercase tracking-widest">
          {title}
        </h2>
        {description && (
          <p className="text-[#555] text-xs mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function TagManager({ items, onAdd, onDelete, placeholder }) {
  const [input, setInput] = useState("");

  function handleAdd() {
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={placeholder}
          className="flex-1 bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors placeholder-[#333] font-mono"
        />
        <button
          onClick={handleAdd}
          className="bg-[#c8f04a] text-[#0c0c0f] rounded-lg px-4 py-2.5 hover:bg-[#b8e03a] transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 bg-[#1f1f2e] border border-[#2a2a35] rounded-lg px-3 py-1.5 text-sm text-[#aaa]"
          >
            <span>{item.name}</span>
            <button
              onClick={() => onDelete(item.id)}
              className="text-[#444] hover:text-[#f87171] transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[#333] text-xs">Nothing added yet.</p>
        )}
      </div>
    </div>
  );
}

function RulesManager({ rules, onAdd, onDelete }) {
  const [input, setInput] = useState("");

  function handleAdd() {
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="e.g. Only trade with minimum 1:2 R:R"
          className="flex-1 bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors placeholder-[#333] font-mono"
        />
        <button
          onClick={handleAdd}
          className="bg-[#c8f04a] text-[#0c0c0f] rounded-lg px-4 py-2.5 hover:bg-[#b8e03a] transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {rules.map((rule, i) => (
          <div
            key={rule.id}
            className="flex items-start gap-3 bg-[#1f1f2e] border border-[#2a2a35] rounded-lg px-4 py-3"
          >
            <span className="text-[#c8f04a] text-xs mt-0.5 font-bold">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 text-sm text-[#aaa]">{rule.description}</span>
            <button
              onClick={() => onDelete(rule.id)}
              className="text-[#444] hover:text-[#f87171] transition-colors mt-0.5"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-[#333] text-xs">No rules added yet.</p>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const [instruments, setInstruments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [emotions, setEmotions] = useState([]);
  const [rules, setRules] = useState([]);
  const [dailyTarget, setDailyTarget] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
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
    const cfg_data = cfg.data || [];
    setDailyTarget(cfg_data.find((d) => d.key === "daily_target")?.value || "5");
    setLoginEmail(cfg_data.find((d) => d.key === "login_email")?.value || "");
    setLoginPassword(cfg_data.find((d) => d.key === "login_password")?.value || "");
    setLoading(false);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Generic add/delete for simple tables
  async function addItem(table, field, value, setter) {
    const { data, error } = await supabase
      .from(table)
      .insert({ [field]: value })
      .select()
      .single();
    if (!error) setter((prev) => [...prev, data]);
  }

  async function deleteItem(table, id, setter) {
    await supabase.from(table).delete().eq("id", id);
    setter((prev) => prev.filter((i) => i.id !== id));
  }

  async function saveSettings() {
    setSaving(true);
    await Promise.all([
      supabase.from("settings").update({ value: dailyTarget }).eq("key", "daily_target"),
      supabase.from("settings").update({ value: loginEmail }).eq("key", "login_email"),
      supabase.from("settings").update({ value: loginPassword }).eq("key", "login_password"),
    ]);
    setSaving(false);
    showToast("Settings saved successfully.");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#555] text-sm">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-white text-lg font-semibold tracking-wide">Settings</h1>
        <p className="text-[#555] text-xs mt-1">
          Manage everything about your journal. All changes apply immediately.
        </p>
      </div>

      {/* Daily Target */}
      <Section
        title="Daily Target"
        description="The P&L amount you aim to hit each trading day."
      >
        <div className="flex gap-2 items-center">
          <span className="text-[#555] text-sm">$</span>
          <input
            type="number"
            value={dailyTarget}
            onChange={(e) => setDailyTarget(e.target.value)}
            className="w-32 bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors font-mono"
          />
        </div>
      </Section>

      {/* Instruments */}
      <Section
        title="Instruments"
        description="Currency pairs and volatility indices you trade."
      >
        <TagManager
          items={instruments}
          onAdd={(name) => addItem("instruments", "name", name, setInstruments)}
          onDelete={(id) => deleteItem("instruments", id, setInstruments)}
          placeholder="e.g. GBP/JPY"
        />
      </Section>

      {/* Sessions */}
      <Section
        title="Sessions"
        description="Trading sessions you are active in."
      >
        <TagManager
          items={sessions}
          onAdd={(name) => addItem("sessions", "name", name, setSessions)}
          onDelete={(id) => deleteItem("sessions", id, setSessions)}
          placeholder="e.g. Tokyo"
        />
      </Section>

      {/* Setups */}
      <Section
        title="Trade Setups"
        description="Your named trade setups and strategies."
      >
        <TagManager
          items={setups}
          onAdd={(name) => addItem("setups", "name", name, setSetups)}
          onDelete={(id) => deleteItem("setups", id, setSetups)}
          placeholder="e.g. Break and Retest"
        />
      </Section>

      {/* Emotions */}
      <Section
        title="Emotions"
        description="Emotions you want to track per trade."
      >
        <TagManager
          items={emotions}
          onAdd={(name) => addItem("emotions", "name", name, setEmotions)}
          onDelete={(id) => deleteItem("emotions", id, setEmotions)}
          placeholder="e.g. FOMO, Calm, Greedy"
        />
      </Section>

      {/* Rules */}
      <Section
        title="Trading Rules"
        description="Your trading plan rules. These become a checklist on every trade."
      >
        <RulesManager
          rules={rules}
          onAdd={(desc) => addItem("rules", "description", desc, setRules)}
          onDelete={(id) => deleteItem("rules", id, setRules)}
        />
      </Section>

      {/* Login credentials */}
      <Section
        title="Login Credentials"
        description="Update the email and password you use to access this journal."
      >
        <div className="space-y-3">
          <div>
            <label className="text-[#555] text-xs uppercase tracking-widest block mb-2">
              Email
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors font-mono"
            />
          </div>
          <div>
            <label className="text-[#555] text-xs uppercase tracking-widest block mb-2">
              Password
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#c8f04a] transition-colors font-mono"
            />
          </div>
        </div>
      </Section>

      {/* Save button */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className="w-full bg-[#c8f04a] text-[#0c0c0f] font-semibold text-sm rounded-xl py-3 uppercase tracking-widest hover:bg-[#b8e03a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save size={16} />
        {saving ? "Saving..." : "Save Settings"}
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#1a1f0d] border border-[#c8f04a]/30 text-[#c8f04a] text-sm px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
