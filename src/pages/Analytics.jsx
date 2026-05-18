import { useState, useEffect } from "react";
import { supabase } from "../supabase";

function Section({ title, children }) {
  return (
    <div className="bg-[#14141a] border border-[#1f1f2e] rounded-xl p-4">
      <p className="text-[#555] text-xs uppercase tracking-widest mb-4">{title}</p>
      {children}
    </div>
  );
}

function BarRow({ label, value, max, positive, suffix = "" }) {
  const pct = max > 0 ? (Math.abs(value) / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-white text-xs">{label}</span>
        <span className={`text-xs font-mono font-medium ${positive ? "text-[#c8f04a]" : value < 0 ? "text-[#f87171]" : "text-white"}`}>
          {suffix}{value >= 0 && suffix === "$" ? "+" : ""}{suffix === "$" ? value.toFixed(2) : value}{suffix !== "$" ? suffix : ""}
        </span>
      </div>
      <div className="h-1.5 bg-[#1f1f2e] rounded-full overflow-hidden">
        <div
          style={{ width: `${pct}%` }}
          className={`h-full rounded-full ${value >= 0 ? "bg-[#c8f04a]" : "bg-[#f87171]"}`}
        />
      </div>
    </div>
  );
}

function EquityCurve({ trades }) {
  if (trades.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-[#333] text-xs">
        Log at least 2 trades to see your equity curve.
      </div>
    );
  }
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let cum = 0;
  const points = sorted.map((t) => { cum += parseFloat(t.pnl); return { date: t.date, value: cum }; });
  const vals = points.map((p) => p.value);
  const min = Math.min(0, ...vals);
  const max = Math.max(0, ...vals);
  const range = max - min || 1;
  const W = 600, H = 140, PAD = { t: 10, r: 10, b: 24, l: 50 };
  const x = (i) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - min) / range) * (H - PAD.t - PAD.b);
  const zeroY = y(0);
  const polyline = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const areaPos = `M${x(0)},${zeroY} ${points.map((p, i) => `L${x(i)},${y(Math.max(0, p.value))}`).join(" ")} L${x(points.length - 1)},${zeroY} Z`;
  const areaNeg = `M${x(0)},${zeroY} ${points.map((p, i) => `L${x(i)},${y(Math.min(0, p.value))}`).join(" ")} L${x(points.length - 1)},${zeroY} Z`;
  const last = vals[vals.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="apos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8f04a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#c8f04a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="aneg" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f87171" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY} stroke="#2a2a35" strokeWidth="0.5" strokeDasharray="4,3" />
      <path d={areaPos} fill="url(#apos)" />
      <path d={areaNeg} fill="url(#aneg)" />
      <polyline points={polyline} fill="none" stroke={last >= 0 ? "#c8f04a" : "#f87171"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {[min, 0, max].map((v, i) => (
        <text key={i} x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize="8" fill="#555" fontFamily="monospace">
          {v >= 0 ? "+" : ""}{v.toFixed(0)}
        </text>
      ))}
      {/* Date labels */}
      {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
        <text key={i} x={x(i)} y={H - 2} textAnchor="middle" fontSize="8" fill="#444" fontFamily="monospace">
          {points[i]?.date?.slice(5)}
        </text>
      ))}
    </svg>
  );
}

