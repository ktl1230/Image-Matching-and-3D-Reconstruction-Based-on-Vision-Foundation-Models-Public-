import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Save, Key, AlertCircle, CheckCircle2, Info, TestTube } from "lucide-react"
import { useDashboardTheme, themeStyles } from "./theme-context"

interface APIConfig {
  api_key: string
  base_url: string
  model: string
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

export default function SettingsTab() {
  const { theme } = useDashboardTheme()
  const styles = themeStyles[theme]

  const [config, setConfig] = useState<APIConfig>({
    api_key: "",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  })

  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = () => {
    const saved = localStorage.getItem("api_config")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConfig(parsed)
      } catch (e) {
        console.error("Failed to parse saved config:", e)
      }
    }
  }

  const testAPI = async () => {
    if (!config.api_key || !config.base_url || !config.model) {
      setSaveStatus("error")
      setMessage("Please fill in all required fields before testing")
      return false
    }

    setTesting(true)
    setSaveStatus("idle")
    setMessage("")

    try {
      const response = await fetch(`${config.base_url}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.api_key}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: "test" }],
          max_tokens: 5,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API test failed: ${response.status}`)
      }

      setSaveStatus("success")
      setMessage("API connection successful!")
      return true
    } catch (error: any) {
      setSaveStatus("error")
      setMessage(`API test failed: ${error.message}`)
      return false
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setSaveStatus("idle")
    setMessage("")

    try {
      // Test API first
      const testResult = await testAPI()

      if (!testResult) {
        setLoading(false)
        return
      }

      // Save to localStorage only if test passes
      localStorage.setItem("api_config", JSON.stringify(config))

      setSaveStatus("success")
      setMessage("API configuration saved successfully!")

      setTimeout(() => {
        setSaveStatus("idle")
        setMessage("")
      }, 3000)
    } catch (error) {
      setSaveStatus("error")
      setMessage("Failed to save configuration. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    await testAPI()
  }

  const handleReset = () => {
    setConfig({
      api_key: "",
      base_url: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    })
    setSaveStatus("idle")
    setMessage("")
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 overflow-y-auto flex-1 h-full"
    >
      <motion.div variants={itemVariants} className="max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2.5 rounded-lg ${styles.accentBgSubtle}`}>
            <Key className={`w-5 h-5 ${styles.accent}`} />
          </div>
          <h2 className={`text-2xl font-bold ${styles.text}`}>API Settings</h2>
        </div>
        <p className={`${styles.textSecondary} mb-8`}>
          Configure your API settings for location identification and image classification. Supports OpenAI API and compatible proxy services.
        </p>

        {/* Info Banner */}
        <motion.div
          variants={itemVariants}
          className={`p-4 rounded-xl border mb-6 ${theme === 'studio' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className={`text-sm ${styles.text} font-medium mb-1`}>About API Configuration</p>
              <p className={`text-xs ${styles.textSecondary}`}>
                Your API key is stored locally in your browser and never sent to our servers.
                It's used to make direct requests to the configured API endpoint. Supports proxy/relay stations.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <div className="space-y-6">
          {/* API Key */}
          <motion.div variants={itemVariants}>
            <label className={`block text-sm font-medium ${styles.text} mb-2`}>
              API Key
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder="sk-... or your API key"
              className={`w-full px-4 py-3 rounded-lg font-mono text-sm transition-all duration-200 ${styles.input}`}
            />
            <p className={`text-xs ${styles.textMuted} mt-1.5`}>
              Enter your API key from OpenAI or compatible service provider
            </p>
          </motion.div>

          {/* Base URL */}
          <motion.div variants={itemVariants}>
            <label className={`block text-sm font-medium ${styles.text} mb-2`}>
              API Base URL
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={config.base_url}
              onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className={`w-full px-4 py-3 rounded-lg font-mono text-sm transition-all duration-200 ${styles.input}`}
            />
            <p className={`text-xs ${styles.textMuted} mt-1.5`}>
              Use custom base URL for API proxies, relay stations, or compatible services
            </p>
          </motion.div>

          {/* Model */}
          <motion.div variants={itemVariants}>
            <label className={`block text-sm font-medium ${styles.text} mb-2`}>
              Model Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder="gpt-4o-mini"
              className={`w-full px-4 py-3 rounded-lg font-mono text-sm transition-all duration-200 ${styles.input}`}
            />
            <p className={`text-xs ${styles.textMuted} mt-1.5`}>
              Enter the model name (e.g., gpt-4o, gpt-4o-mini, gpt-3.5-turbo, or custom model)
            </p>
          </motion.div>

          {/* Status Message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg flex items-center gap-3 ${
                saveStatus === "success"
                  ? theme === 'studio' ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"
                  : theme === 'studio' ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"
              }`}
            >
              {saveStatus === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <p className={`text-sm ${saveStatus === "success" ? "text-emerald-600" : "text-red-600"}`}>
                {message}
              </p>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div variants={itemVariants} className="flex gap-3 pt-2">
            <button
              onClick={handleTest}
              disabled={testing || loading || !config.api_key || !config.base_url || !config.model}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                theme === 'studio'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  Test API
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={loading || testing || !config.api_key || !config.base_url || !config.model}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={loading || testing}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                theme === 'studio'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Reset to Default
            </button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
