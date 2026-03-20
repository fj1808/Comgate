import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format, subHours, addMinutes, subMinutes } from 'date-fns';
import { 
  LineChart, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Clock,
  ZoomIn,
  ZoomOut,
  Download,
  Settings,
  Plus,
  X,
  Star,
  StarOff,
  Maximize2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Calendar as CalendarIcon,
  Rewind,
  FastForward
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, getQualityColor } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Color palette for trend lines
const TREND_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

// Line styles
const LINE_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

// Time ranges
const TIME_RANGES = [
  { value: '1m', label: '1 Minute', ms: 60000 },
  { value: '5m', label: '5 Minutes', ms: 300000 },
  { value: '15m', label: '15 Minutes', ms: 900000 },
  { value: '30m', label: '30 Minutes', ms: 1800000 },
  { value: '1h', label: '1 Hour', ms: 3600000 },
  { value: '4h', label: '4 Hours', ms: 14400000 },
  { value: '8h', label: '8 Hours', ms: 28800000 },
  { value: '24h', label: '24 Hours', ms: 86400000 },
];

// Default graphic config
const createDefaultGraphic = () => ({
  id: Date.now().toString(),
  name: 'New Trend',
  tags: [],
  timeRange: '5m',
  refreshRate: 1000,
  isRealTime: true,
  isFavorite: false,
  createdAt: new Date().toISOString()
});

// Default tag config
const createTagConfig = (tag, index) => ({
  tagId: tag.id,
  tagName: tag.name,
  color: TREND_COLORS[index % TREND_COLORS.length],
  lineStyle: 'solid',
  lineWidth: 2,
  showPoints: false,
  showPrediction: false,
  visible: true,
  yAxisMin: null,
  yAxisMax: null
});

