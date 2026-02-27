import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import PointCloudViewer from '../components/PointCloudViewer';

interface Project {
  id: number;
  name: string;
  status: string;
  image_count: number;
}

interface LocationMetadata {
  location_identified: boolean;
  landmark_name: string;
  country: string;
  city: string;
  coordinates: string;
  historical_background: string;
  confidence_score: number;
}

interface ClassificationResult {
  groups: { [key: string]: string[] };
  metadata: { [key: string]: LocationMetadata };
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [uploading, setUploading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  // 3D Reconstruction state
  const [reconstructing, setReconstructing] = useState(false);
  const [reconStatus, setReconStatus] = useState<{status: string; stage: string; progress: number; message: string} | null>(null);
  const [plyUrl, setPlyUrl] = useState<string | null>(null);
  const [showReconConfig, setShowReconConfig] = useState(false);
  const [reconConfig, setReconConfig] = useState({
    img_size: 1024,
    enable_tiling: false,
    top_k: 2048,
    enable_dense: false,
  });
  const reconPollRef = useRef<number | null>(null);
  const [visibleImageCount, setVisibleImageCount] = useState(12);

  // 切换组时重置可见图片数
  const groupNames = classificationResult ? Object.keys(classificationResult.groups) : [];
  const currentGroupName = groupNames[currentGroupIndex];
  const currentImages = currentGroupName ? classificationResult!.groups[currentGroupName] : [];
  const currentMetadata = currentGroupName ? classificationResult!.metadata[currentGroupName] : null;

  useEffect(() => {
    fetchProject();
    fetchClassificationResults();
  }, [id]);

  const fetchProject = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchClassificationResults = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/groups`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Object.keys(data.groups).length > 0) {
          setClassificationResult(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch classification results:', error);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        await fetchProject();
        alert('Images uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleClassify = async () => {
    setClassifying(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/classify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClassificationResult(data);
        setCurrentGroupIndex(0);
        await fetchProject();
        await fetchClassificationResults();
      }
    } catch (error) {
      console.error('Classification failed:', error);
      alert('Classification failed');
    } finally {
      setClassifying(false);
    }
  };

  const handleDownload = async (groupName: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/download/${groupName}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${groupName}.zip`;
        a.click();
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? All data will be permanently removed.')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        navigate('/dashboard');
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const goToPreviousGroup = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
      setPlyUrl(null);
      setReconStatus(null);
      setShowReconConfig(false);
      setVisibleImageCount(12);
      if (reconPollRef.current) clearInterval(reconPollRef.current);
    }
  };

  const goToNextGroup = () => {
    if (currentGroupIndex < groupNames.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
      setPlyUrl(null);
      setReconStatus(null);
      setShowReconConfig(false);
      setVisibleImageCount(12);
      if (reconPollRef.current) clearInterval(reconPollRef.current);
    }
  };

  // Check if reconstruction exists when group changes
  useEffect(() => {
    if (!currentGroupName || currentGroupName === 'discarded') return;
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/api/projects/${id}/reconstruct/${encodeURIComponent(currentGroupName)}/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(r => r.json()).then(data => {
      if (data.status === 'completed') {
        setReconStatus(data);
        loadPlyModel();
      } else if (data.status === 'running') {
        setReconstructing(true);
        setReconStatus(data);
        startPolling();
      }
    }).catch(() => {});
  }, [currentGroupIndex]);

  const loadPlyModel = async () => {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/api/projects/${id}/reconstruct/${encodeURIComponent(currentGroupName)}/model?token=${token}`;
    setPlyUrl(url);
  };

  const startPolling = () => {
    if (reconPollRef.current) clearInterval(reconPollRef.current);
    const token = localStorage.getItem('token');
    reconPollRef.current = window.setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/projects/${id}/reconstruct/${encodeURIComponent(currentGroupName)}/status`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();
        setReconStatus(data);
        if (data.status === 'completed') {
          setReconstructing(false);
          if (reconPollRef.current) clearInterval(reconPollRef.current);
          loadPlyModel();
        } else if (data.status === 'failed') {
          setReconstructing(false);
          if (reconPollRef.current) clearInterval(reconPollRef.current);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000);
  };

  const handleStartReconstruction = async () => {
    const token = localStorage.getItem('token');
    setReconstructing(true);
    setPlyUrl(null);
    setShowReconConfig(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/reconstruct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_name: currentGroupName,
          ...reconConfig,
        }),
      });

      if (response.ok) {
        startPolling();
      } else {
        const err = await response.json();
        alert(err.detail || '启动重建失败');
        setReconstructing(false);
      }
    } catch (error) {
      console.error('Reconstruction failed:', error);
      alert('启动重建失败');
      setReconstructing(false);
    }
  };

  if (!project) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              project.status === 'classified' ? 'bg-blue-500/20 text-blue-400' :
              'bg-slate-700 text-slate-400'
            }`}>
              {project.status}
            </span>
          </div>
          <button
            onClick={handleDeleteProject}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all"
          >
            🗑️ Delete Project
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Upload Section */}
        {project.status === 'created' && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Upload Images</h2>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="text-6xl mb-4">📤</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {uploading ? 'Uploading...' : 'Drag & Drop Images'}
              </h3>
              <p className="text-slate-400 mb-6">or click to browse</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg cursor-pointer transition-all"
              >
                Select Files
              </label>
            </div>
          </div>
        )}

        {/* Classify Button */}
        {project.status === 'uploaded' && !classificationResult && (
          <div className="mb-12 text-center">
            <button
              onClick={handleClassify}
              disabled={classifying}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/50 transition-all transform hover:scale-105 disabled:opacity-50"
            >
              {classifying ? '🔄 Classifying Images...' : '🚀 Start Classification'}
            </button>
            <p className="text-slate-400 mt-4">
              {project.image_count} images ready to classify
            </p>
          </div>
        )}

        {/* Classification Results - New Layout */}
        {classificationResult && groupNames.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Classification Results</h2>
              <button
                onClick={handleClassify}
                disabled={classifying}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {classifying ? '🔄 Reclassifying...' : '🔄 Reclassify'}
              </button>
            </div>

            {/* Group Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPreviousGroup}
                disabled={currentGroupIndex === 0}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ← Previous
              </button>
              <div className="text-center">
                <p className="text-slate-400 text-sm">
                  Group {currentGroupIndex + 1} of {groupNames.length}
                </p>
              </div>
              <button
                onClick={goToNextGroup}
                disabled={currentGroupIndex === groupNames.length - 1}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>

            {/* Current Group Display */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              {/* Group Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold text-white">
                  {currentGroupName === 'discarded' ? '🗑️ Discarded' : `📍 ${currentGroupName}`}
                </h3>
                <button
                  onClick={() => handleDownload(currentGroupName)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                >
                  ⬇️ Download ({currentImages.length})
                </button>
              </div>

              {/* Location Metadata */}
              {currentMetadata && currentMetadata.location_identified && (
                <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Landmark</p>
                      <p className="text-white font-medium">{currentMetadata.landmark_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Location</p>
                      <p className="text-white font-medium">
                        {currentMetadata.city !== 'unknown' && currentMetadata.city}, {currentMetadata.country !== 'unknown' && currentMetadata.country}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Coordinates</p>
                      <p className="text-white font-medium">{currentMetadata.coordinates !== 'unknown' ? currentMetadata.coordinates : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Confidence</p>
                      <p className="text-white font-medium">{(currentMetadata.confidence_score * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  {currentMetadata.historical_background !== 'unknown' && (
                    <div className="mt-4">
                      <p className="text-slate-400 text-sm mb-1">Historical Background</p>
                      <p className="text-white text-sm">{currentMetadata.historical_background}</p>
                    </div>
                  )}

                  {/* Google Maps Embed */}
                  <div className="mt-4">
                    <p className="text-slate-400 text-sm mb-2">Location Map</p>
                    <div className="relative w-full h-64 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                      {currentMetadata.coordinates !== 'unknown' ? (
                        <>
                          {/* Try Google Maps first, fallback to OpenStreetMap */}
                          <iframe
                            src={`https://maps.google.com/maps?q=${currentMetadata.coordinates}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            className="w-full h-full border-0"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title={`Map of ${currentMetadata.landmark_name}`}
                            onError={(e) => {
                              // Fallback to OpenStreetMap if Google Maps fails
                              const coords = currentMetadata.coordinates.split(',').map(c => c.trim());
                              if (coords.length === 2) {
                                e.currentTarget.src = `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(coords[1])-0.01},${parseFloat(coords[0])-0.01},${parseFloat(coords[1])+0.01},${parseFloat(coords[0])+0.01}&layer=mapnik&marker=${coords[0]},${coords[1]}`;
                              }
                            }}
                          />
                        </>
                      ) : (
                        <iframe
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(currentMetadata.landmark_name)}&t=&z=12&ie=UTF8&iwloc=&output=embed`}
                          className="w-full h-full border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title={`Map of ${currentMetadata.landmark_name}`}
                        />
                      )}
                      <a
                        href={currentMetadata.coordinates !== 'unknown'
                          ? `https://www.google.com/maps/search/?api=1&query=${currentMetadata.coordinates}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentMetadata.landmark_name)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg shadow-lg transition-colors z-10"
                      >
                        🗺️ Open in Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Images Grid */}
              <div className="h-[500px] overflow-y-auto bg-slate-800/30 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  {currentImages.slice(0, visibleImageCount).map((img, idx) => (
                    <img
                      key={`${currentGroupName}-${idx}`}
                      src={`${API_BASE_URL}/api/projects/${id}/images/${encodeURIComponent(currentGroupName)}/${encodeURIComponent(img)}?token=${localStorage.getItem('token')}`}
                      alt={img}
                      className="w-full h-48 object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ))}
                </div>
                {visibleImageCount < currentImages.length && (
                  <div className="text-center mt-4">
                    <button
                      onClick={() => setVisibleImageCount(prev => prev + 12)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                    >
                      加载更多 ({currentImages.length - visibleImageCount} 张剩余)
                    </button>
                  </div>
                )}
              </div>

              {/* 3D Reconstruction Section */}
              {currentGroupName !== 'discarded' && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">🧊 3D Reconstruction</h4>
                    <div className="flex items-center gap-2">
                      {/* Download buttons when model exists */}
                      {plyUrl && !reconstructing && (
                        <>
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem('token');
                              try {
                                const res = await fetch(
                                  `${API_BASE_URL}/api/projects/${id}/reconstruct/${encodeURIComponent(currentGroupName)}/download-colmap`,
                                  { headers: { 'Authorization': `Bearer ${token}` } }
                                );
                                if (res.ok) {
                                  const blob = await res.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${currentGroupName}_colmap.zip`;
                                  a.click();
                                }
                              } catch (e) { console.error('Download failed:', e); }
                            }}
                            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                          >
                            📦 下载 COLMAP 文件
                          </button>
                          <button
                            onClick={() => { setPlyUrl(null); setReconStatus(null); setShowReconConfig(true); }}
                            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors"
                          >
                            🔄 重新重建
                          </button>
                        </>
                      )}
                      {/* Start button when no model */}
                      {!reconstructing && !plyUrl && reconStatus?.status !== 'failed' && (
                        <button
                          onClick={() => setShowReconConfig(!showReconConfig)}
                          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
                        >
                          {showReconConfig ? '收起设置' : '⚙️ 开始重建'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Config Panel */}
                  {showReconConfig && !reconstructing && (
                    <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-slate-400 text-sm mb-1">图像分辨率</label>
                          <select
                            value={reconConfig.img_size}
                            onChange={e => setReconConfig({...reconConfig, img_size: parseInt(e.target.value)})}
                            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm"
                          >
                            <option value={512}>512px (快速)</option>
                            <option value={768}>768px (平衡)</option>
                            <option value={1024}>1024px (高质量)</option>
                            <option value={1536}>1536px (超高质量)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 text-sm mb-1">特征点数量</label>
                          <select
                            value={reconConfig.top_k}
                            onChange={e => setReconConfig({...reconConfig, top_k: parseInt(e.target.value)})}
                            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm"
                          >
                            <option value={1024}>1024 (快速)</option>
                            <option value={2048}>2048 (推荐)</option>
                            <option value={4096}>4096 (高精度)</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="enable_tiling"
                            checked={reconConfig.enable_tiling}
                            onChange={e => setReconConfig({...reconConfig, enable_tiling: e.target.checked})}
                            className="w-4 h-4"
                          />
                          <label htmlFor="enable_tiling" className="text-slate-300 text-sm">
                            开启切片模式 (2x2 网格，适合高分辨率图片)
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="enable_dense"
                            checked={reconConfig.enable_dense}
                            onChange={e => setReconConfig({...reconConfig, enable_dense: e.target.checked})}
                            className="w-4 h-4"
                          />
                          <label htmlFor="enable_dense" className="text-slate-300 text-sm">
                            稠密重建 (需要 COLMAP CUDA，效果更好但更慢)
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-slate-500 text-xs">
                          RTX 3070 Ti 8GB: 推荐 1024px + 2048 特征点
                        </p>
                        <button
                          onClick={handleStartReconstruction}
                          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg transition-all"
                        >
                          🚀 开始三维重建
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Progress */}
                  {reconstructing && reconStatus && (
                    <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-blue-500/30">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                        <p className="text-white text-sm">{reconStatus.message}</p>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${reconStatus.progress}%` }}
                        />
                      </div>
                      <p className="text-slate-500 text-xs mt-1 text-right">{reconStatus.progress.toFixed(0)}%</p>
                    </div>
                  )}

                  {/* Failed - with detailed message and retry */}
                  {reconStatus?.status === 'failed' && !reconstructing && (
                    <div className="mb-4 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                      <p className="text-red-400 text-sm font-medium mb-2">❌ 三维重建失败</p>
                      <p className="text-red-300/80 text-sm mb-3">{reconStatus.message}</p>
                      <p className="text-slate-500 text-xs mb-3">
                        可能原因：图片之间重叠度不足、拍摄角度差异过大、图片数量太少（至少需要 3 张）、或图片质量不佳。
                        可以尝试调整参数后重新重建。
                      </p>
                      <button
                        onClick={() => { setReconStatus(null); setShowReconConfig(true); }}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
                      >
                        ⚙️ 调整参数重试
                      </button>
                    </div>
                  )}

                  {/* 3D Viewer */}
                  <PointCloudViewer plyUrl={plyUrl} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
