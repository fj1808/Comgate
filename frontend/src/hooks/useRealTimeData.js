import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Custom hook for real-time data updates
 * Tries WebSocket first, automatically falls back to HTTP polling if WebSocket fails
 * 
 * @param {string} endpoint - The API endpoint to poll (e.g., '/api/dashboard/stats')
 * @param {string} token - Authorization token
 * @param {number} pollInterval - Polling interval in ms (default: 5000)
 * @param {boolean} enabled - Whether updates are enabled (default: true)
 */
export const useRealTimeData = (endpoint, token, pollInterval = 5000, enabled = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionType, setConnectionType] = useState('initializing'); // 'websocket', 'polling', 'error'
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch data via HTTP
  const fetchData = useCallback(async () => {
    if (!token || !enabled) return;
    
    try {
      const response = await axios.get(`${API_URL}${endpoint}`, { headers });
      setData(response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [endpoint, token, enabled]);

  // Start HTTP polling
  const startPolling = useCallback(() => {
    // Initial fetch
    fetchData();
    
    // Set up interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(fetchData, pollInterval);
    setConnectionType('polling');
  }, [fetchData, pollInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Try WebSocket connection (for internal use)
  const tryWebSocket = useCallback(() => {
    // Convert HTTP URL to WebSocket URL
    const wsUrl = API_URL
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
    
    const ws = new WebSocket(`${wsUrl}/ws/system`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionType('websocket');
      stopPolling();
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'status' || message.data) {
          setData(message.data || message);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        // Ignore non-JSON messages like 'pong'
      }
    };
    
    ws.onerror = () => {
      console.log('WebSocket failed, falling back to HTTP polling');
      startPolling();
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed');
      // Only restart polling if we were using websocket
      if (connectionType === 'websocket') {
        startPolling();
      }
    };
    
    wsRef.current = ws;
    
    // Set timeout to fall back to polling if WebSocket doesn't connect
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket connection timeout, using HTTP polling');
        ws.close();
        startPolling();
      }
    }, 3000);
  }, [connectionType, startPolling, stopPolling]);

  // Initialize connection
  useEffect(() => {
    if (!token || !enabled) {
      setLoading(false);
      return;
    }

    // Start with HTTP polling immediately (most reliable)
    startPolling();
    
    // Optionally try WebSocket in background (commented out as external WebSocket doesn't work through ingress)
    // tryWebSocket();

    return () => {
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, enabled, startPolling, stopPolling]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    connectionType,
    refresh,
    isConnected: connectionType === 'websocket' || connectionType === 'polling'
  };
};

/**
 * Hook for real-time tag updates for a specific project
 */
export const useTagUpdates = (projectId, token, pollInterval = 3000, enabled = true) => {
  return useRealTimeData(
    projectId ? `/api/projects/${projectId}/tags?page=1&page_size=100` : null,
    token,
    pollInterval,
    enabled && !!projectId
  );
};

/**
 * Hook for dashboard stats with real-time updates
 */
export const useDashboardStats = (token, pollInterval = 5000, enabled = true, projectId = null) => {
  const endpoint = projectId 
    ? `/api/dashboard/stats?project_id=${projectId}` 
    : '/api/dashboard/stats';
  return useRealTimeData(endpoint, token, pollInterval, enabled);
};

/**
 * Hook for protocol status updates (Modbus, OPC)
 */
export const useProtocolStatus = (token, pollInterval = 2000, enabled = true) => {
  return useRealTimeData('/api/dashboard/stats', token, pollInterval, enabled);
};
