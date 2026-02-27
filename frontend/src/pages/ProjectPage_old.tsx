import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

interface Project {
  id: number;
  name: string;
  status: string;
  image_count: number;
}

interface ClassificationResult {
  [key: string]: string[];
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [uploading, setUploading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
      const response = await fetch(`http://localhost:8000/api/projects/${id}/groups`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Object.keys(data.groups).length > 0) {
          setClassificationResult(data.groups);
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
      const response = await fetch(`http://localhost:8000/api/projects/${id}/upload`, {
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
      const response = await fetch(`http://localhost:8000/api/projects/${id}/classify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClassificationResult(data.groups);
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
      const response = await fetch(`http://localhost:8000/api/projects/${id}/download/${groupName}`, {
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

        {/* Classification Results */}
        {classificationResult && (
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(classificationResult).map(([groupName, images]) => (
                <div
                  key={groupName}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      {groupName === 'discarded' ? '🗑️ Discarded' : `📁 ${groupName}`}
                    </h3>
                    <button
                      onClick={() => handleDownload(groupName)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                    >
                      ⬇️ Download
                    </button>
                  </div>

                  {/* 可滚动的图片预览区域 */}
                  <div className="h-64 overflow-y-auto bg-slate-800/30 rounded-lg p-2 space-y-2">
                    {images.map((img, idx) => (
                      <img
                        key={idx}
                        src={`${API_BASE_URL}/api/projects/${id}/images/${groupName}/${img}?token=${localStorage.getItem('token')}`}
                        alt={img}
                        className="w-full rounded-lg object-cover hover:scale-105 transition-transform cursor-pointer"
                        loading="lazy"
                      />
                    ))}
                  </div>

                  <p className="text-slate-400 text-sm mt-3">
                    {images.length} images
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
