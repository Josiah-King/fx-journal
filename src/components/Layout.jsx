import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../supabase";
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  NotebookPen,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/log", label: "Trade Log", icon: BookOpen },
  { to: "/analytics", label: "Analytics", icon: BarChart2 },
  { to: "/reflections", label: "Reflections", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout({ children }) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dailyTarget, setDailyTarget] = useState("5.00");

  useEffect(() => {
    async function fetchTarget() {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "daily_target")
        .single();
      if (data) setDailyTarget(parseFloat(data.value).toFixed(2));
    }
    fetchTarget();
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen font-mono" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea {
          background: var(--bg-primary);
          color: var(--text-primary);
          border-color: var(--border-light);
        }
        input::placeholder, textarea::placeholder { color: var(--text-faint); }
        select option { background: var(--bg-secondary); color: var(--text-primary); }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-56 z-30 flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ background: "var(--bg-secondary)", borderRight: "0.5px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="px-6 py-5" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <h1 className="text-lg font-bold tracking-wider" style={{ color: "var(--text-primary)" }}>
            FX<span style={{ color: "var(--accent)" }}>LOG</span>
          </h1>
          <p className="text-xs tracking-widest mt-0.5" style={{ color: "var(--text-muted)" }}>
            TRADE JOURNAL
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? "active-nav" : ""}`
              }
              style={({ isActive }) => ({
                background: isActive ? "var(--accent-dim)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                border: isActive ? "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" : "1px solid transparent",
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4" style={{ borderTop: "0.5px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--loss)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col min-h-screen lg:ml-56">
        {/* Top bar */}
        <header
          className="h-14 flex items-center px-4 gap-4 sticky top-0 z-10"
          style={{ borderBottom: "0.5px solid var(--border)", background: "var(--bg-primary)" }}
        >
          {/* Mobile menu */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Date */}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "Africa/Nairobi",
              })}
            </p>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-lg p-1.5 transition-colors"
            style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Daily target */}
          <div
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{ background: "var(--bg-secondary)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
          >
            Target: <span className="font-medium" style={{ color: "var(--accent)" }}>${dailyTarget}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
