import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Box,
  Settings,
  Play,
  Loader2,
  Download,
  RotateCcw
} from "lucide-react"
import { useDashboardTheme, themeStyles } from "./theme-context"
import { API_BASE_URL } from "../../config/api"
import PointCloudViewer from "../PointCloudViewer"

interface ReconStatus {
  status: string
  stage: string
  progress: number
  message: string
}

export default function Viewer3DTab() {
  const { theme, selectedProjectId, selectedGroupName, setActiveTab } = useDashboardTheme()
  const styles = themeStyles[theme]
  
  const [reconstructing, setReconstructing] = useState(false)
  const [reconStatus, setReconStatus] = useState<ReconStatus | null>(null)
  const [plyUrl, setPlyUrl] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  
  // Reconstruction Config
  const [config, setConfig] = useState({
    img_size: 1280,
    enable_tiling: false,
    top_k: 4096,
    enable_dense: false,
  })

  const reconPollRef = useRef<number | null>(null)

  useEffect(() => {
    if (selectedProjectId && selectedGroupName) {
      checkStatus()
    } else {
      setReconStatus(null)
      setPlyUrl(null)
    }

    return () => {
      if (reconPollRef.current) clearInterval(reconPollRef.current)
    }
  }, [selectedProjectId, selectedGroupName])

  const checkStatus = async () => {
    if (!selectedProjectId || !selectedGroupName) return
    
    const token = localStorage.getItem('token')
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${selectedProjectId}/reconstruct/${encodeURIComponent(selectedGroupName)}/status`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (response.ok) {
        const data = await response.json()
        setReconStatus(data)
        
        if (data.status === 'completed') {
          loadPlyModel()
        } else if (data.status === 'running') {
          setReconstructing(true)
          startPolling()
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error)
    }
  }

  const loadPlyModel = () => {
    if (!selectedProjectId || !selectedGroupName) return
    const token = localStorage.getItem('token')
    const url = `${API_BASE_URL}/api/projects/${selectedProjectId}/reconstruct/${encodeURIComponent(selectedGroupName)}/model?token=${token}`
    setPlyUrl(url)
  }

  const startPolling = () => {
    if (reconPollRef.current) clearInterval(reconPollRef.current)
    const token = localStorage.getItem('token')
    
    reconPollRef.current = window.setInterval(async () => {
      if (!selectedProjectId || !selectedGroupName) return

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/projects/${selectedProjectId}/reconstruct/${encodeURIComponent(selectedGroupName)}/status`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const data = await response.json()
        setReconStatus(data)
        
        if (data.status === 'completed') {
          setReconstructing(false)
          if (reconPollRef.current) clearInterval(reconPollRef.current)
          loadPlyModel()
        } else if (data.status === 'failed') {
          setReconstructing(false)
          if (reconPollRef.current) clearInterval(reconPollRef.current)
        }
      } catch (e) {
        console.error('Polling error:', e)
      }
    }, 2000)
  }

  const handleStartReconstruction = async () => {
    if (!selectedProjectId || !selectedGroupName) return
    
    setReconstructing(true)
    setPlyUrl(null)
    setShowConfig(false)
    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${selectedProjectId}/reconstruct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_name: selectedGroupName,
          ...config,
        }),
      })

      if (response.ok) {
        startPolling()
      } else {
        const err = await response.json()
        alert(err.detail || 'Failed to start reconstruction')
        setReconstructing(false)
      }
    } catch (error) {
      console.error('Reconstruction failed:', error)
      alert('Failed to start reconstruction')
      setReconstructing(false)
    }
  }

  const handleDownloadColmap = async () => {
    if (!selectedProjectId || !selectedGroupName) return
    const token = localStorage.getItem('token')
    
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/projects/${selectedProjectId}/reconstruct/${encodeURIComponent(selectedGroupName)}/download-colmap`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedGroupName}_colmap.zip`
        a.click()
      }
    } catch (e) { console.error('Download failed:', e) }
  }

  if (!selectedProjectId || !selectedGroupName) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center ${theme === 'studio' ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <Box className={`w-12 h-12 ${styles.textMuted}`} />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className={`text-xl font-semibold ${styles.text}`}>No Group Selected</h2>
          <p className={styles.textSecondary}>
            Please select a project and a specific group from the Projects tab to view or start 3D reconstruction.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${styles.buttonPrimary}`}
        >
          Go to Projects
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header / Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${styles.text}`}>
            <Box className="w-5 h-5" />
            {selectedGroupName}
          </h2>
          <p className={`text-sm ${styles.textMuted}`}>
            {reconStatus?.status === 'completed' ? 'Reconstruction completed' : 
             reconstructing ? 'Reconstruction in progress...' : 
             'Ready for reconstruction'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {reconStatus?.status === 'completed' && (
            <button
              onClick={handleDownloadColmap}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${styles.buttonSecondary}`}
            >
              <Download className="w-4 h-4" />
              Download COLMAP
            </button>
          )}

          {reconStatus?.status !== 'running' && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                showConfig ? styles.accentBgSubtle + " " + styles.accent : styles.buttonSecondary
              }`}
            >
              <Settings className="w-4 h-4" />
              Configuration
            </button>
          )}

          {reconStatus?.status !== 'running' && (
            <button
              onClick={handleStartReconstruction}
              disabled={reconstructing}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${styles.buttonPrimary}`}
            >
              {reconStatus?.status === 'completed' ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {reconStatus?.status === 'completed' ? 'Re-Run' : 'Start Reconstruction'}
            </button>
          )}
        </div>
      </div>

      {/* Config Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden rounded-xl border p-6 ${styles.card}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${styles.textSecondary}`}>图像分辨率</label>
                <select
                  value={config.img_size}
                  onChange={(e) => setConfig({ ...config, img_size: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg outline-none ${styles.input}`}
                >
                  <option value={768}>768px (快速)</option>
                  <option value={1024}>1024px (平衡)</option>
                  <option value={1280}>1280px (推荐)</option>
                  <option value={1536}>1536px (超高质量)</option>
                </select>
                <p className={`text-xs ${styles.textMuted} mt-1`}>更高分辨率需要更多显存</p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${styles.textSecondary}`}>特征点数量</label>
                <select
                  value={config.top_k}
                  onChange={(e) => setConfig({ ...config, top_k: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg outline-none ${styles.input}`}
                >
                  <option value={2048}>2048 (快速)</option>
                  <option value={4096}>4096 (推荐)</option>
                  <option value={8192}>8192 (高精度)</option>
                </select>
                <p className={`text-xs ${styles.textMuted} mt-1`}>更多特征点提高精度但更慢</p>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="enable_tiling"
                  checked={config.enable_tiling}
                  onChange={(e) => setConfig({ ...config, enable_tiling: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                />
                <label htmlFor="enable_tiling" className={`text-sm font-medium ${styles.textSecondary}`}>
                  开启切片模式 (2x2网格)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="enable_dense"
                  checked={config.enable_dense}
                  onChange={(e) => setConfig({ ...config, enable_dense: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                />
                <label htmlFor="enable_dense" className={`text-sm font-medium ${styles.textSecondary}`}>
                  稠密重建 (COLMAP CUDA)
                </label>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              💡 推荐配置 (RTX 3070 Ti 8GB): 1280px + 4096特征点 + RANSAC几何验证
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewer Area */}
      <div className={`flex-1 rounded-2xl overflow-hidden border relative ${styles.card} ${theme === 'studio' ? 'bg-slate-950' : 'bg-slate-900'}`}>
        {reconstructing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-slate-900/80 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
            <h3 className="text-xl font-semibold mb-2">Reconstruction in Progress</h3>
            <p className="text-slate-400 mb-6">{reconStatus?.message || 'Processing...'}</p>
            
            <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${reconStatus?.progress || 0}%` }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">{reconStatus?.stage}</p>
          </div>
        ) : plyUrl ? (
          <div className="w-full h-full relative">
            <PointCloudViewer plyUrl={plyUrl} />
            <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur text-xs text-slate-400 px-3 py-1.5 rounded-lg border border-white/10">
              Left Click: Rotate | Right Click: Pan | Scroll: Zoom
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <Box className={`w-16 h-16 mb-4 ${styles.textMuted} opacity-20`} />
            <h3 className={`text-lg font-medium ${styles.textSecondary}`}>No 3D Model Available</h3>
            <p className={`text-sm max-w-sm mt-2 ${styles.textMuted}`}>
              Start the reconstruction process to generate a 3D point cloud from your images.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
