import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ProjectContext = createContext(null);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [devices, setDevices] = useState([]);
  const [tags, setTags] = useState([]);
  const [pollingStatus, setPollingStatus] = useState(false);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Load saved project from localStorage
  useEffect(() => {
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId && token && projects.length > 0) {
      const projectExists = projects.find(p => p.id === savedProjectId);
      if (projectExists && !currentProject) {
        selectProject(savedProjectId);
      }
    }
  }, [token, projects]);

  const fetchProjects = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/api/projects`, { headers });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const selectProject = async (projectId) => {
    if (!projectId) {
      setCurrentProject(null);
      localStorage.removeItem('currentProjectId');
      setDevices([]);
      setTags([]);
      return;
    }
    
    setLoading(true);
    try {
      const [projectRes, devicesRes, tagsRes, pollingRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects/${projectId}`, { headers }),
        axios.get(`${API_URL}/api/projects/${projectId}/devices`, { headers }),
        axios.get(`${API_URL}/api/projects/${projectId}/tags?limit=5000`, { headers }),
        axios.get(`${API_URL}/api/projects/${projectId}/polling/status`, { headers })
      ]);
      
      setCurrentProject(projectRes.data);
      setDevices(devicesRes.data);
      // Handle paginated response: backend returns {items: [], total, page, ...}
      const tagsData = tagsRes.data;
      setTags(Array.isArray(tagsData) ? tagsData : (tagsData.items || []));
      setPollingStatus(pollingRes.data.is_running);
      localStorage.setItem('currentProjectId', projectId);
    } catch (error) {
      console.error('Failed to select project:', error);
    }
    setLoading(false);
  };

  const createProject = async (data) => {
    const response = await axios.post(`${API_URL}/api/projects`, data, { headers });
    await fetchProjects();
    return response.data;
  };

  const updateProject = async (projectId, data) => {
    const response = await axios.put(`${API_URL}/api/projects/${projectId}`, data, { headers });
    await fetchProjects();
    if (currentProject?.id === projectId) {
      setCurrentProject(response.data);
    }
    return response.data;
  };

  const deleteProject = async (projectId) => {
    await axios.delete(`${API_URL}/api/projects/${projectId}`, { headers });
    await fetchProjects();
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
      setDevices([]);
      setTags([]);
    }
  };

  const refreshDevices = async () => {
    if (!currentProject) return;
    const response = await axios.get(`${API_URL}/api/projects/${currentProject.id}/devices`, { headers });
    setDevices(response.data);
  };

  const refreshTags = async () => {
    if (!currentProject) return;
    const response = await axios.get(`${API_URL}/api/projects/${currentProject.id}/tags?limit=5000`, { headers });
    // Handle paginated response: backend returns {items: [], total, page, ...}
    const tagsData = response.data;
    setTags(Array.isArray(tagsData) ? tagsData : (tagsData.items || []));
  };

  const startPolling = async () => {
    if (!currentProject) return;
    await axios.post(`${API_URL}/api/projects/${currentProject.id}/polling/start`, {}, { headers });
    setPollingStatus(true);
  };

  const stopPolling = async () => {
    if (!currentProject) return;
    await axios.post(`${API_URL}/api/projects/${currentProject.id}/polling/stop`, {}, { headers });
    setPollingStatus(false);
  };

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  const value = {
    projects,
    currentProject,
    devices,
    tags,
    pollingStatus,
    loading,
    fetchProjects,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    refreshDevices,
    refreshTags,
    startPolling,
    stopPolling,
    setTags
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
