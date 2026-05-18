import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  NotebookPen,
  Settings,
  LogOut,
  Menu,
  X,
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
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dailyTarget, setDailyTarget] = useState("5.00");

  const { theme, toggleTheme } = useTheme();

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
    <div className="min-h-screen bg-[#0c0c0f] text-white flex font-mono">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-56 bg-[#14141a] border-r border-[#1f1f2e] z-30 flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#1f1f2e]">
          <h1 className="text-lg font-bold tracking-wider">
            FX<span className="text-[#c8f04a]">LOG</span>
          </h1>
          <p className="text-[#444] text-xs tracking-widest mt-0.5">
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${
                  isActive
                    ? "bg-[#1a1f0d] text-[#c8f04a] border border-[#c8f04a]/20"
                    : "text-[#666] hover:text-white hover:bg-[#1f1f2e]"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-[#1f1f2e]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#666] hover:text-[#f87171] hover:bg-[#2e0d0d] transition-colors w-full"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-56">
        {/* Top bar */}
        <header className="h-14 border-b border-[#1f1f2e] flex items-center px-4 gap-4 sticky top-0 bg-[#0c0c0f] z-10">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-[#666] hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Page title — dynamic */}
          <div className="flex-1">
            <p className="text-xs text-[#555] uppercase tracking-widest">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "Africa/Nairobi",
              })}
            </p>
          </div>

          <button
            onClick={toggleTheme}
            className="bg-[#14141a] border border-[#1f1f2e] rounded-lg p-1.5 text-[#666] hover:text-white transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="bg-[#14141a] border border-[#1f1f2e] rounded-lg px-3 py-1.5 text-xs text-[#666]">
            Target: <span className="text-[#c8f04a] font-medium">${dailyTarget}</span>
          </div>
          
          {/* Daily target badge */}
          <div className="bg-[#14141a] border border-[#1f1f2e] rounded-lg px-3 py-1.5 text-xs text-[#666]">
            Target: <span className="text-[#c8f04a] font-medium">${dailyTarget}</span>
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