export default function Analytics() {
  const [trades, setTrades] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [setups, setSetups] = useState([]);
  const [emotions, setEmotions] = useState([]);
  const [tradeEmotions, setTradeEmotions] = useState([]);
  const [tradeRules, setTradeRules] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyTarget, setDailyTarget] = useState(5);

  // Filters
  const getWeekRange = () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    const from = monday.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
    const to = now.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
    return { from, to };
  };

  const weekRange = getWeekRange();
  const [dateFrom, setDateFrom] = useState(weekRange.from);
  const [dateTo, setDateTo] = useState(weekRange.to);

  const [filterInstrument, setFilterInstrument] = useState("All");
  const [filterOutcome, setFilterOutcome] = useState("All");
  const [filterSession, setFilterSession] = useState("All");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [tr, ins, ses, set, emo, te, rul, trul, cfg] = await Promise.all([
      supabase.from("trades").select("*").order("date"),
      supabase.from("instruments").select("*"),
      supabase.from("sessions").select("*"),
      supabase.from("setups").select("*"),
      supabase.from("emotions").select("*"),
      supabase.from("trade_emotions").select("*"),
      supabase.from("rules").select("*"),
      supabase.from("trade_rules").select("*"),
      supabase.from("settings").select("*"),
    ]);
    setTrades(tr.data || []);
    setInstruments(ins.data || []);
    setSessions(ses.data || []);
    setSetups(set.data || []);
    setEmotions(emo.data || []);
    setTradeEmotions(te.data || []);
    setRules(rul.data || []);
    setTradeRules(trul.data || []);
    setDailyTarget(parseFloat(cfg.data?.find((d) => d.key === "daily_target")?.value || "5"));
    setLoading(false);
  }

  // Apply filters
  const filtered = trades.filter((t) => {
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    if (filterInstrument !== "All" && t.instrument_id !== filterInstrument) return false;
    if (filterOutcome !== "All" && t.outcome !== filterOutcome) return false;
    if (filterSession !== "All" && t.session_id !== filterSession) return false;
    return true;
  });

  // Core stats from filtered trades
  const totalPnl = filtered.reduce((a, t) => a + parseFloat(t.pnl), 0);
  const wins = filtered.filter((t) => t.outcome === "Win");
  const losses = filtered.filter((t) => t.outcome === "Loss");
  const winRate = filtered.length ? (wins.length / filtered.length) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((a, t) => a + parseFloat(t.pnl), 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, t) => a + parseFloat(t.pnl), 0) / losses.length) : 0;
  const bestTrade = filtered.length ? Math.max(...filtered.map((t) => parseFloat(t.pnl))) : 0;
  const worstTrade = filtered.length ? Math.min(...filtered.map((t) => parseFloat(t.pnl))) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "—";

  // Target achievement
  const targetHit = filtered.filter((t) => t.target_achieved === "Yes").length;
  const targetRate = filtered.length ? (targetHit / filtered.length) * 100 : 0;

  // P&L by instrument
  const pnlByInstrument = instruments.map((ins) => {
    const insTrades = filtered.filter((t) => t.instrument_id === ins.id);
    return { name: ins.name, pnl: insTrades.reduce((a, t) => a + parseFloat(t.pnl), 0), count: insTrades.length };
  }).filter((i) => i.count > 0).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  const maxInsPnl = Math.max(...pnlByInstrument.map((i) => Math.abs(i.pnl)), 1);

  // P&L by session
  const pnlBySession = sessions.map((ses) => {
    const sesTrades = filtered.filter((t) => t.session_id === ses.id);
    return { name: ses.name, pnl: sesTrades.reduce((a, t) => a + parseFloat(t.pnl), 0), count: sesTrades.length };
  }).filter((s) => s.count > 0).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  const maxSesPnl = Math.max(...pnlBySession.map((s) => Math.abs(s.pnl)), 1);

  // P&L by setup
  const pnlBySetup = setups.map((set) => {
    const setTrades = filtered.filter((t) => t.setup_id === set.id);
    return { name: set.name, pnl: setTrades.reduce((a, t) => a + parseFloat(t.pnl), 0), count: setTrades.length };
  }).filter((s) => s.count > 0).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  const maxSetPnl = Math.max(...pnlBySetup.map((s) => Math.abs(s.pnl)), 1);

  // P&L by day
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const pnlByDay = days.map((day) => {
    const dayTrades = filtered.filter((t) => t.day === day);
    return { name: day.slice(0, 3), pnl: dayTrades.reduce((a, t) => a + parseFloat(t.pnl), 0), count: dayTrades.length };
  });
  const maxDayPnl = Math.max(...pnlByDay.map((d) => Math.abs(d.pnl)), 1);

  // Emotion frequency
  const filteredIds = new Set(filtered.map((t) => t.id));
  const emotionCounts = emotions.map((emo) => {
    const count = tradeEmotions.filter((te) => te.emotion_id === emo.id && filteredIds.has(te.trade_id)).length;
    return { name: emo.name, count };
  }).filter((e) => e.count > 0).sort((a, b) => b.count - a.count);
  const maxEmoCount = Math.max(...emotionCounts.map((e) => e.count), 1);

  // Rule compliance
  const filteredRules = tradeRules.filter((tr) => filteredIds.has(tr.trade_id));
  const complianceRate = filteredRules.length
    ? (filteredRules.filter((r) => r.followed).length / filteredRules.length) * 100
    : null;

  // Plan follow rate
  const planYes = filtered.filter((t) => t.followed_plan === "Yes").length;
  const planRate = filtered.length ? (planYes / filtered.length) * 100 : 0;

  const fmt = (n) => (n >= 0 ? "+" : "") + "$" + Math.abs(n).toFixed(2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#555] text-sm">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-white text-lg font-semibold tracking-wide">Analytics</h1>
        <p className="text-[#555] text-xs mt-1">Filter and analyse your trading performance.</p>
      </div>

      {/* Filters */}
      <div className="bg-[#14141a] border border-[#1f1f2e] rounded-xl p-4 space-y-3">
        <p className="text-[#555] text-xs uppercase tracking-widest">Filters</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[#444] text-xs block mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#c8f04a] font-mono" />
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#c8f04a] font-mono" />
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">Instrument</label>
            <select value={filterInstrument} onChange={(e) => setFilterInstrument(e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#c8f04a] font-mono">
              <option value="All">All</option>
              {instruments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">Outcome</label>
            <select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#c8f04a] font-mono">
              <option value="All">All</option>
              <option>Win</option>
              <option>Loss</option>
              <option>Break-even</option>
            </select>
          </div>
          <div>
            <label className="text-[#444] text-xs block mb-1">Session</label>
            <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#c8f04a] font-mono">
              <option value="All">All</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => {
              const { from, to } = getWeekRange();
              setDateFrom(from);
              setDateTo(to);
              setFilterInstrument("All");
              setFilterOutcome("All");
              setFilterSession("All");
            }}
              className="w-full bg-[#1f1f2e] border border-[#2a2a35] text-[#666] text-xs rounded-lg px-3 py-2 hover:text-white hover:border-[#444] transition-colors">
              Clear Filters
            </button>
          </div>
        </div>
        <p className="text-[#444] text-xs">{filtered.length} trade{filtered.length !== 1 ? "s" : ""} matching filters</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Net P&L", value: fmt(totalPnl), pos: totalPnl >= 0 },
          { label: "Win Rate", value: filtered.length ? winRate.toFixed(1) + "%" : "—", pos: winRate >= 50 },
          { label: "Profit Factor", value: profitFactor, pos: parseFloat(profitFactor) >= 1 },
          { label: "Target Hit Rate", value: filtered.length ? targetRate.toFixed(0) + "%" : "—", pos: targetRate >= 50 },
        ].map((s) => (
          <div key={s.label} className="bg-[#14141a] border border-[#1f1f2e] rounded-xl p-4">
            <p className="text-[#555] text-xs uppercase tracking-widest mb-2">{s.label}</p>
            <p className={`text-xl font-semibold font-mono ${s.pos ? "text-[#c8f04a]" : "text-[#f87171]"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* More stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Best Trade", value: fmt(bestTrade), pos: true },
          { label: "Worst Trade", value: fmt(worstTrade), pos: false },
          { label: "Avg Win", value: fmt(avgWin), pos: true },
          { label: "Avg Loss", value: "-$" + avgLoss.toFixed(2), pos: false },
        ].map((s) => (
          <div key={s.label} className="bg-[#14141a] border border-[#1f1f2e] rounded-xl p-4">
            <p className="text-[#555] text-xs uppercase tracking-widest mb-2">{s.label}</p>
            <p className={`text-xl font-semibold font-mono ${s.pos ? "text-[#c8f04a]" : "text-[#f87171]"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Equity curve */}
      <Section title="Equity Curve">
        <EquityCurve trades={filtered} />
      </Section>

      {/* Discipline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Rule Compliance">
          {complianceRate !== null ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[#555] text-xs">Overall compliance</p>
                <p className={`text-2xl font-semibold font-mono ${complianceRate >= 80 ? "text-[#c8f04a]" : complianceRate >= 50 ? "text-yellow-400" : "text-[#f87171]"}`}>
                  {complianceRate.toFixed(0)}%
                </p>
              </div>
              <div className="h-2 bg-[#1f1f2e] rounded-full overflow-hidden">
                <div style={{ width: `${complianceRate}%` }}
                  className={`h-full rounded-full ${complianceRate >= 80 ? "bg-[#c8f04a]" : complianceRate >= 50 ? "bg-yellow-400" : "bg-[#f87171]"}`} />
              </div>
              <div className="space-y-2 pt-2">
                {rules.map((rule) => {
                  const ruleEntries = filteredRules.filter((tr) => tr.rule_id === rule.id);
                  const followed = ruleEntries.filter((r) => r.followed).length;
                  const rate = ruleEntries.length ? (followed / ruleEntries.length) * 100 : 0;
                  if (!ruleEntries.length) return null;
                  return (
                    <div key={rule.id} className="space-y-1">
                      <div className="flex justify-between">
                        <p className="text-[#666] text-xs truncate pr-2">{rule.description}</p>
                        <p className={`text-xs font-mono flex-shrink-0 ${rate >= 80 ? "text-[#c8f04a]" : rate >= 50 ? "text-yellow-400" : "text-[#f87171]"}`}>{rate.toFixed(0)}%</p>
                      </div>
                      <div className="h-1 bg-[#1f1f2e] rounded-full overflow-hidden">
                        <div style={{ width: `${rate}%` }}
                          className={`h-full rounded-full ${rate >= 80 ? "bg-[#c8f04a]" : rate >= 50 ? "bg-yellow-400" : "bg-[#f87171]"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[#333] text-xs">No rule data yet.</p>
          )}
        </Section>

        <Section title="Plan Adherence">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[#555] text-xs">Followed plan fully</p>
              <p className={`text-2xl font-semibold font-mono ${planRate >= 70 ? "text-[#c8f04a]" : "text-[#f87171]"}`}>
                {filtered.length ? planRate.toFixed(0) + "%" : "—"}
              </p>
            </div>
            {["Yes", "Partially", "No"].map((val) => {
              const count = filtered.filter((t) => t.followed_plan === val).length;
              const pct = filtered.length ? (count / filtered.length) * 100 : 0;
              return (
                <div key={val} className="space-y-1">
                  <div className="flex justify-between">
                    <p className="text-[#666] text-xs">{val}</p>
                    <p className="text-[#555] text-xs font-mono">{count} trades ({pct.toFixed(0)}%)</p>
                  </div>
                  <div className="h-1.5 bg-[#1f1f2e] rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${val === "Yes" ? "bg-[#c8f04a]" : val === "Partially" ? "bg-yellow-400" : "bg-[#f87171]"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="P&L by Instrument">
          {pnlByInstrument.length > 0 ? (
            <div className="space-y-3">
              {pnlByInstrument.map((i) => (
                <BarRow key={i.name} label={`${i.name} (${i.count})`} value={i.pnl} max={maxInsPnl} positive={i.pnl >= 0} suffix="$" />
              ))}
            </div>
          ) : <p className="text-[#333] text-xs">No data yet.</p>}
        </Section>

        <Section title="P&L by Session">
          {pnlBySession.length > 0 ? (
            <div className="space-y-3">
              {pnlBySession.map((s) => (
                <BarRow key={s.name} label={`${s.name} (${s.count})`} value={s.pnl} max={maxSesPnl} positive={s.pnl >= 0} suffix="$" />
              ))}
            </div>
          ) : <p className="text-[#333] text-xs">No data yet.</p>}
        </Section>

        <Section title="P&L by Setup">
          {pnlBySetup.length > 0 ? (
            <div className="space-y-3">
              {pnlBySetup.map((s) => (
                <BarRow key={s.name} label={`${s.name} (${s.count})`} value={s.pnl} max={maxSetPnl} positive={s.pnl >= 0} suffix="$" />
              ))}
            </div>
          ) : <p className="text-[#333] text-xs">No data yet.</p>}
        </Section>

        <Section title="P&L by Day of Week">
          <div className="space-y-2">
            {/* Target line legend */}
            <div className="flex justify-end gap-4 mb-1">
              <span className="text-[#333] text-xs font-mono">0</span>
              <span className="text-[#444] text-xs font-mono">Target: ${dailyTarget.toFixed(2)}</span>
              <span className="text-[#333] text-xs font-mono">2x: ${(dailyTarget * 1.11).toFixed(2)}</span>
            </div>

            {/* Target line + bars */}
            <div className="relative">
              {/* Target line at 90% */}
              <div
                className="absolute w-full border-t border-dashed border-[#c8f04a]/30 z-10"
                style={{ bottom: "90%" }}
              >
                <span className="absolute right-0 -top-4 text-[#c8f04a]/50 text-xs font-mono">
                  target
                </span>
              </div>

              {/* Bars */}
              <div className="flex items-end justify-between gap-2" style={{ height: 100 }}>
                {pnlByDay.map((d) => {
                  const yMax = dailyTarget / 0.9;
                  const barHeight = d.count > 0 ? Math.min((Math.abs(d.pnl) / yMax) * 100, 100) : 0;
                  const isToday = d.name === new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Africa/Nairobi" }).slice(0, 3);
                  return (
                    <div key={d.name} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center justify-end" style={{ height: 100 }}>
                        {d.pnl >= dailyTarget && d.count > 0 && (
                          <div className="mb-0.5"><span className="text-xs">🎯</span></div>
                        )}
                        <div
                          style={{
                            height: d.count > 0 ? `${barHeight}%` : "3px",
                            width: "40%",
                          }}
                          className={`rounded-t-sm transition-all duration-500 ${
                            d.pnl >= dailyTarget
                              ? "bg-[#c8f04a]"
                              : d.pnl > 0
                              ? "bg-[#c8f04a]/50"
                              : d.pnl < 0
                              ? "bg-[#f87171]"
                              : "bg-[#2a2a35]"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day labels & P&L below */}
            <div className="flex justify-between gap-2">
              {pnlByDay.map((d) => {
                const isToday = d.name === new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Africa/Nairobi" }).slice(0, 3);
                return (
                  <div key={d.name} className="flex-1 flex flex-col items-center gap-0.5">
                    <p className={`text-xs ${isToday ? "text-[#c8f04a]" : "text-[#555]"}`}>{d.name}</p>
                    <p className={`text-xs font-mono ${d.pnl > 0 ? "text-[#c8f04a]" : d.pnl < 0 ? "text-[#f87171]" : "text-[#333]"}`}>
                      {d.count > 0 ? (d.pnl >= 0 ? "+" : "") + "$" + Math.abs(d.pnl).toFixed(2) : "—"}
                    </p>
                    <p className="text-[#333] text-xs">{d.count > 0 ? `${d.count}t` : ""}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      </div>

      {/* Emotion frequency */}
      <Section title="Emotion Frequency">
        {emotionCounts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {emotionCounts.map((e) => (
              <div key={e.name} className="bg-[#1f1f2e] rounded-lg px-4 py-3 flex items-center justify-between">
                <p className="text-white text-xs">{e.name}</p>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-16 bg-[#2a2a35] rounded-full overflow-hidden">
                    <div style={{ width: `${(e.count / maxEmoCount) * 100}%` }} className="h-full bg-[#888] rounded-full" />
                  </div>
                  <p className="text-[#555] text-xs font-mono">{e.count}x</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-[#333] text-xs">No emotion data yet.</p>}
      </Section>
    </div>
  );
}
