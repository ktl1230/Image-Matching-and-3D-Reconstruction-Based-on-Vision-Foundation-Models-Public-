import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  FileImage,
  X,
  ArrowRight,
  Loader2
} from "lucide-react"
import { useDashboardTheme, themeStyles } from "./theme-context"
import { API_BASE_URL } from "../../config/api"

export default function UploadTab() {
  const { theme, setActiveTab, setSelectedProjectId } = useDashboardTheme()
  const styles = themeStyles[theme]
  
  const [step, setStep] = useState<'create' | 'upload'>('create')
  const [projectName, setProjectName] = useState("")
  const [projectId, setProjectId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [files, setFiles] = useState<File[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return

    setLoading(true)
    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: projectName }),
      })

      if (response.ok) {
        const newProject = await response.json()
        setProjectId(newProject.id)
        setSelectedProjectId(newProject.id)
        setStep('upload')
      } else {
        alert('Failed to create project')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'))
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (!projectId || files.length === 0) return

    setLoading(true)
    const token = localStorage.getItem('token')
    const formData = new FormData()
    
    files.forEach(file => {
      formData.append('files', file)
    })

    const xhr = new XMLHttpRequest()
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100
        setUploadProgress(Math.round(percentComplete))
      }
    }

    xhr.onload = async () => {
      if (xhr.status === 200) {
        setUploadProgress(100)
        setTimeout(() => {
          setLoading(false)
          setFiles([])
          setStep('create')
          setProjectName("")
          setProjectId(null)
          alert('Upload complete!')
          // Redirect to projects
          setActiveTab('projects')
        }, 500)
      } else {
        console.error('Upload failed:', xhr.statusText)
        alert('Upload failed')
        setLoading(false)
      }
    }

    xhr.onerror = () => {
      console.error('Upload failed network error')
      alert('Upload failed')
      setLoading(false)
    }

    xhr.open('POST', `${API_BASE_URL}/api/projects/${projectId}/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center gap-2 ${step === 'create' ? styles.accent : styles.textMuted}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            step === 'create' ? `border-current ${styles.accentBgSubtle}` : "border-slate-700"
          }`}>1</div>
          <span className="font-medium">Create Project</span>
        </div>
        <div className={`w-16 h-0.5 ${step === 'upload' ? styles.accentBg : "bg-slate-800"}`} />
        <div className={`flex items-center gap-2 ${step === 'upload' ? styles.accent : styles.textMuted}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            step === 'upload' ? `border-current ${styles.accentBgSubtle}` : "border-slate-700"
          }`}>2</div>
          <span className="font-medium">Upload Images</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'create' ? (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`p-8 rounded-2xl border ${styles.card}`}
          >
            <h2 className={`text-2xl font-bold mb-6 ${styles.text}`}>Name your project</h2>
            <form onSubmit={handleCreateProject} className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${styles.textSecondary}`}>Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Paris Vacation 2024"
                  className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${styles.input}`}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!projectName.trim() || loading}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${styles.buttonPrimary} ${
                  (!projectName.trim() || loading) ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {loading ? "Creating..." : "Continue to Upload"}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive 
                  ? `${styles.accentBorder} ${styles.accentBgSubtle}` 
                  : `${theme === 'studio' ? 'border-slate-700 hover:border-slate-600' : 'border-slate-300 hover:border-slate-400'}`
              } ${loading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${styles.accentBgSubtle}`}>
                  <Upload className={`w-8 h-8 ${styles.accent}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-semibold mb-2 ${styles.text}`}>
                    Drag & Drop images here
                  </h3>
                  <p className={styles.textSecondary}>
                    or <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={`hover:underline ${styles.accent}`}
                    >
                      browse files
                    </button> to upload
                  </p>
                </div>
                <p className={`text-sm ${styles.textMuted}`}>
                  Supported formats: JPG, PNG, WEBP
                </p>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className={`rounded-xl border p-4 ${styles.card}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`font-medium ${styles.textSecondary}`}>Selected Files ({files.length})</h4>
                  <button 
                    onClick={() => setFiles([])}
                    className={`text-sm hover:text-red-400 ${styles.textMuted}`}
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                  {files.map((file, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${theme === 'studio' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileImage className={`w-5 h-5 flex-shrink-0 ${styles.textMuted}`} />
                        <span className={`text-sm truncate ${styles.text}`}>{file.name}</span>
                        <span className={`text-xs ${styles.textMuted}`}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <button 
                        onClick={() => removeFile(i)}
                        className={`p-1 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors ${styles.textMuted}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Action */}
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => setStep('create')} // Go back? Maybe not needed
                className={`px-6 py-3 rounded-xl font-medium transition-all ${styles.buttonSecondary}`}
              >
                Back
              </button>
              <button
                onClick={handleUpload}
                disabled={files.length === 0 || loading}
                className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${styles.buttonPrimary} ${
                  (files.length === 0 || loading) ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload {files.length} Images
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
