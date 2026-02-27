"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  FolderKanban,
  Upload,
  Box,
  MapPin,
  BookOpen,
  Hexagon,
  Settings,
  LogOut,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useDashboardTheme, themeStyles, type NavTab, type ThemePreset } from "./theme-context"

const navItems: { id: NavTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "upload", label: "Upload Data", icon: Upload },
  { id: "viewer", label: "3D Viewer", icon: Box },
  { id: "geomap", label: "Geo Map", icon: MapPin },
  { id: "tutorial", label: "Tutorial", icon: BookOpen },
  { id: "settings", label: "API Settings", icon: Settings },
]

const presets: { id: ThemePreset; label: string }[] = [
  { id: "studio", label: "A" },
  { id: "modern", label: "B" },
  { id: "swiss", label: "C" },
]

const NavItem = memo(({
  item,
  isActive,
  onClick,
  styles
}: {
  item: typeof navItems[0]
  isActive: boolean
  onClick: () => void
  styles: any
}) => (
  <li>
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive ? styles.navActive : styles.navInactive
      }`}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {item.label}
    </button>
  </li>
))

NavItem.displayName = 'NavItem'

function Sidebar() {
  const navigate = useNavigate()
  const { theme, setTheme, activeTab, setActiveTab } = useDashboardTheme()
  const s = themeStyles[theme]

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  return (
    <aside
      className={`w-64 flex-shrink-0 flex flex-col h-screen ${s.sidebar} transition-colors duration-500`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className={`${s.accentBg} p-2 rounded-lg`}>
          <Hexagon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={`text-base font-bold tracking-tight ${s.text}`}>
            Reconstruct.AI
          </h1>
          <p className={`text-[11px] font-mono ${s.textMuted}`}>v2.4.1</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 mb-3 ${s.textMuted}`}>
          Navigation
        </p>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              styles={s}
            />
          ))}
        </ul>
      </nav>

      {/* Visual Presets */}
      <div className="px-4 pb-4">
        <p className={`text-[10px] font-semibold uppercase tracking-widest px-2 mb-3 ${s.textMuted}`}>
          Visual Presets
        </p>
        <div className={`flex items-center gap-1 p-1 rounded-lg ${s.presetToggle} transition-colors duration-500`}>
          {presets.map((preset) => {
            const isActive = theme === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => setTheme(preset.id)}
                className={`relative flex-1 py-2 text-xs font-bold rounded-md transition-all duration-200 ${
                  isActive ? s.presetActive : s.presetInactive
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="presetIndicator"
                    className={`absolute inset-0 rounded-md ${s.presetActive}`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{preset.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 pb-6">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${s.navInactive} hover:text-red-400 hover:bg-red-500/10`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  )
}

export default memo(Sidebar)
