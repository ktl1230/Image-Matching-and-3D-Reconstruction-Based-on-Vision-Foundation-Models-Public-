import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

interface AIConfig {
  provider: string;
  model: string;
  api_key: string;
  base_url?: string;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AIConfig>({
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    api_key: '',
    base_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-config`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConfig({
          provider: data.provider,
          model: data.model,
          api_key: data.api_key,
          base_url: data.base_url || ''
        });
      }
    } catch (error) {
      console.log('No existing config found');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setMessage('✅ Configuration saved successfully!');
      } else {
        setMessage('❌ Failed to save configuration');
      }
    } catch (error) {
      setMessage('❌ Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-white">AI Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">AI Model Configuration</h2>

          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Provider
            </label>
            <select
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="anthropic">Anthropic Claude</option>
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Model
            </label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder={
                config.provider === 'anthropic'
                  ? 'claude-sonnet-4-5'
                  : config.provider === 'gemini'
                  ? 'gemini-2.5-flash'
                  : 'gpt-4o 或 gemini-2.5-flash'
              }
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-sm text-slate-400 mt-2">
              {config.provider === 'anthropic'
                ? '推荐: claude-sonnet-4-5, claude-opus-4-6, claude-3-5-sonnet-20241022'
                : config.provider === 'gemini'
                ? '推荐: gemini-2.5-flash, gemini-3.0-flash-preview'
                : '推荐: gpt-4o, gpt-4o-mini, 或中转站支持的任何模型（如 gemini-2.5-flash）'}
            </p>
          </div>

          {/* API Key Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder={
                config.provider === 'anthropic'
                  ? 'Enter your Anthropic API key'
                  : config.provider === 'gemini'
                  ? 'Enter your Gemini API key'
                  : 'Enter your OpenAI API key'
              }
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-sm text-slate-400 mt-2">
              {config.provider === 'anthropic'
                ? 'Get your API key from: https://console.anthropic.com/settings/keys'
                : config.provider === 'gemini'
                ? 'Get your API key from: https://aistudio.google.com/app/apikey'
                : 'Get your API key from: https://platform.openai.com/api-keys'}
            </p>
          </div>

          {/* Base URL Input (Optional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Base URL (可选 - 用于中转站)
            </label>
            <input
              type="text"
              value={config.base_url || ''}
              onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
              placeholder="留空使用官方地址，或填入中转站地址如: https://code.aipor.cc"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-sm text-slate-400 mt-2">
              如果使用中转站服务，请填入完整的 base URL（不包含 /v1/messages 等路径）
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading || !config.api_key}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>

          {/* Message */}
          {message && (
            <div className={`mt-4 p-4 rounded-lg ${
              message.includes('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {message}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-400 mb-2">ℹ️ How it works</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• The AI model will identify specific landmarks in your photos</li>
              <li>• Claude Sonnet 4.5 is recommended for fast and accurate results</li>
              <li>• Your API key is stored securely and only used for classification</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
