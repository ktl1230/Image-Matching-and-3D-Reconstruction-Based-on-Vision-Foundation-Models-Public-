import { createContext, useContext, useState, type ReactNode } from "react"

export type ThemePreset = "studio" | "modern" | "swiss"
export type NavTab = "overview" | "projects" | "upload" | "viewer" | "geomap" | "tutorial" | "settings"

interface ThemeContextType {
  theme: ThemePreset
  setTheme: (theme: ThemePreset) => void
  activeTab: NavTab
  setActiveTab: (tab: NavTab) => void
  selectedProjectId: number | null
  setSelectedProjectId: (id: number | null) => void
  selectedGroupName: string | null
  setSelectedGroupName: (name: string | null) => void
  
  // Task Management
  classifyingProjects: Record<number, { status: 'running' | 'completed' | 'failed' }>
  startClassification: (projectId: number) => Promise<void>

  reconstructionTasks: Record<string, { status: 'running' | 'completed' | 'failed', progress: number }>
  updateReconstructionStatus: (key: string, status: { status: 'running' | 'completed' | 'failed', progress: number }) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreset>("studio")
  const [activeTab, setActiveTab] = useState<NavTab>("overview")
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null)
  
  // Task State
  const [classifyingProjects, setClassifyingProjects] = useState<Record<number, { status: 'running' | 'completed' | 'failed' }>>({})
  const [reconstructionTasks, setReconstructionTasks] = useState<Record<string, { status: 'running' | 'completed' | 'failed', progress: number }>>({})

  const startClassification = async (projectId: number) => {
    // Set initial state
    setClassifyingProjects(prev => ({
      ...prev,
      [projectId]: { status: 'running' }
    }))

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:8000/api/projects/${projectId}/classify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) throw new Error('Classification failed')

      // Complete
      setClassifyingProjects(prev => ({
        ...prev,
        [projectId]: { status: 'completed' }
      }))

      // Clear after a delay
      setTimeout(() => {
        setClassifyingProjects(prev => {
          const newState = { ...prev }
          delete newState[projectId]
          return newState
        })
      }, 5000)

    } catch (error) {
      console.error(error)
      setClassifyingProjects(prev => ({
        ...prev,
        [projectId]: { status: 'failed' }
      }))
    }
  }

  const updateReconstructionStatus = (key: string, status: { status: 'running' | 'completed' | 'failed', progress: number }) => {
    setReconstructionTasks(prev => ({
      ...prev,
      [key]: status
    }))
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      activeTab, 
      setActiveTab,
      selectedProjectId,
      setSelectedProjectId,
      selectedGroupName,
      setSelectedGroupName,
      classifyingProjects,
      startClassification,
      reconstructionTasks,
      updateReconstructionStatus
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useDashboardTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useDashboardTheme must be used within DashboardThemeProvider")
  return ctx
}

// Shared theme style maps
export const themeStyles = {
  studio: {
    bg: "bg-slate-950",
    sidebar: "bg-slate-900/80 backdrop-blur-xl border-r border-white/[0.06]",
    card: "bg-slate-900/60 backdrop-blur-md border border-white/[0.08] shadow-lg shadow-indigo-500/5",
    cardHover: "hover:border-indigo-500/30 hover:shadow-indigo-500/10",
    header: "bg-slate-900/60 backdrop-blur-xl border-b border-white/[0.06]",
    text: "text-slate-100",
    textSecondary: "text-slate-400",
    textMuted: "text-slate-500",
    accent: "text-indigo-400",
    accentBg: "bg-indigo-500",
    accentBgHover: "hover:bg-indigo-400",
    accentBgSubtle: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/30",
    badgeOnline: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    badgeProcessing: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    navActive: "bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-400",
    navInactive: "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-l-2 border-transparent",
    input: "bg-slate-800/60 border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20",
    tableHead: "bg-slate-900/40 text-slate-400",
    tableRow: "border-b border-white/[0.04] hover:bg-white/[0.02]",
    statusCompleted: "bg-emerald-500/10 text-emerald-400",
    statusProcessing: "bg-indigo-500/10 text-indigo-400",
    statusWaiting: "bg-amber-500/10 text-amber-400",
    buttonPrimary: "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25",
    buttonSecondary: "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/[0.08]",
    presetToggle: "bg-slate-800/60 border border-white/[0.08]",
    presetActive: "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25",
    presetInactive: "text-slate-400 hover:text-slate-200",
  },
  modern: {
    bg: "bg-slate-50",
    sidebar: "bg-white border-r border-slate-200 shadow-sm",
    card: "bg-white border border-slate-200 shadow-sm rounded-xl",
    cardHover: "hover:border-blue-300 hover:shadow-md",
    header: "bg-white/80 backdrop-blur-sm border-b border-slate-200",
    text: "text-slate-900",
    textSecondary: "text-slate-500",
    textMuted: "text-slate-400",
    accent: "text-blue-600",
    accentBg: "bg-blue-600",
    accentBgHover: "hover:bg-blue-500",
    accentBgSubtle: "bg-blue-50",
    accentBorder: "border-blue-200",
    badgeOnline: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    badgeProcessing: "bg-blue-50 text-blue-600 border border-blue-200",
    navActive: "bg-blue-50 text-blue-600 border-l-2 border-blue-600",
    navInactive: "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-2 border-transparent",
    input: "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-200",
    tableHead: "bg-slate-50 text-slate-500",
    tableRow: "border-b border-slate-100 hover:bg-slate-50/50",
    statusCompleted: "bg-emerald-50 text-emerald-600",
    statusProcessing: "bg-blue-50 text-blue-600",
    statusWaiting: "bg-amber-50 text-amber-600",
    buttonPrimary: "bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/20",
    buttonSecondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
    presetToggle: "bg-slate-100 border border-slate-200",
    presetActive: "bg-blue-600 text-white shadow-sm",
    presetInactive: "text-slate-500 hover:text-slate-700",
  },
  swiss: {
    bg: "bg-stone-100",
    sidebar: "bg-stone-50 border-r-4 border-black",
    card: "bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
    cardHover: "hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]",
    header: "bg-stone-50 border-b-4 border-black",
    text: "text-black font-mono",
    textSecondary: "text-stone-600 font-mono",
    textMuted: "text-stone-500 font-mono",
    accent: "text-red-600",
    accentBg: "bg-red-600",
    accentBgHover: "hover:bg-red-500",
    accentBgSubtle: "bg-red-100",
    accentBorder: "border-black",
    badgeOnline: "bg-emerald-100 text-emerald-800 border-2 border-black",
    badgeProcessing: "bg-blue-100 text-blue-800 border-2 border-black",
    navActive: "bg-yellow-300 text-black border-4 border-black font-bold",
    navInactive: "text-stone-600 hover:text-black hover:bg-stone-200 border-4 border-transparent font-medium",
    input: "bg-white border-4 border-black text-black placeholder:text-stone-400 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none",
    tableHead: "bg-stone-200 text-black font-bold border-b-4 border-black",
    tableRow: "border-b-2 border-stone-300 hover:bg-yellow-100",
    statusCompleted: "bg-emerald-300 text-black border-2 border-black",
    statusProcessing: "bg-blue-300 text-black border-2 border-black",
    statusWaiting: "bg-amber-300 text-black border-2 border-black",
    buttonPrimary: "bg-black hover:bg-stone-800 text-white border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(100,100,100,1)]",
    buttonSecondary: "bg-white hover:bg-stone-100 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    presetToggle: "bg-white border-4 border-black p-2",
    presetActive: "bg-black text-white",
    presetInactive: "text-stone-500 hover:text-black",
  },
}
