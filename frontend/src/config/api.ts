// API 配置
// 使用相对路径，通过 Vite proxy 转发到后端
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_ENDPOINTS = {
  auth: {
    register: `${API_BASE_URL}/api/auth/register`,
    login: `${API_BASE_URL}/api/auth/login`,
  },
  projects: {
    list: `${API_BASE_URL}/api/projects`,
    detail: (id: number) => `${API_BASE_URL}/api/projects/${id}`,
    upload: (id: number) => `${API_BASE_URL}/api/projects/${id}/upload`,
    classify: (id: number) => `${API_BASE_URL}/api/projects/${id}/classify`,
    groups: (id: number) => `${API_BASE_URL}/api/projects/${id}/groups`,
    image: (id: number, group: string, filename: string, token: string) =>
      `${API_BASE_URL}/api/projects/${id}/images/${group}/${filename}?token=${token}`,
    download: (id: number, group: string) => `${API_BASE_URL}/api/projects/${id}/download/${group}`,
  },
};
