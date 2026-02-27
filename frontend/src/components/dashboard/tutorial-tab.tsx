"use client"

import { motion } from "framer-motion"
import { useDashboardTheme, themeStyles } from "./theme-context"
import { BookOpen, CheckCircle2 } from "lucide-react"

export default function TutorialTab() {
  const { theme } = useDashboardTheme()
  const styles = themeStyles[theme]

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className={`${styles.accentBg} p-3 rounded-xl`}>
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${styles.text}`}>
                Complete Tutorial: End-to-End Workflow
              </h1>
              <p className={`text-sm ${styles.textSecondary}`}>
                From image upload to 3D reconstruction and visualization
              </p>
            </div>
          </div>
        </motion.div>

        {/* Prerequisites */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${styles.card} p-6 rounded-2xl border ${styles.border}`}
        >
          <h2 className={`text-xl font-semibold mb-4 ${styles.text}`}>
            Before You Start
          </h2>
          <p className={`text-sm ${styles.textSecondary} mb-4`}>
            If you choose to deploy locally, you will need the following system requirements:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className={`text-sm font-medium ${styles.text}`}>System Requirements</p>
                <p className={`text-xs ${styles.textSecondary} mt-1`}>
                  Python 3.10+, Node.js 18+, CUDA 11.8+ (for GPU acceleration)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className={`text-sm font-medium ${styles.text}`}>AI API Key</p>
                <p className={`text-xs ${styles.textSecondary} mt-1`}>
                  OpenAI, Claude, or Gemini API key for scene recognition
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step 0: API Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className={`${styles.accentBg} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold`}>
              0
            </div>
            <h2 className={`text-2xl font-bold ${styles.text}`}>
              Configure AI Provider
            </h2>
          </div>

          <div className={`${styles.card} p-6 rounded-2xl border ${styles.border} space-y-4`}>
            <p className={`text-sm ${styles.textSecondary}`}>
              Before starting your first project, configure your AI API credentials for intelligent scene recognition.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Navigate to <span className="font-semibold text-indigo-400">Settings</span> tab in the sidebar
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Select your preferred AI provider: <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded">OpenAI</span>, <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded">Claude</span>, or <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded">Gemini</span>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Enter your API key and optional base URL (for custom endpoints)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">4.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Click <span className="font-semibold text-indigo-400">Test Connection</span> to verify your configuration
                </p>
              </div>
            </div>

            <img
              src="/tutorial/step0-api-config.png"
              alt="API Configuration Interface"
              className="w-full rounded-lg border border-white/10 shadow-lg"
            />

            <div className={`${styles.cardHover} p-4 rounded-lg border ${styles.border}`}>
              <p className={`text-xs ${styles.textMuted}`}>
                <span className="font-semibold text-indigo-400">💡 Recommendation:</span> GPT-4o provides the best accuracy for scene recognition, while Gemini offers excellent cost-effectiveness.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Step 1: Create Project & Upload Images */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className={`${styles.accentBg} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold`}>
              1
            </div>
            <h2 className={`text-2xl font-bold ${styles.text}`}>
              Create Project & Upload Images
            </h2>
          </div>

          <div className={`${styles.card} p-6 rounded-2xl border ${styles.border} space-y-4`}>
            <p className={`text-sm ${styles.textSecondary}`}>
              Start by creating a new project and uploading your unordered image collection.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Go to <span className="font-semibold text-indigo-400">Projects</span> tab and click <span className="font-semibold text-indigo-400">New Project</span>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Enter a descriptive project name (e.g., "Campus Building", "Historical Site")
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Select your project from the list, then navigate to <span className="font-semibold text-indigo-400">Upload Data</span> tab
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">4.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Drag and drop images or click to browse. Supported formats: JPG, PNG
                </p>
              </div>
            </div>

            <img
              src="/tutorial/step1-create-upload.png"
              alt="Create Project and Upload Images"
              className="w-full rounded-lg border border-white/10 shadow-lg"
            />

            <div className={`${styles.cardHover} p-4 rounded-lg border ${styles.border}`}>
              <p className={`text-xs ${styles.textMuted}`}>
                <span className="font-semibold text-indigo-400">💡 Best Practices:</span> Upload multiple images from different angles and viewpoints for each scene to achieve better 3D reconstruction results. More images with sufficient overlap lead to higher quality point clouds.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Step 2: Run Classification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className={`${styles.accentBg} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold`}>
              2
            </div>
            <h2 className={`text-2xl font-bold ${styles.text}`}>
              Run Semantic Classification
            </h2>
          </div>

          <div className={`${styles.card} p-6 rounded-2xl border ${styles.border} space-y-4`}>
            <p className={`text-sm ${styles.textSecondary}`}>
              The system uses DINOv2 to extract semantic features and automatically groups images by scene using AI-powered recognition.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  After uploading, click <span className="font-semibold text-indigo-400">Start Classification</span> button
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  DINOv2 extracts 1024-dimensional semantic features from each image
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Images are clustered using DBSCAN algorithm based on feature similarity
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">4.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  AI identifies scene names through multi-image voting and consensus
                </p>
              </div>
            </div>

            <img
              src="/tutorial/step2-classification.png"
              alt="Semantic Classification Process"
              className="w-full rounded-lg border border-white/10 shadow-lg"
            />

            <div className={`${styles.cardHover} p-4 rounded-lg border ${styles.border}`}>
              <p className={`text-xs ${styles.textMuted}`}>
                <span className="font-semibold text-indigo-400">⏱️ Processing Time:</span> Classification typically takes 1-3 minutes depending on the number of images and GPU availability.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Step 3: 3D Reconstruction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className={`${styles.accentBg} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold`}>
              3
            </div>
            <h2 className={`text-2xl font-bold ${styles.text}`}>
              3D Reconstruction
            </h2>
          </div>

          <div className={`${styles.card} p-6 rounded-2xl border ${styles.border} space-y-4`}>
            <p className={`text-sm ${styles.textSecondary}`}>
              Generate a sparse 3D point cloud using Structure-from-Motion (SfM) with ALIKED feature detection and LightGlue matching.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Navigate to <span className="font-semibold text-indigo-400">3D Viewer</span> tab
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Select an image group from the classification results
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Configure parameters: <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded">Resolution (1280px)</span>, <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded">Keypoints (4096)</span>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">4.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Click <span className="font-semibold text-indigo-400">Start Reconstruction</span> and wait for processing
                </p>
              </div>
            </div>

            <img
              src="/tutorial/step3-reconstruction.png"
              alt="3D Reconstruction Interface"
              className="w-full rounded-lg border border-white/10 shadow-lg"
            />

            <div className={`${styles.cardHover} p-4 rounded-lg border ${styles.border} space-y-2`}>
              <p className={`text-xs ${styles.textMuted}`}>
                <span className="font-semibold text-indigo-400">⚙️ Technical Pipeline:</span>
              </p>
              <ul className={`text-xs ${styles.textMuted} space-y-1 ml-4`}>
                <li>• ALIKED extracts local features (rotation-invariant keypoints)</li>
                <li>• LightGlue performs feature matching with attention mechanism</li>
                <li>• USAC-MAGSAC for robust geometric verification</li>
                <li>• pycolmap incremental SfM for camera pose estimation</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Step 4: View & Download Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className={`${styles.accentBg} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold`}>
              4
            </div>
            <h2 className={`text-2xl font-bold ${styles.text}`}>
              View & Download Results
            </h2>
          </div>

          <div className={`${styles.card} p-6 rounded-2xl border ${styles.border} space-y-4`}>
            <p className={`text-sm ${styles.textSecondary}`}>
              Interact with the 3D point cloud in real-time using Three.js viewer, or download files for external processing.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  <span className="font-semibold">Rotate:</span> Left mouse button + drag
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  <span className="font-semibold">Zoom:</span> Mouse wheel scroll
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  <span className="font-semibold">Pan:</span> Right mouse button + drag
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">4.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Download options: <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded">PLY file</span> (point cloud) or <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded">COLMAP project</span> (full reconstruction data)
                </p>
              </div>
            </div>

            <img
              src="/tutorial/step4-view-download.png"
              alt="3D Viewer and Download Options"
              className="w-full rounded-lg border border-white/10 shadow-lg"
            />

            <div className={`${styles.cardHover} p-4 rounded-lg border ${styles.border}`}>
              <p className={`text-xs ${styles.textMuted}`}>
                <span className="font-semibold text-indigo-400">🔧 External Tools:</span> Use CloudCompare, MeshLab, or COLMAP GUI for advanced point cloud processing, mesh generation, and dense reconstruction.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Placeholder for user screenshots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-4"
        >
          <div className={`${styles.card} p-6 rounded-2xl border ${styles.border} space-y-4`}>
            <p className={`text-sm ${styles.textMuted} font-semibold`}>
              📸 Additional Examples
            </p>
            <p className={`text-xs ${styles.textSecondary}`}>
              Here are more detailed examples of the reconstruction workflow:
            </p>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <img
                  src="/tutorial/step4-example1.png"
                  alt="PLY File Visualization in CloudCompare"
                  className="w-full rounded-lg border border-white/10 shadow-lg"
                />
                <p className={`text-xs ${styles.textSecondary} mt-2 text-center`}>
                  PLY file visualization in CloudCompare - Professional point cloud viewer
                </p>
              </div>

              <div>
                <img
                  src="/tutorial/step4-example2.png"
                  alt="COLMAP Dense Reconstruction Settings"
                  className="w-full rounded-lg border border-white/10 shadow-lg"
                />
                <p className={`text-xs ${styles.textSecondary} mt-2 text-center`}>
                  COLMAP dense reconstruction configuration and parameter settings
                </p>
              </div>

              <div>
                <img
                  src="/tutorial/step4-example3.png"
                  alt="COLMAP Dense Reconstruction Result"
                  className="w-full rounded-lg border border-white/10 shadow-lg"
                />
                <p className={`text-xs ${styles.textSecondary} mt-2 text-center`}>
                  Dense reconstruction result displayed in COLMAP GUI
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step 5: Location Query via AI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className={`${styles.accentBg} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold`}>
              5
            </div>
            <h2 className={`text-2xl font-bold ${styles.text}`}>
              Location Query via AI API
            </h2>
          </div>

          <div className={`${styles.card} p-6 rounded-2xl border ${styles.border} space-y-4`}>
            <p className={`text-sm ${styles.textSecondary}`}>
              Leverage cloud-based AI models to automatically identify geographic locations from your classified image groups.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  After classification, the system sends representative images to your configured AI provider
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  AI analyzes visual features, landmarks, and architectural styles to determine location
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  Results include scene name, confidence score, and geographic coordinates (if available)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">4.</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  View location markers on the interactive map in <span className="font-semibold text-indigo-400">Geo Map</span> tab
                </p>
              </div>
            </div>

            <img
              src="/tutorial/step5-location-query.png"
              alt="AI-Powered Location Recognition"
              className="w-full rounded-lg border border-white/10 shadow-lg"
            />

            <div className={`${styles.cardHover} p-4 rounded-lg border ${styles.border}`}>
              <p className={`text-xs ${styles.textMuted}`}>
                <span className="font-semibold text-indigo-400">🌍 Use Cases:</span> Automatically organize travel photos, identify historical sites, or catalog architectural landmarks without manual tagging.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Step 6: Theme Customization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className={`${styles.accentBg} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold`}>
              6
            </div>
            <h2 className={`text-2xl font-bold ${styles.text}`}>
              Customize UI Theme
            </h2>
          </div>

          <div className={`${styles.card} p-6 rounded-2xl border ${styles.border} space-y-4`}>
            <p className={`text-sm ${styles.textSecondary}`}>
              Personalize your workspace with three professionally designed theme presets.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  <span className="font-semibold text-indigo-400">Studio Theme:</span> Modern gradient backgrounds with vibrant accent colors
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  <span className="font-semibold text-emerald-400">Modern Theme:</span> Clean minimalist design with emerald accents
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <p className={`text-sm ${styles.textSecondary}`}>
                  <span className="font-semibold text-rose-400">Swiss Theme:</span> Typography-focused layout with rose accents
                </p>
              </div>
            </div>

            <img
              src="/tutorial/step6-theme-switch.png"
              alt="Theme Customization Options"
              className="w-full rounded-lg border border-white/10 shadow-lg"
            />

            <div className={`${styles.cardHover} p-4 rounded-lg border ${styles.border}`}>
              <p className={`text-xs ${styles.textMuted}`}>
                <span className="font-semibold text-indigo-400">🎨 Quick Switch:</span> Click the theme selector in the bottom-left corner to instantly change the entire interface appearance.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className={`${styles.card} p-6 rounded-2xl border ${styles.border}`}
        >
          <h2 className={`text-xl font-semibold mb-4 ${styles.text}`}>
            🎉 You're All Set!
          </h2>
          <div className="space-y-3">
            <p className={`text-sm ${styles.textSecondary}`}>
              You now have a complete understanding of the Reconstruct.AI workflow. Start uploading your images and experience intelligent 3D reconstruction powered by state-of-the-art computer vision algorithms.
            </p>
            <div className={`${styles.cardHover} p-4 rounded-lg border ${styles.border} space-y-2`}>
              <p className={`text-xs ${styles.textMuted} font-semibold`}>📚 Additional Resources:</p>
              <ul className={`text-xs ${styles.textSecondary} space-y-1 ml-4`}>
                <li>• Check <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">README.md</span> for technical documentation</li>
                <li>• Adjust reconstruction parameters in 3D Viewer settings for optimal results</li>
                <li>• Export COLMAP projects for dense reconstruction using external tools</li>
                <li>• Run <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">INSTALL_ALL.bat</span> for quick dependency installation, then use <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">START_ALL.bat</span> to launch the application</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
