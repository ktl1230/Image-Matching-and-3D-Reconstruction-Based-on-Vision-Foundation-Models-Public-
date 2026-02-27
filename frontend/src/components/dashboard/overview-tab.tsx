"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  FolderKanban,
  Cloud,
  ArrowUpRight,
  Sparkles,
  Trash2,
  Image as ImageIcon
} from "lucide-react"
import { useDashboardTheme, themeStyles } from "./theme-context"
import { API_BASE_URL } from "../../config/api"

interface Project {
  id: number
  name: string
  status: string
  image_count: number
  created_at: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export function OverviewTab() {
  const { theme, setActiveTab, setSelectedProjectId } = useDashboardTheme()
  const s = themeStyles[theme]
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const handleDeleteProject = async (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project?')) return

    const token = localStorage.getItem('token')
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId))
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  // Calculate stats
  const activeProjectsCount = projects.length
  const totalImages = projects.reduce((acc, p) => acc + p.image_count, 0)
  // Mock point count (e.g. 1000 points per image approx)
  const cloudPoints = (totalImages * 0.05).toFixed(1) + "M" 

  const stats = [
    { label: "Active Projects", value: activeProjectsCount.toString(), icon: FolderKanban, change: "Total projects" },
    { label: "Cloud Points (Est.)", value: cloudPoints, icon: Cloud, change: "Across all projects" },
    { label: "Total Images", value: totalImages.toString(), icon: ImageIcon, change: "Processed & Pending" },
  ]

  const getStatusColor = (status: string) => {
    if (status === "completed") return s.statusCompleted
    if (status === "classified" || status === "processing") return s.statusProcessing
    return s.statusWaiting
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 overflow-y-auto flex-1 h-full"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            className={`p-5 rounded-xl ${s.card} ${s.cardHover} transition-all duration-500`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${s.accentBgSubtle} transition-colors duration-500`}>
                <stat.icon className={`w-5 h-5 ${s.accent}`} />
              </div>
              <ArrowUpRight className={`w-4 h-4 ${s.textMuted}`} />
            </div>
            <p className={`text-2xl font-bold ${s.text} transition-colors duration-500`}>{stat.value}</p>
            <p className={`text-sm font-medium ${s.textSecondary} mt-0.5 transition-colors duration-500`}>{stat.label}</p>
            <p className={`text-xs ${s.textMuted} mt-1 transition-colors duration-500`}>{stat.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Create New Project CTA */}
      <motion.div
        variants={itemVariants}
        className={`relative overflow-hidden p-6 rounded-xl mb-8 ${s.card} ${s.cardHover} transition-all duration-500`}
      >
        {theme === "studio" && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)",
            }}
          />
        )}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${s.accentBg} transition-colors duration-500`}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${s.text} transition-colors duration-500`}>Create New Project</h3>
              <p className={`text-sm ${s.textSecondary} transition-colors duration-500`}>
                Upload images and let AI Clustering build your 3D model automatically.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${s.buttonPrimary}`}
          >
            + New Project
          </button>
        </div>
      </motion.div>

      {/* Recent Projects Table */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${s.text} transition-colors duration-500`}>Recent Projects</h3>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`text-xs font-medium ${s.accent} hover:underline`}
          >
            View All
          </button>
        </div>
        
        <div className={`overflow-hidden rounded-xl ${s.card} transition-colors duration-500`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`${s.tableHead} text-xs uppercase tracking-wider`}>
                <th className="px-6 py-4 font-semibold">Project Name</th>
                <th className="px-6 py-4 font-semibold">Images</th>
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'swiss' ? 'divide-black' : 'divide-white/[0.04]'}`}>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No projects found. Create one to get started.
                  </td>
                </tr>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <tr 
                    key={project.id} 
                    className={`${s.tableRow} transition-colors duration-300 group cursor-pointer`}
                    onClick={() => {
                      setSelectedProjectId(project.id)
                      setActiveTab('projects')
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className={`font-medium ${s.text}`}>{project.name}</div>
                    </td>
                    <td className={`px-6 py-4 ${s.textSecondary}`}>{project.image_count}</td>
                    <td className={`px-6 py-4 ${s.textSecondary}`}>{new Date(project.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className={`p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 ${s.textMuted} transition-colors`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )
}
