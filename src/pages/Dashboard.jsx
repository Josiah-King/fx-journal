import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Target, Flame, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

function getTodayNairobi() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

function getCurrentSession() {
  const hour = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "Africa/Nairobi",
  });
  const h = parseInt(hour);
  if (h >= 11 && h < 20) return { name: "London / New York", active: true };
  if (h >= 8 && h < 11) return { name: "London", active: true };
  if (h >= 20 || h < 2) return { name: "New York Close", active: true };
  return { name: "No major session", active: false };
}

function DayPerformance({ trades, dailyTarget }) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Get current day index (0 = Monday, 6 = Sunday)
  const todayIndex = (() => {
    const day = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Africa/Nairobi",
    });
    return days.indexOf(day);
  })();

  // Get the date of Monday this week
  const getMondayOfWeek = () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return monday;
  };

  const monday = getMondayOfWeek();

  const dayStats = days.map((day, index) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + index);
    const dateStr = dayDate.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
    const isPast = index <= todayIndex;
    const dayTrades = isPast ? trades.filter((t) => t.date === dateStr) : [];
    const pnl = dayTrades.reduce((a, t) => a + parseFloat(t.pnl), 0);
    return { day: day.slice(0, 3), pnl, count: dayTrades.length, isPast, isToday: index === todayIndex };
  });

  // Y axis is based on daily target
  // Target sits at 90% height, leaving 10% for overperformance
  // Max height = 2x the daily target so bars that exceed target don't overflow
  const yMax = dailyTarget / 0.9;

  const getBarHeight = (pnl) => {
    if (pnl === 0) return 3;
    return Math.min((Math.abs(pnl) / yMax) * 100, 100);
  };

  return (
    <div className="space-y-2">
      {/* Y axis legend */}
      <div className="flex justify-end gap-4 mb-1">
        <span className="text-[#333] text-xs font-mono">0</span>
        <span className="text-[#444] text-xs font-mono">
          Target: ${dailyTarget.toFixed(2)}
        </span>
        {/* <span className="text-[#333] text-xs font-mono">
          2x: ${(dailyTarget * 2).toFixed(2)}
        </span> */}
      </div>

      {/* Target line + bars */}
      <div className="relative">
        {/* Target line at 50% height */}
        <div
          className="absolute w-full border-t border-dashed border-[#c8f04a]/30 z-10"
          style={{ bottom: "90%"}}
        >
          <span className="absolute right-0 -top-4 text-[#c8f04a]/50 text-xs font-mono">
            target
          </span>
        </div>

        {/* Bars */}
        <div className="flex items-end justify-between gap-2" style={{ height: 100 }}>
          {dayStats.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: 100 }}>
                {/* Exceeded target indicator */}
                {d.isPast && d.pnl >= dailyTarget && (
                  <div className="mb-0.5">
                    <span className="text-[#c8f04a] text-xs">🎯</span>
                  </div>
                )}
                <div
                  style={{
                    height: d.isPast && d.count > 0 ? `${getBarHeight(d.pnl)}%` : "3px",
                    width: "40%",
                  }}
                  className={`rounded-t-sm transition-all duration-500 ${
                    !d.isPast
                      ? "bg-[#1f1f2e]"
                      : d.pnl >= dailyTarget
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
          ))}
        </div>
      </div>

      {/* Day labels & P&L below */}
      <div className="flex justify-between gap-2">
        {dayStats.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5">
            <p className={`text-xs ${d.isToday ? "text-[#c8f04a]" : d.isPast ? "text-[#555]" : "text-[#2a2a35]"}`}>
              {d.day}
            </p>
            <p className={`text-xs font-mono ${d.pnl > 0 ? "text-[#c8f04a]" : d.pnl < 0 ? "text-[#f87171]" : "text-[#333]"}`}>
              {d.isPast && d.count > 0 ? (d.pnl >= 0 ? "+" : "") + "$" + Math.abs(d.pnl).toFixed(2) : ""}
            </p>
            <p className="text-[#333] text-xs">
              {d.isPast && d.count > 0 ? `${d.count}t` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [dailyTarget, setDailyTarget] = useState(5);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [tr, ins, cfg] = await Promise.all([
      supabase.from("trades").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("instruments").select("*"),
      supabase.from("settings").select("*"),
    ]);
    setTrades(tr.data || []);
    setInstruments(ins.data || []);
    setDailyTarget(parseFloat(cfg.data?.find((d) => d.key === "daily_target")?.value || "5"));
    setLoading(false);
  }

  const today = getTodayNairobi();
  const session = getCurrentSession();
  const todayTrades = trades.filter((t) => t.date === today);
  const todayPnl = todayTrades.reduce((a, t) => a + parseFloat(t.pnl), 0);
  const targetProgress = Math.min((todayPnl / dailyTarget) * 100, 100);
  const targetHit = todayPnl >= dailyTarget;

  const getInstrumentName = (id) => instruments.find((i) => i.id === id)?.name || "—";
  const fmt = (n) => (n >= 0 ? "+" : "") + "$" + Math.abs(n).toFixed(2);

  // Current streak
  const streak = (() => {
    if (!trades.length) return 0;
    const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));
    const dir = sorted[0].outcome === "Win" ? "Win" : "Loss";
    let count = 0;
    for (const t of sorted) {
      if (t.outcome === dir) count++;
      else break;
    }
    return dir === "Win" ? count : -count;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#555] text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Date & Session */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-lg font-semibold tracking-wide">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "Africa/Nairobi",
            })}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${session.active ? "bg-[#c8f04a]" : "bg-[#444]"}`} />
            <p className="text-[#555] text-xs">{session.name}</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/log")}
          className="bg-[#c8f04a] text-[#0c0c0f] font-semibold text-xs rounded-xl px-5 py-2.5 uppercase tracking-widest hover:bg-[#b8e03a] transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> Log Trade
        </button>
      </div>

      {/* Daily target */}
      <div className="bg-[#14141a] border border-[#1f1f2e] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[#c8f04a]" />
            <p className="text-white text-xs font-semibold uppercase tracking-widest">
              Today's Target
            </p>
          </div>
          <div>
            <span className={`text-sm font-semibold font-mono ${todayPnl >= 0 ? "text-[#c8f04a]" : "text-[#f87171]"}`}>
              {fmt(todayPnl)}
            </span>
            <span className="text-[#444] text-xs"> / ${dailyTarget.toFixed(2)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-[#1f1f2e] rounded-full overflow-hidden">
          <div
            style={{ width: `${Math.max(targetProgress, 0)}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              targetHit ? "bg-[#c8f04a]" : todayPnl >= 0 ? "bg-[#c8f04a]/50" : "bg-[#f87171]"
            }`}
          />
        </div>

        <div className="flex justify-between items-center">
          <p className="text-[#444] text-xs">
            {todayTrades.length} trade{todayTrades.length !== 1 ? "s" : ""} today
          </p>
          <p className={`text-xs font-medium ${targetHit ? "text-[#c8f04a]" : "text-[#555]"}`}>
            {targetHit
              ? "🎯 Target hit!"
              : todayPnl > 0
              ? `$${(dailyTarget - todayPnl).toFixed(2)} to go`
              : todayTrades.length === 0
              ? "No trades logged yet"
              : "Below target"}
          </p>
        </div>
      </div>

      {/* Streak */}
      <div className={`rounded-xl px-5 py-3 border flex items-center justify-between
        ${streak > 0 ? "bg-[#1a1f0d] border-[#c8f04a]/20"
        : streak < 0 ? "bg-[#2e0d0d] border-[#f87171]/20"
        : "bg-[#14141a] border-[#1f1f2e]"}`}>
        <div className="flex items-center gap-2">
          <Flame size={14} className={streak > 0 ? "text-[#c8f04a]" : streak < 0 ? "text-[#f87171]" : "text-[#444]"} />
          <p className="text-xs text-[#555] uppercase tracking-widest">Current Streak</p>
        </div>
        <p className={`text-sm font-semibold font-mono
          ${streak > 0 ? "text-[#c8f04a]" : streak < 0 ? "text-[#f87171]" : "text-[#444]"}`}>
          {streak === 0
            ? "No streak yet"
            : streak > 0
            ? `${streak} win${streak > 1 ? "s" : ""} in a row 🔥`
            : `${Math.abs(streak)} loss${Math.abs(streak) > 1 ? "es" : ""} in a row`}
        </p>
      </div>

      {/* Today's trades */}
      <div className="bg-[#14141a] border border-[#1f1f2e] rounded-xl p-4">
        <p className="text-[#555] text-xs uppercase tracking-widest mb-4">Today's Trades</p>
        {todayTrades.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-[#444] text-sm">No trades logged today.</p>
            <p className="text-[#333] text-xs">
              Hit <span className="text-[#c8f04a]">Log Trade</span> to record your first trade of the day.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTrades.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-[#1a1a24] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-8 rounded-full ${parseFloat(t.pnl) >= 0 ? "bg-[#c8f04a]" : "bg-[#f87171]"}`} />
                  <div>
                    <p className="text-white text-xs font-medium">{getInstrumentName(t.instrument_id)}</p>
                    <p className="text-[#555] text-xs">{t.trade_type} · {t.outcome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    t.outcome === "Win" ? "bg-[#0d2e1a] text-[#4ade80]"
                    : t.outcome === "Loss" ? "bg-[#2e0d0d] text-[#f87171]"
                    : "bg-[#1f1f2e] text-[#888]"
                  }`}>
                    {t.outcome}
                  </span>
                  <p className={`text-sm font-semibold font-mono ${parseFloat(t.pnl) >= 0 ? "text-[#c8f04a]" : "text-[#f87171]"}`}>
                    {fmt(t.pnl)}
                  </p>
                </div>
              </div>
            ))}

            {/* Today's summary */}
            <div className="flex justify-between pt-2 mt-1">
              <p className="text-[#555] text-xs">
                {todayTrades.filter(t => t.outcome === "Win").length}W ·{" "}
                {todayTrades.filter(t => t.outcome === "Loss").length}L
              </p>
              <p className={`text-xs font-semibold font-mono ${todayPnl >= 0 ? "text-[#c8f04a]" : "text-[#f87171]"}`}>
                Total: {fmt(todayPnl)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* P&L by day of week */}
      <div className="bg-[#14141a] border border-[#1f1f2e] rounded-xl p-4">
        <p className="text-[#555] text-xs uppercase tracking-widest mb-4">P&L by Day of Week</p>
        <DayPerformance trades={trades} dailyTarget={dailyTarget} />
      </div>
    </div>
  );
}