export const HistorianPage = () => {
  const { token, canConfigure } = useAuth();
  const { currentProject, tags, devices } = useProject();
  const canvasRef = useRef(null);
  
  // Graphics state
  const [graphics, setGraphics] = useState(() => {
    const saved = localStorage.getItem('comgate_historian_graphics');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedGraphic, setSelectedGraphic] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [historicalTime, setHistoricalTime] = useState(null);
  
  // Historical date range state
  const [historicalStartDate, setHistoricalStartDate] = useState(() => subHours(new Date(), 1));
  const [historicalEndDate, setHistoricalEndDate] = useState(() => new Date());
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(null);
  const [stepSize, setStepSize] = useState(60000); // 1 minute in ms
  
  // Data state
  const [trendData, setTrendData] = useState({});
  const [predictionData, setPredictionData] = useState({});
  const [alarmStates, setAlarmStates] = useState({}); // Track alarm state per tag
  
  // View state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Tag search
  const [tagSearch, setTagSearch] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Check alarm states for tags
  useEffect(() => {
    if (!selectedGraphic || selectedGraphic.tags.length === 0) return;
    
    const checkAlarms = () => {
      const newAlarmStates = {};
      selectedGraphic.tags.forEach(tagConfig => {
        const tagData = tags.find(t => t.id === tagConfig.tagId);
        if (tagData) {
          const value = tagData.current_value;
          const minVal = tagData.min_value;
          const maxVal = tagData.max_value;
          
          // Determine alarm state
          let alarmState = 'normal';
          if (tagData.quality === 'bad') {
            alarmState = 'bad_quality';
          } else if (minVal !== null && value < minVal) {
            alarmState = 'low_alarm';
          } else if (maxVal !== null && value > maxVal) {
            alarmState = 'high_alarm';
          } else if (tagData.alarm_enable && (
            (minVal !== null && value < minVal * 1.1) ||
            (maxVal !== null && value > maxVal * 0.9)
          )) {
            alarmState = 'warning';
          }
          
          newAlarmStates[tagConfig.tagId] = {
            state: alarmState,
            value: value,
            quality: tagData.quality
          };
        }
      });
      setAlarmStates(newAlarmStates);
    };
    
    checkAlarms();
    const interval = setInterval(checkAlarms, 2000);
    return () => clearInterval(interval);
  }, [selectedGraphic, tags]);

  // Save graphics to localStorage
  useEffect(() => {
    localStorage.setItem('comgate_historian_graphics', JSON.stringify(graphics));
  }, [graphics]);

  // Handle tag passed from TagBrowserPage
  useEffect(() => {
    const tagData = sessionStorage.getItem('historian_add_tag');
    if (!tagData || tags.length === 0) return;
    
    // Remove immediately to prevent re-processing
    sessionStorage.removeItem('historian_add_tag');
    
    try {
      const passedTag = JSON.parse(tagData);
      
      // Find the full tag data
      const fullTag = tags.find(t => t.id === passedTag.id);
      if (!fullTag) return;
      
      // Use functional updates to avoid reading stale state
      setGraphics(prevGraphics => {
        if (prevGraphics.length === 0) {
          // Create a new graphic with this tag
          const newGraphic = createDefaultGraphic();
          newGraphic.name = `Trend - ${fullTag.name}`;
          const tagConfig = createTagConfig(fullTag, 0);
          newGraphic.tags = [tagConfig];
          
          // Set selected graphic in a separate timeout to avoid state conflicts
          setTimeout(() => {
            setSelectedGraphic(newGraphic);
            toast.success(`Created new trend with ${fullTag.name}`);
          }, 0);
          
          return [newGraphic];
        } else {
          // Find target graphic (first one if no selection)
          const targetGraphic = prevGraphics[0];
          
          // Check if tag already exists
          if (targetGraphic.tags.some(t => t.tagId === fullTag.id)) {
            setTimeout(() => {
              setSelectedGraphic(targetGraphic);
              toast.info(`${fullTag.name} is already in this trend`);
            }, 0);
            return prevGraphics;
          }
          
          // Check max tags
          if (targetGraphic.tags.length >= 10) {
            setTimeout(() => {
              toast.error('Trend already has maximum 10 tags');
            }, 0);
            return prevGraphics;
          }
          
          // Add tag to graphic
          const tagConfig = createTagConfig(fullTag, targetGraphic.tags.length);
          const updatedGraphic = {
            ...targetGraphic,
            tags: [...targetGraphic.tags, tagConfig]
          };
          
          setTimeout(() => {
            setSelectedGraphic(updatedGraphic);
            toast.success(`Added ${fullTag.name} to ${targetGraphic.name}`);
          }, 0);
          
          return prevGraphics.map(g => g.id === updatedGraphic.id ? updatedGraphic : g);
        }
      });
    } catch (e) {
      console.error('Failed to parse tag data:', e);
    }
  }, [tags]); // Only depend on tags loading

  // Device map for display
  const deviceMap = useMemo(() => {
    const map = {};
    devices.forEach(d => { map[d.id] = d.name; });
    return map;
  }, [devices]);

  // Filtered tags for selector
  const filteredTags = useMemo(() => {
    if (!tagSearch) return tags;
    return tags.filter(t => 
      t.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
      t.description?.toLowerCase().includes(tagSearch.toLowerCase())
    );
  }, [tags, tagSearch]);

  // Generate simulated trend data
  const generateTrendData = useCallback((tagConfig, timeRangeMs) => {
    const now = Date.now();
    const startTime = now - timeRangeMs;
    const points = Math.min(200, Math.floor(timeRangeMs / 1000));
    const interval = timeRangeMs / points;
    
    const data = [];
    let value = Math.random() * 100;
    
    for (let i = 0; i < points; i++) {
      const time = startTime + (i * interval);
      // Random walk with some periodicity
      value += (Math.random() - 0.5) * 5 + Math.sin(i / 10) * 2;
      value = Math.max(0, Math.min(100, value));
      
      data.push({
        time,
        value: parseFloat(value.toFixed(2)),
        quality: Math.random() > 0.98 ? 'bad' : 'good'
      });
    }
    
    return data;
  }, []);

  // Fetch ARIMA prediction from backend
  const fetchARIMAPrediction = useCallback(async (tagId, historicalData, points = 20) => {
    if (!historicalData || historicalData.length < 10) return [];
    
    try {
      const values = historicalData.slice(-50).map(p => p.value);
      const response = await axios.post(`${API_URL}/api/historian/predict`, {
        tag_id: tagId,
        historical_values: values,
        steps: points
      }, { headers });
      
      const lastTime = historicalData[historicalData.length - 1].time;
      const interval = (historicalData[1]?.time - historicalData[0]?.time) || 1000;
      
      return response.data.predictions.map((pred, i) => ({
        time: lastTime + ((i + 1) * interval),
        value: pred.value,
        lowerBound: pred.lower_bound,
        upperBound: pred.upper_bound,
        isPrediction: true
      }));
    } catch (error) {
      console.error('ARIMA prediction failed:', error);
      // Fallback to simple prediction
      return generateLocalPrediction(historicalData, points);
    }
  }, [headers]);

  // Local fallback prediction (simple moving average + trend)
  const generateLocalPrediction = useCallback((historicalData, points = 20) => {
    if (!historicalData || historicalData.length < 10) return [];
    
    const recent = historicalData.slice(-20);
    const trend = (recent[recent.length - 1].value - recent[0].value) / recent.length;
    
    const lastTime = historicalData[historicalData.length - 1].time;
    const interval = (historicalData[1]?.time - historicalData[0]?.time) || 1000;
    
    const predictions = [];
    let value = recent[recent.length - 1].value;
    
    for (let i = 1; i <= points; i++) {
      value += trend + (Math.random() - 0.5) * 2;
      predictions.push({
        time: lastTime + (i * interval),
        value: parseFloat(value.toFixed(2)),
        isPrediction: true
      });
    }
    
    return predictions;
  }, []);

  // Fetch/generate trend data
  useEffect(() => {
    if (!selectedGraphic || !isPlaying) return;
    
    const timeRange = TIME_RANGES.find(t => t.value === selectedGraphic.timeRange);
    const timeRangeMs = timeRange?.ms || 300000;
    
    const fetchData = async () => {
      const newTrendData = {};
      const newPredictions = {};
      
      for (const tagConfig of selectedGraphic.tags) {
        const data = generateTrendData(tagConfig, timeRangeMs);
        newTrendData[tagConfig.tagId] = data;
        
        if (tagConfig.showPrediction) {
          // Use ARIMA API for predictions
          newPredictions[tagConfig.tagId] = await fetchARIMAPrediction(tagConfig.tagId, data);
        }
      }
      
      setTrendData(newTrendData);
      setPredictionData(newPredictions);
    };
    
    fetchData();
    const interval = setInterval(fetchData, selectedGraphic.refreshRate * playbackSpeed);
    
    return () => clearInterval(interval);
  }, [selectedGraphic, isPlaying, playbackSpeed, generateTrendData, fetchARIMAPrediction]);

  // Draw trend chart
  useEffect(() => {
    if (!canvasRef.current || !selectedGraphic) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 60, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background') || '#0a0a0f';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (chartWidth * i / 10);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight * i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Find global time and value ranges
    let minTime = Infinity, maxTime = -Infinity;
    let minValue = 0, maxValue = 100;
    
    selectedGraphic.tags.forEach(tagConfig => {
      const data = trendData[tagConfig.tagId] || [];
      const predictions = predictionData[tagConfig.tagId] || [];
      const allData = [...data, ...predictions];
      
      allData.forEach(point => {
        if (point.time < minTime) minTime = point.time;
        if (point.time > maxTime) maxTime = point.time;
        if (point.value < minValue) minValue = point.value;
        if (point.value > maxValue) maxValue = point.value;
      });
    });
    
    // Add padding to value range
    const valueRange = maxValue - minValue;
    minValue -= valueRange * 0.1;
    maxValue += valueRange * 0.1;
    
    // Draw each tag's trend line
    selectedGraphic.tags.forEach((tagConfig, tagIndex) => {
      if (!tagConfig.visible) return;
      
      const data = trendData[tagConfig.tagId] || [];
      const predictions = predictionData[tagConfig.tagId] || [];
      
      if (data.length < 2) return;
      
      // Draw historical data
      ctx.strokeStyle = tagConfig.color;
      ctx.lineWidth = tagConfig.lineWidth;
      ctx.setLineDash(tagConfig.lineStyle === 'dashed' ? [5, 5] : tagConfig.lineStyle === 'dotted' ? [2, 2] : []);
      ctx.beginPath();
      
      data.forEach((point, i) => {
        const x = padding.left + ((point.time - minTime) / (maxTime - minTime)) * chartWidth;
        const y = padding.top + ((maxValue - point.value) / (maxValue - minValue)) * chartHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw points if enabled
        if (tagConfig.showPoints) {
          ctx.fillStyle = point.quality === 'bad' ? '#ef4444' : tagConfig.color;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      ctx.stroke();
      
      // Draw predictions (dotted line)
      if (predictions.length > 0 && tagConfig.showPrediction) {
        ctx.setLineDash([4, 4]);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        
        const lastPoint = data[data.length - 1];
        const lastX = padding.left + ((lastPoint.time - minTime) / (maxTime - minTime)) * chartWidth;
        const lastY = padding.top + ((maxValue - lastPoint.value) / (maxValue - minValue)) * chartHeight;
        ctx.moveTo(lastX, lastY);
        
        predictions.forEach((point) => {
          const x = padding.left + ((point.time - minTime) / (maxTime - minTime)) * chartWidth;
          const y = padding.top + ((maxValue - point.value) / (maxValue - minValue)) * chartHeight;
          ctx.lineTo(x, y);
        });
        
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      
      ctx.setLineDash([]);
      
      // Draw alarm indicators on bad quality points
      data.forEach((point) => {
        if (point.quality === 'bad') {
          const x = padding.left + ((point.time - minTime) / (maxTime - minTime)) * chartWidth;
          const y = padding.top + ((maxValue - point.value) / (maxValue - minValue)) * chartHeight;
          
          // Draw red X for bad quality
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 5, y - 5);
          ctx.lineTo(x + 5, y + 5);
          ctx.moveTo(x + 5, y - 5);
          ctx.lineTo(x - 5, y + 5);
          ctx.stroke();
        }
      });
      
      // Draw current alarm state indicator at the end of the line
      const alarmInfo = alarmStates[tagConfig.tagId];
      if (alarmInfo && data.length > 0 && alarmInfo.state !== 'normal') {
        const lastPoint = data[data.length - 1];
        const x = padding.left + ((lastPoint.time - minTime) / (maxTime - minTime)) * chartWidth;
        const y = padding.top + ((maxValue - lastPoint.value) / (maxValue - minValue)) * chartHeight;
        
        // Draw alarm indicator circle
        const alarmColor = alarmInfo.state.includes('alarm') ? '#ef4444' : 
                          alarmInfo.state === 'warning' ? '#f59e0b' : '#6b7280';
        
        ctx.fillStyle = alarmColor;
        ctx.beginPath();
        ctx.arc(x + 15, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing effect for active alarms
        if (alarmInfo.state.includes('alarm')) {
          ctx.strokeStyle = alarmColor;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(x + 15, y, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    });
    
    // Draw axes labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    // Time labels (only if we have valid time range)
    if (minTime !== Infinity && maxTime !== -Infinity && minTime < maxTime) {
      const timeLabels = 5;
      for (let i = 0; i <= timeLabels; i++) {
        const time = minTime + ((maxTime - minTime) * i / timeLabels);
        const x = padding.left + (chartWidth * i / timeLabels);
        const label = new Date(time).toLocaleTimeString();
        ctx.fillText(label, x, height - padding.bottom + 20);
      }
    } else {
      // Show placeholder when no data
      ctx.fillText('No data', width / 2, height - padding.bottom + 20);
    }
    
    // Value labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = maxValue - ((maxValue - minValue) * i / 5);
      const y = padding.top + (chartHeight * i / 5);
      ctx.fillText(value.toFixed(1), padding.left - 10, y + 4);
    }
    
  }, [selectedGraphic, trendData, predictionData, alarmStates]);

  // Create new graphic
  const handleCreateGraphic = () => {
    const newGraphic = createDefaultGraphic();
    setGraphics([...graphics, newGraphic]);
    setSelectedGraphic(newGraphic);
    setShowConfig(true);
  };

  // Add tag to graphic
  const handleAddTag = (tag) => {
    if (!selectedGraphic) return;
    
    if (selectedGraphic.tags.length >= 10) {
      toast.error('Maximum 10 tags per graphic');
      return;
    }
    
    if (selectedGraphic.tags.some(t => t.tagId === tag.id)) {
      toast.error('Tag already added');
      return;
    }
    
    const tagConfig = createTagConfig(tag, selectedGraphic.tags.length);
    const updatedGraphic = {
      ...selectedGraphic,
      tags: [...selectedGraphic.tags, tagConfig]
    };
    
    setSelectedGraphic(updatedGraphic);
    setGraphics(graphics.map(g => g.id === updatedGraphic.id ? updatedGraphic : g));
    setShowTagSelector(false);
    toast.success(`Added ${tag.name} to trend`);
  };

  // Remove tag from graphic
  const handleRemoveTag = (tagId) => {
    if (!selectedGraphic) return;
    
    const updatedGraphic = {
      ...selectedGraphic,
      tags: selectedGraphic.tags.filter(t => t.tagId !== tagId)
    };
    
    setSelectedGraphic(updatedGraphic);
    setGraphics(graphics.map(g => g.id === updatedGraphic.id ? updatedGraphic : g));
  };

  // Update tag config
  const handleUpdateTagConfig = (tagId, updates) => {
    if (!selectedGraphic) return;
    
    const updatedGraphic = {
      ...selectedGraphic,
      tags: selectedGraphic.tags.map(t => 
        t.tagId === tagId ? { ...t, ...updates } : t
      )
    };
    
    setSelectedGraphic(updatedGraphic);
    setGraphics(graphics.map(g => g.id === updatedGraphic.id ? updatedGraphic : g));
  };

  // Update graphic settings
  const handleUpdateGraphic = (updates) => {
    if (!selectedGraphic) return;
    
    const updatedGraphic = { ...selectedGraphic, ...updates };
    setSelectedGraphic(updatedGraphic);
    setGraphics(graphics.map(g => g.id === updatedGraphic.id ? updatedGraphic : g));
  };

  // Delete graphic
  const handleDeleteGraphic = (graphicId) => {
    setGraphics(graphics.filter(g => g.id !== graphicId));
    if (selectedGraphic?.id === graphicId) {
      setSelectedGraphic(null);
    }
    toast.success('Graphic deleted');
  };

  // Toggle favorite
  const handleToggleFavorite = (graphicId) => {
    setGraphics(graphics.map(g => 
      g.id === graphicId ? { ...g, isFavorite: !g.isFavorite } : g
    ));
  };

  // Export data to CSV
  const handleExportCSV = () => {
    if (!selectedGraphic) return;
    
    let csv = 'Timestamp';
    selectedGraphic.tags.forEach(t => {
      csv += `,${t.tagName}`;
    });
    csv += '\n';
    
    // Get all timestamps
    const allTimestamps = new Set();
    selectedGraphic.tags.forEach(t => {
      (trendData[t.tagId] || []).forEach(p => allTimestamps.add(p.time));
    });
    
    Array.from(allTimestamps).sort().forEach(time => {
      csv += new Date(time).toISOString();
      selectedGraphic.tags.forEach(t => {
        const point = (trendData[t.tagId] || []).find(p => p.time === time);
        csv += `,${point?.value ?? ''}`;
      });
      csv += '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedGraphic.name}_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Data exported to CSV');
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="historian-page-no-project">
        <LineChart className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
        <p className="text-muted-foreground">Select a project from the sidebar to view historian</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", isFullscreen && "fixed inset-0 z-50 bg-background p-4")} data-testid="historian-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vision-H Historian</h1>
          <p className="text-muted-foreground">Real-time and historical trend visualization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateGraphic} data-testid="create-graphic-btn">
            <Plus className="w-4 h-4 mr-1" />
            New Trend
          </Button>
          {isFullscreen && (
            <Button variant="outline" size="sm" onClick={() => setIsFullscreen(false)}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Navigation Pane */}
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Displays</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {/* Favorites */}
              {graphics.some(g => g.isFavorite) && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground px-2 mb-1">Favorites</p>
                  {graphics.filter(g => g.isFavorite).map(graphic => (
                    <button
                      key={graphic.id}
                      onClick={() => setSelectedGraphic(graphic)}
                      className={cn(
                        "w-full p-2 text-left rounded-lg transition-colors flex items-center justify-between",
                        selectedGraphic?.id === graphic.id 
                          ? "bg-primary/20 text-primary" 
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="text-sm truncate">{graphic.name}</span>
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    </button>
                  ))}
                </div>
              )}
              
              {/* All Graphics */}
              <div>
                <p className="text-xs text-muted-foreground px-2 mb-1">All Trends</p>
                {graphics.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No trends created yet
                  </p>
                ) : (
                  graphics.map(graphic => (
                    <button
                      key={graphic.id}
                      onClick={() => setSelectedGraphic(graphic)}
                      className={cn(
                        "w-full p-2 text-left rounded-lg transition-colors flex items-center justify-between group",
                        selectedGraphic?.id === graphic.id 
                          ? "bg-primary/20 text-primary" 
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="text-sm truncate">{graphic.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {graphic.tags.length} tags
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Canvas Area */}
        <div className="col-span-9 space-y-4">
          {selectedGraphic ? (
            <>
              {/* Toolbar */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Playback controls */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (!selectedGraphic.isRealTime && currentPlaybackTime) {
                              setCurrentPlaybackTime(subMinutes(currentPlaybackTime, stepSize / 60000));
                            }
                          }}
                          disabled={selectedGraphic.isRealTime}
                          title="Step backward"
                          data-testid="step-back-btn"
                        >
                          <Rewind className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsPlaying(!isPlaying)}
                          data-testid="play-pause-btn"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (!selectedGraphic.isRealTime && currentPlaybackTime) {
                              setCurrentPlaybackTime(addMinutes(currentPlaybackTime, stepSize / 60000));
                            }
                          }}
                          disabled={selectedGraphic.isRealTime}
                          title="Step forward"
                          data-testid="step-forward-btn"
                        >
                          <FastForward className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Time range for real-time mode */}
                      {selectedGraphic.isRealTime ? (
                        <Select 
                          value={selectedGraphic.timeRange} 
                          onValueChange={(v) => handleUpdateGraphic({ timeRange: v })}
                        >
                          <SelectTrigger className="w-[120px]" data-testid="time-range-select">
                            <Clock className="w-3 h-3 mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_RANGES.map(range => (
                              <SelectItem key={range.value} value={range.value}>
                                {range.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        /* Historical date range pickers */
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-[140px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(historicalStartDate, 'MM/dd HH:mm')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={historicalStartDate}
                                onSelect={(date) => date && setHistoricalStartDate(date)}
                                initialFocus
                              />
                              <div className="p-3 border-t">
                                <Label className="text-xs">Time</Label>
                                <Input
                                  type="time"
                                  value={format(historicalStartDate, 'HH:mm')}
                                  onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':');
                                    const newDate = new Date(historicalStartDate);
                                    newDate.setHours(parseInt(hours), parseInt(minutes));
                                    setHistoricalStartDate(newDate);
                                  }}
                                  className="mt-1"
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground">to</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-[140px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(historicalEndDate, 'MM/dd HH:mm')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={historicalEndDate}
                                onSelect={(date) => date && setHistoricalEndDate(date)}
                                initialFocus
                              />
                              <div className="p-3 border-t">
                                <Label className="text-xs">Time</Label>
                                <Input
                                  type="time"
                                  value={format(historicalEndDate, 'HH:mm')}
                                  onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':');
                                    const newDate = new Date(historicalEndDate);
                                    newDate.setHours(parseInt(hours), parseInt(minutes));
                                    setHistoricalEndDate(newDate);
                                  }}
                                  className="mt-1"
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Select value={String(stepSize)} onValueChange={(v) => setStepSize(Number(v))}>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Step" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10000">10 sec</SelectItem>
                              <SelectItem value="30000">30 sec</SelectItem>
                              <SelectItem value="60000">1 min</SelectItem>
                              <SelectItem value="300000">5 min</SelectItem>
                              <SelectItem value="600000">10 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="h-6 w-px bg-border mx-2" />

                      {/* Mode toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Real-Time</span>
                        <Switch
                          checked={selectedGraphic.isRealTime}
                          onCheckedChange={(v) => {
                            handleUpdateGraphic({ isRealTime: v });
                            if (!v) {
                              // Switching to historical mode - set playback time to start
                              setCurrentPlaybackTime(historicalStartDate);
                            }
                          }}
                          data-testid="realtime-toggle"
                        />
                      </div>

                      <div className="h-6 w-px bg-border mx-2" />

                      {/* Speed control */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Speed</span>
                        <Select value={String(playbackSpeed)} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
                          <SelectTrigger className="w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.5">0.5x</SelectItem>
                            <SelectItem value="1">1x</SelectItem>
                            <SelectItem value="2">2x</SelectItem>
                            <SelectItem value="5">5x</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFavorite(selectedGraphic.id)}
                        title={selectedGraphic.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        {selectedGraphic.isFavorite ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleExportCSV} title="Export to CSV">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setShowConfig(true)} title="Settings">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} title="Fullscreen">
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Historical playback indicator */}
                  {!selectedGraphic.isRealTime && currentPlaybackTime && (
                    <div className="mt-2 pt-2 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Historical Mode</Badge>
                        <span className="text-sm font-mono">{format(currentPlaybackTime, 'yyyy-MM-dd HH:mm:ss')}</span>
                      </div>
                      <div className="flex-1 mx-4">
                        <Slider
                          value={[currentPlaybackTime.getTime()]}
                          min={historicalStartDate.getTime()}
                          max={historicalEndDate.getTime()}
                          step={stepSize}
                          onValueChange={([val]) => setCurrentPlaybackTime(new Date(val))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chart */}
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{selectedGraphic.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative" style={{ height: isFullscreen ? 'calc(100vh - 280px)' : '400px' }}>
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full"
                      style={{ display: 'block' }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Legend with Alarm Indicators */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex flex-wrap items-center gap-4">
                    {selectedGraphic.tags.map((tagConfig) => {
                      const alarmInfo = alarmStates[tagConfig.tagId];
                      const getAlarmIndicator = () => {
                        if (!alarmInfo) return null;
                        switch (alarmInfo.state) {
                          case 'high_alarm':
                          case 'low_alarm':
                            return <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />;
                          case 'warning':
                            return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
                          case 'bad_quality':
                            return <X className="w-3 h-3 text-red-500" />;
                          default:
                            return null;
                        }
                      };
                      
                      return (
                        <div 
                          key={tagConfig.tagId}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all",
                            !tagConfig.visible && "opacity-40",
                            alarmInfo?.state === 'high_alarm' && "bg-red-500/20 border border-red-500/50",
                            alarmInfo?.state === 'low_alarm' && "bg-red-500/20 border border-red-500/50",
                            alarmInfo?.state === 'warning' && "bg-yellow-500/10 border border-yellow-500/30",
                            alarmInfo?.state === 'bad_quality' && "bg-gray-500/20"
                          )}
                          onClick={() => handleUpdateTagConfig(tagConfig.tagId, { visible: !tagConfig.visible })}
                          title={alarmInfo?.state !== 'normal' ? `Alarm: ${alarmInfo?.state}` : undefined}
                        >
                          <div 
                            className="w-4 h-1 rounded"
                            style={{ 
                              backgroundColor: tagConfig.color,
                              borderStyle: tagConfig.lineStyle === 'dashed' ? 'dashed' : tagConfig.lineStyle === 'dotted' ? 'dotted' : 'solid'
                            }}
                          />
                          <span className="text-xs">{tagConfig.tagName}</span>
                          {getAlarmIndicator()}
                          {tagConfig.showPrediction && (
                            <TrendingUp className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                    {selectedGraphic.tags.length < 10 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowTagSelector(true)}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Tag
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <LineChart className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select or Create a Trend</h3>
                <p className="text-muted-foreground mb-4">
                  Choose a trend from the left panel or create a new one
                </p>
                <Button onClick={handleCreateGraphic}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Trend
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Tag Selector Dialog */}
      <Dialog open={showTagSelector} onOpenChange={setShowTagSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Tag to Trend</DialogTitle>
            <DialogDescription className="sr-only">Search and select a tag to add to the trend view</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search tags..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
            />
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {filteredTags.slice(0, 100).map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag)}
                    className="w-full p-2 text-left rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
                    disabled={selectedGraphic?.tags.some(t => t.tagId === tag.id)}
                  >
                    <div>
                      <p className="font-mono text-sm">{tag.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {deviceMap[tag.device_id]} • {tag.data_type}
                      </p>
                    </div>
                    <Badge variant="outline">{tag.permission}</Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trend Configuration</DialogTitle>
            <DialogDescription className="sr-only">Configure trend display settings</DialogDescription>
          </DialogHeader>
          {selectedGraphic && (
            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="tags">Tags ({selectedGraphic.tags.length}/10)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4">
                <div className="space-y-2">
                  <Label>Trend Name</Label>
                  <Input
                    value={selectedGraphic.name}
                    onChange={(e) => handleUpdateGraphic({ name: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Time Range</Label>
                    <Select 
                      value={selectedGraphic.timeRange} 
                      onValueChange={(v) => handleUpdateGraphic({ timeRange: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_RANGES.map(range => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Refresh Rate (ms)</Label>
                    <Select 
                      value={String(selectedGraphic.refreshRate)} 
                      onValueChange={(v) => handleUpdateGraphic({ refreshRate: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="500">500ms</SelectItem>
                        <SelectItem value="1000">1 second</SelectItem>
                        <SelectItem value="2000">2 seconds</SelectItem>
                        <SelectItem value="5000">5 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      handleDeleteGraphic(selectedGraphic.id);
                      setShowConfig(false);
                    }}
                  >
                    Delete Trend
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="tags" className="space-y-4">
                {selectedGraphic.tags.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tags configured</p>
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => {
                        setShowConfig(false);
                        setShowTagSelector(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tag
                    </Button>
                  </div>
                ) : (
                  selectedGraphic.tags.map((tagConfig, index) => (
                    <Card key={tagConfig.tagId}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: tagConfig.color }}
                            />
                            <span className="font-mono text-sm">{tagConfig.tagName}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTag(tagConfig.tagId)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Color</Label>
                            <div className="flex gap-1 flex-wrap">
                              {TREND_COLORS.map(color => (
                                <button
                                  key={color}
                                  className={cn(
                                    "w-6 h-6 rounded border-2",
                                    tagConfig.color === color ? "border-white" : "border-transparent"
                                  )}
                                  style={{ backgroundColor: color }}
                                  onClick={() => handleUpdateTagConfig(tagConfig.tagId, { color })}
                                />
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs">Line Style</Label>
                            <Select 
                              value={tagConfig.lineStyle}
                              onValueChange={(v) => handleUpdateTagConfig(tagConfig.tagId, { lineStyle: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_STYLES.map(style => (
                                  <SelectItem key={style.value} value={style.value}>
                                    {style.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs">Line Width</Label>
                            <Slider
                              value={[tagConfig.lineWidth]}
                              onValueChange={(v) => handleUpdateTagConfig(tagConfig.tagId, { lineWidth: v[0] })}
                              min={1}
                              max={5}
                              step={1}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={tagConfig.showPoints}
                              onCheckedChange={(v) => handleUpdateTagConfig(tagConfig.tagId, { showPoints: v })}
                            />
                            <Label className="text-xs">Show Points</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={tagConfig.showPrediction}
                              onCheckedChange={(v) => handleUpdateTagConfig(tagConfig.tagId, { showPrediction: v })}
                            />
                            <Label className="text-xs">Show Prediction (ARIMA)</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={tagConfig.visible}
                              onCheckedChange={(v) => handleUpdateTagConfig(tagConfig.tagId, { visible: v })}
                            />
                            <Label className="text-xs">Visible</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                
                {selectedGraphic.tags.length < 10 && selectedGraphic.tags.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setShowConfig(false);
                      setShowTagSelector(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Tag ({10 - selectedGraphic.tags.length} remaining)
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
