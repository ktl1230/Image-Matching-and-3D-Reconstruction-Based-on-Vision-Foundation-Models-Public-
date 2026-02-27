import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Trash2,
  FolderOpen,
  Image as ImageIcon,
  Calendar,
  ChevronRight,
  ArrowRight,
  Layers
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

interface ClassificationResult {
  groups: { [key: string]: string[] }
  metadata: { [key: string]: any }
}

export default function ProjectsTab() {
  const { theme, selectedProjectId, setSelectedProjectId, selectedGroupName, setSelectedGroupName, setActiveTab, classifyingProjects, startClassification } = useDashboardTheme()
  const styles = themeStyles[theme]
  
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null)
  const [projectGroups, setProjectGroups] = useState<Record<number, ClassificationResult | null>>({})
  const [loadingGroups, setLoadingGroups] = useState<Record<number, boolean>>({})
  const [visibleImages, setVisibleImages] = useState<Record<number, number>>({})
  const IMAGES_PER_PAGE = 12
  // Removed local classifyingIds state in favor of context state

  useEffect(() => {
    fetchProjects()
  }, [])

  // Watch for completed classifications to refresh groups
  useEffect(() => {
    Object.entries(classifyingProjects).forEach(([idStr, state]) => {
      const id = parseInt(idStr)
      if (state.status === 'completed' && !projectGroups[id]) {
        fetchProjectGroups(id)
        fetchProjects() // Refresh status to "classified"
      }
    })
  }, [classifyingProjects])

  // If a project is already selected globally, expand it
  useEffect(() => {
    if (selectedProjectId && expandedProjectId !== selectedProjectId) {
      setExpandedProjectId(selectedProjectId)
      if (!projectGroups[selectedProjectId]) {
        fetchProjectGroups(selectedProjectId)
      }
    }
  }, [selectedProjectId])

  const fetchProjects = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectGroups = async (projectId: number) => {
    if (projectGroups[projectId] || loadingGroups[projectId]) return

    setLoadingGroups(prev => ({ ...prev, [projectId]: true }))
    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/groups`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data && data.groups) {
          setProjectGroups(prev => ({ ...prev, [projectId]: data }))
        } else {
            // Handle case where no groups exist yet (maybe not classified)
            setProjectGroups(prev => ({ ...prev, [projectId]: null }))
        }
      }
    } catch (error) {
      console.error(`Failed to fetch groups for project ${projectId}:`, error)
    } finally {
      setLoadingGroups(prev => ({ ...prev, [projectId]: false }))
    }
  }

  const handleProjectClick = (projectId: number) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null)
    } else {
      setExpandedProjectId(projectId)
      fetchProjectGroups(projectId)
      // Set as globally selected project
      setSelectedProjectId(projectId)
      // Reset selected group when switching projects
      if (selectedProjectId !== projectId) {
        setSelectedGroupName(null)
      }
      // Initialize visible images count
      if (!visibleImages[projectId]) {
        setVisibleImages(prev => ({ ...prev, [projectId]: IMAGES_PER_PAGE }))
      }
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
        if (selectedProjectId === projectId) {
          setSelectedProjectId(null)
          setSelectedGroupName(null)
          setExpandedProjectId(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleGroupSelect = (projectId: number, groupName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedProjectId(projectId)
    setSelectedGroupName(groupName)
  }

  const handleClassify = async (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    startClassification(projectId)
  }

  const handleNavigateToViewer = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveTab("viewer")
  }

  const loadMoreImages = (projectId: number) => {
    setVisibleImages(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || IMAGES_PER_PAGE) + IMAGES_PER_PAGE
    }))
  }

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/0">
        <div className={`relative w-full sm:w-72 group`}>
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${styles.textMuted} group-focus-within:${styles.accent}`} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all duration-300 ${styles.input}`}
          />
        </div>
        
        <button 
          onClick={() => setActiveTab('upload')}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${styles.buttonPrimary}`}
        >
          <Layers className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                expandedProjectId === project.id 
                  ? `${styles.card} ring-1 ${styles.accentBorder}` 
                  : `${styles.card} ${styles.cardHover}`
              }`}
            >
              {/* Project Header */}
              <div 
                onClick={() => handleProjectClick(project.id)}
                className="p-5 cursor-pointer flex items-center gap-4 select-none"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors duration-300 ${
                  expandedProjectId === project.id ? styles.accentBg : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                }`}>
                  <FolderOpen className={`w-6 h-6 ${expandedProjectId === project.id ? "text-white" : ""}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-lg truncate ${styles.text}`}>{project.name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className={`flex items-center gap-1.5 ${styles.textSecondary}`}>
                      <ImageIcon className="w-3.5 h-3.5" />
                      {project.image_count} images
                    </span>
                    <span className={`flex items-center gap-1.5 ${styles.textSecondary}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    project.status === 'completed' ? styles.badgeOnline : 
                    project.status === 'processing' ? styles.badgeProcessing :
                    styles.textMuted + " border-slate-700 bg-slate-800/50"
                  }`}>
                    {project.status}
                  </span>
                  
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${styles.textMuted} hover:text-red-400 hover:bg-red-500/10`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${styles.textMuted} ${
                    expandedProjectId === project.id ? "rotate-90" : ""
                  }`} />
                </div>
              </div>

              {/* Groups / Details Expansion */}
              <AnimatePresence>
                {expandedProjectId === project.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "circOut" }}
                  >
                    <div className={`px-5 pb-5 pt-0 border-t ${theme === 'studio' ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                      <div className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className={`text-sm font-medium ${styles.textSecondary}`}>Project Groups</h4>
                          {/* If no groups but uploaded, show classify action? */}
                        </div>

                        {loadingGroups[project.id] ? (
                          <div className={`text-center py-8 ${styles.textMuted}`}>Loading groups...</div>
                        ) : projectGroups[project.id] && projectGroups[project.id]?.groups && Object.keys(projectGroups[project.id]!.groups).length > 0 ? (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.keys(projectGroups[project.id]!.groups).map((groupName) => {
                                const isSelected = selectedProjectId === project.id && selectedGroupName === groupName
                                return (
                                  <button
                                    key={groupName}
                                    onClick={(e) => handleGroupSelect(project.id, groupName, e)}
                                    className={`relative flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-200 ${
                                      isSelected 
                                        ? `${styles.accentBgSubtle} ${styles.accentBorder} ring-1 ring-indigo-500/30` 
                                        : `${theme === 'studio' ? 'bg-slate-800/40 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'} border-transparent`
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        isSelected ? styles.accentBg : "bg-slate-700/50"
                                      } ${isSelected ? "text-white" : styles.textMuted}`}>
                                        <Layers className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className={`text-sm font-medium ${isSelected ? styles.accent : styles.text}`}>
                                          {groupName}
                                        </div>
                                        <div className={`text-xs ${styles.textMuted}`}>
                                          {projectGroups[project.id]!.groups[groupName].length} images
                                        </div>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <div 
                                        role="button"
                                        onClick={handleNavigateToViewer}
                                        className={`p-1.5 rounded-md hover:bg-white/20 transition-colors text-indigo-400`}
                                        title="Go to 3D Viewer"
                                      >
                                        <ArrowRight className="w-4 h-4" />
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                            
                            {/* Image Preview Section */}
                            <div className={`p-4 rounded-xl border ${theme === 'studio' ? 'bg-slate-900/30 border-white/[0.04]' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <h5 className={`text-sm font-medium ${styles.textSecondary}`}>
                                  {selectedProjectId === project.id && selectedGroupName 
                                    ? `Preview: ${selectedGroupName}`
                                    : "Project Images Preview"}
                                </h5>
                                {selectedProjectId === project.id && selectedGroupName && (
                                  <span className="text-xs text-slate-500">
                                    {projectGroups[project.id]!.groups[selectedGroupName].length} images
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                {(() => {
                                  // Optimized image selection logic with pagination
                                  const currentGroups = projectGroups[project.id]!.groups
                                  let imagesToShow: { name: string, group: string }[] = []
                                  const currentLimit = visibleImages[project.id] || IMAGES_PER_PAGE

                                  if (selectedProjectId === project.id && selectedGroupName && currentGroups[selectedGroupName]) {
                                    // Show images from selected group
                                    imagesToShow = currentGroups[selectedGroupName].slice(0, currentLimit).map(img => ({
                                      name: img,
                                      group: selectedGroupName
                                    }))
                                  } else {
                                    // Show mixed images from all groups (optimized)
                                    for (const [gName, gImages] of Object.entries(currentGroups)) {
                                      if (imagesToShow.length >= currentLimit) break
                                      const remaining = currentLimit - imagesToShow.length
                                      const slice = gImages.slice(0, remaining)
                                      imagesToShow.push(...slice.map(img => ({ name: img, group: gName })))
                                    }
                                  }

                                  if (imagesToShow.length === 0) {
                                    return <div className={`col-span-full text-center py-8 text-sm ${styles.textMuted}`}>No images found</div>
                                  }

                                  return imagesToShow.map((imgObj, i) => (
                                    <div key={`${imgObj.group}-${i}`} className="aspect-square rounded-lg overflow-hidden bg-slate-800 relative group/img">
                                      <img
                                        src={`${API_BASE_URL}/api/projects/${project.id}/images/${imgObj.group}/${imgObj.name}?token=${localStorage.getItem('token')}`}
                                        alt={imgObj.name}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                                        loading="lazy"
                                      />
                                    </div>
                                  ))
                                })()}
                              </div>

                              {/* Load More Button */}
                              {(() => {
                                const currentGroups = projectGroups[project.id]!.groups
                                const currentLimit = visibleImages[project.id] || IMAGES_PER_PAGE
                                let totalImages = 0

                                if (selectedProjectId === project.id && selectedGroupName && currentGroups[selectedGroupName]) {
                                  totalImages = currentGroups[selectedGroupName].length
                                } else {
                                  totalImages = Object.values(currentGroups).reduce((sum, imgs) => sum + imgs.length, 0)
                                }

                                if (currentLimit < totalImages) {
                                  return (
                                    <div className="mt-3 text-center">
                                      <button
                                        onClick={() => loadMoreImages(project.id)}
                                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${styles.buttonPrimary}`}
                                      >
                                        Load More ({totalImages - currentLimit} remaining)
                                      </button>
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className={`text-center py-6 rounded-xl border border-dashed ${theme === 'studio' ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
                            {classifyingProjects[project.id]?.status === 'running' ? (
                              <div className="px-8 py-6">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="relative">
                                    <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
                                  </div>
                                  <div className="text-center">
                                    <p className={`text-sm font-medium ${styles.text} mb-1`}>Classifying images...</p>
                                    <p className={`text-xs ${styles.textMuted}`}>This process may take a few minutes. You can navigate away safely.</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className={`text-sm ${styles.textMuted} mb-3`}>No groups found. Start classification to generate groups.</p>
                                <button
                                  onClick={(e) => handleClassify(project.id, e)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${styles.buttonPrimary}`}
                                >
                                  Start Classification
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredProjects.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className={styles.textMuted}>No projects found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
