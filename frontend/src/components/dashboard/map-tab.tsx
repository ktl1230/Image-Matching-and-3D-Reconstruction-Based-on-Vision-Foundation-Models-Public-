import { useState, useEffect } from "react"
import { MapPin, Info, AlertTriangle, ExternalLink } from "lucide-react"
import { useDashboardTheme, themeStyles } from "./theme-context"
import { API_BASE_URL } from "../../config/api"

interface LocationMetadata {
  location_identified: boolean
  landmark_name: string
  country: string
  city: string
  coordinates: string
  historical_background: string
  confidence_score: number
}

interface ClassificationResult {
  groups: { [key: string]: string[] }
  metadata: { [key: string]: LocationMetadata }
}

export default function MapTab() {
  const { theme, selectedProjectId, selectedGroupName, setActiveTab } = useDashboardTheme()
  const styles = themeStyles[theme]
  
  const [loading, setLoading] = useState(false)
  const [metadata, setMetadata] = useState<LocationMetadata | null>(null)

  useEffect(() => {
    if (selectedProjectId && selectedGroupName) {
      fetchMetadata()
    } else {
      setMetadata(null)
    }
  }, [selectedProjectId, selectedGroupName])

  const fetchMetadata = async () => {
    if (!selectedProjectId || !selectedGroupName) return

    setLoading(true)
    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${selectedProjectId}/groups`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data: ClassificationResult = await response.json()
        if (data.metadata && data.metadata[selectedGroupName]) {
          setMetadata(data.metadata[selectedGroupName])
        } else {
          setMetadata(null)
        }
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedProjectId || !selectedGroupName) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center ${theme === 'studio' ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <MapPin className={`w-12 h-12 ${styles.textMuted}`} />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className={`text-xl font-semibold ${styles.text}`}>No Group Selected</h2>
          <p className={styles.textSecondary}>
            Please select a project and a specific group from the Projects tab to view its location data.
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
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${styles.text}`}>
            <MapPin className="w-5 h-5" />
            {selectedGroupName} Location
          </h2>
          <p className={`text-sm ${styles.textMuted}`}>
            Geographic context and metadata
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : metadata ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
          {/* Map View or No Location Message */}
          <div className={`lg:col-span-2 rounded-2xl overflow-hidden border relative ${styles.card}`}>
            {metadata.coordinates !== 'unknown' && metadata.landmark_name !== 'unknown' ? (
              <>
                <iframe
                  src={`https://maps.google.com/maps?q=${metadata.coordinates}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${metadata.landmark_name}`}
                  onError={(e) => {
                    const coords = metadata.coordinates.split(',').map(c => c.trim())
                    if (coords.length === 2) {
                      e.currentTarget.src = `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(coords[1])-0.01},${parseFloat(coords[0])-0.01},${parseFloat(coords[1])+0.01},${parseFloat(coords[0])+0.01}&layer=mapnik&marker=${coords[0]},${coords[1]}`
                    }
                  }}
                />

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${metadata.coordinates}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-4 right-4 px-4 py-2 bg-white text-slate-900 text-sm font-medium rounded-lg shadow-lg hover:bg-slate-50 transition-colors z-10 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Google Maps
                </a>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <MapPin className={`w-16 h-16 mb-4 ${styles.textMuted}`} />
                <h3 className={`text-lg font-semibold ${styles.text} mb-2`}>No Specific Location</h3>
                <p className={`text-sm ${styles.textSecondary} max-w-md`}>
                  The AI model could not identify a specific geographic location for this landmark.
                  Only general information is available.
                </p>
              </div>
            )}
          </div>

          {/* Metadata Panel */}
          <div className="space-y-6 overflow-y-auto">
            <div className={`p-6 rounded-2xl border ${styles.card}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${styles.text}`}>
                <Info className="w-5 h-5" />
                Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className={`text-xs uppercase tracking-wider font-semibold ${styles.textMuted}`}>Landmark</label>
                  <p className={`text-lg font-medium ${styles.text}`}>
                    {metadata.landmark_name !== 'unknown' ? metadata.landmark_name : 'Unknown Location'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs uppercase tracking-wider font-semibold ${styles.textMuted}`}>City</label>
                    <p className={`font-medium ${styles.text}`}>
                      {metadata.city !== 'unknown' ? metadata.city : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs uppercase tracking-wider font-semibold ${styles.textMuted}`}>Country</label>
                    <p className={`font-medium ${styles.text}`}>
                      {metadata.country !== 'unknown' ? metadata.country : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className={`text-xs uppercase tracking-wider font-semibold ${styles.textMuted}`}>Coordinates</label>
                  <p className={`font-mono text-sm ${styles.textSecondary}`}>
                    {metadata.coordinates !== 'unknown' ? metadata.coordinates : 'Not available'}
                  </p>
                </div>

                <div>
                  <label className={`text-xs uppercase tracking-wider font-semibold ${styles.textMuted}`}>AI Confidence</label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${metadata.confidence_score > 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${metadata.confidence_score * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${styles.text}`}>{(metadata.confidence_score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {metadata.historical_background !== 'unknown' && (
              <div className={`p-6 rounded-2xl border ${styles.card}`}>
                <h3 className={`text-lg font-semibold mb-4 ${styles.text}`}>Historical Context</h3>
                <p className={`leading-relaxed text-sm ${styles.textSecondary}`}>
                  {metadata.historical_background}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`flex-1 flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed ${theme === 'studio' ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50'}`}>
          <AlertTriangle className={`w-12 h-12 mb-4 ${styles.textMuted}`} />
          <h3 className={`text-lg font-medium ${styles.textSecondary}`}>No Location Data</h3>
          <p className={`max-w-md mt-2 ${styles.textMuted}`}>
            Could not retrieve location metadata for this group. The images might not contain sufficient visual landmarks.
          </p>
        </div>
      )}
    </div>
  )
}
