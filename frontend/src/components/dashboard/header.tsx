"use client"

import { Wifi, Cloud } from "lucide-react"
import { useDashboardTheme, themeStyles, type NavTab } from "./theme-context"

const tabTitles: Record<NavTab, string> = {
  overview: "Dashboard Overview",
  projects: "Projects",
  upload: "Upload Data",
  viewer: "3D Viewer",
  geomap: "Geo Map",
  settings: "API Settings",
}

const tabDescriptions: Record<NavTab, string> = {
  overview: "Monitor your reconstruction pipeline at a glance",
  projects: "Manage and track your reconstruction projects",
  upload: "Upload images and datasets for processing",
  viewer: "Inspect 3D point clouds and models",
  geomap: "Visualize geo-referenced reconstructions",
  settings: "Configure API for location identification",
}

export default function Header() {
  const { theme, activeTab } = useDashboardTheme()
  const s = themeStyles[theme]

  return (
    <header className={`flex items-center justify-between px-8 py-5 ${s.header} transition-colors duration-500`}>
      <div>
        <h2 className={`text-xl font-bold ${s.text} transition-colors duration-500`}>
          {tabTitles[activeTab]}
        </h2>
        <p className={`text-sm ${s.textSecondary} transition-colors duration-500`}>
          {tabDescriptions[activeTab]}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${s.badgeOnline} transition-colors duration-500`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Wifi className="w-3 h-3" />
          Web Service Online
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${s.badgeProcessing} transition-colors duration-500`}>
          <Cloud className="w-3 h-3" />
          Cloud Processing
        </div>
      </div>
    </header>
  )
}
