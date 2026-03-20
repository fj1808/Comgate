import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Slider } from '../components/ui/slider';
import { 
  Save, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Move, 
  Square, 
  Circle, 
  Type, 
  Gauge, 
  BarChart3, 
  Thermometer,
  ArrowUpDown,
  Settings,
  Layers,
  MousePointer,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Clipboard,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowRight,
  Droplet,
  Cog,
  Activity,
  CircleDot,
  Minus,
  TriangleIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Widget types available in the builder
const WIDGET_TYPES = [
  // Basic shapes
  { id: 'text', name: 'Text Label', icon: Type, category: 'basic' },
  { id: 'rectangle', name: 'Rectangle', icon: Square, category: 'shapes' },
  { id: 'circle', name: 'Circle', icon: Circle, category: 'shapes' },
  { id: 'line', name: 'Line', icon: Minus, category: 'shapes' },
  // Indicators
  { id: 'gauge', name: 'Gauge', icon: Gauge, category: 'indicators' },
  { id: 'bar', name: 'Bar Chart', icon: BarChart3, category: 'indicators' },
  { id: 'thermometer', name: 'Thermometer', icon: Thermometer, category: 'indicators' },
  { id: 'indicator', name: 'Status Light', icon: CircleDot, category: 'indicators' },
  // P&ID Equipment
  { id: 'valve', name: 'Valve', icon: ArrowUpDown, category: 'equipment' },
  { id: 'tank', name: 'Tank', icon: Square, category: 'equipment' },
  { id: 'pump', name: 'Pump', icon: Activity, category: 'equipment' },
  { id: 'motor', name: 'Motor', icon: Cog, category: 'equipment' },
  { id: 'pipe', name: 'Pipe', icon: ArrowRight, category: 'equipment' },
  { id: 'sensor', name: 'Sensor', icon: Droplet, category: 'equipment' },
];

// Default widget properties
const DEFAULT_WIDGET_PROPS = {
  text: { content: 'Label', fontSize: 14, color: '#ffffff', backgroundColor: 'transparent' },
  rectangle: { fill: '#374151', stroke: '#6b7280', strokeWidth: 2, borderRadius: 4 },
  circle: { fill: '#374151', stroke: '#6b7280', strokeWidth: 2 },
  line: { stroke: '#6b7280', strokeWidth: 3, orientation: 'horizontal' },
  gauge: { min: 0, max: 100, value: 50, color: '#3b82f6', tagId: null },
  bar: { min: 0, max: 100, value: 50, color: '#10b981', orientation: 'vertical', tagId: null },
  thermometer: { min: 0, max: 100, value: 50, unit: '°C', tagId: null },
  indicator: { isOn: true, colorOn: '#22c55e', colorOff: '#6b7280', tagId: null },
  valve: { isOpen: false, color: '#f59e0b', tagId: null },
  tank: { level: 50, maxLevel: 100, color: '#3b82f6', tagId: null },
  pump: { isRunning: false, color: '#10b981', tagId: null },
  motor: { isRunning: false, speed: 0, color: '#8b5cf6', tagId: null },
  pipe: { flow: true, color: '#3b82f6', orientation: 'horizontal' },
  sensor: { value: 0, unit: 'bar', color: '#ef4444', tagId: null },
};

// CSS for animations (injected into head)
const animationStyles = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes flow-h {
  from { transform: translateX(-50%); }
  to { transform: translateX(0); }
}
@keyframes flow-v {
  from { transform: translateY(-50%); }
  to { transform: translateY(0); }
}
`;

export const HistorianBuilderPage = () => {
  const { token, canConfigure } = useAuth();
  const { currentProject, tags } = useProject();
  
  // Inject animation styles
  React.useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = animationStyles;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);
  
  const canvasRef = useRef(null);
  const [widgets, setWidgets] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [tool, setTool] = useState('select'); // select, pan
  const [graphicName, setGraphicName] = useState('New Graphic');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [savedGraphics, setSavedGraphics] = useState([]);
  const [clipboard, setClipboard] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  // Snap to grid helper
  const snapToGrid = (value) => {
    if (!showGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  // Add a new widget
  const addWidget = (type) => {
    const widgetType = WIDGET_TYPES.find(w => w.id === type);
    if (!widgetType) return;

    const newWidget = {
      id: `widget_${Date.now()}`,
      type,
      x: snapToGrid(100 + widgets.length * 20),
      y: snapToGrid(100 + widgets.length * 20),
      width: type === 'text' ? 100 : 80,
      height: type === 'text' ? 30 : 80,
      rotation: 0,
      zIndex: widgets.length,
      locked: false,
      visible: true,
      props: { ...DEFAULT_WIDGET_PROPS[type] }
    };

    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget.id);
    toast.success(`Added ${widgetType.name}`);
  };

  // Update widget properties
  const updateWidget = useCallback((id, updates) => {
    setWidgets(prev => prev.map(w => 
      w.id === id ? { ...w, ...updates } : w
    ));
  }, []);

  // Update widget props
  const updateWidgetProps = useCallback((id, propUpdates) => {
    setWidgets(prev => prev.map(w => 
      w.id === id ? { ...w, props: { ...w.props, ...propUpdates } } : w
    ));
  }, []);

  // Delete widget
  const deleteWidget = (id) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    if (selectedWidget === id) setSelectedWidget(null);
    toast.success('Widget deleted');
  };

  // Copy widget
  const copyWidget = () => {
    if (!selectedWidget) return;
    const widget = widgets.find(w => w.id === selectedWidget);
    if (widget) {
      setClipboard({ ...widget });
      toast.success('Widget copied');
    }
  };

  // Paste widget
  const pasteWidget = () => {
    if (!clipboard) return;
    const newWidget = {
      ...clipboard,
      id: `widget_${Date.now()}`,
      x: clipboard.x + 20,
      y: clipboard.y + 20,
      zIndex: widgets.length
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget.id);
    toast.success('Widget pasted');
  };

  // Handle mouse down on widget
  const handleWidgetMouseDown = (e, widgetId) => {
    e.stopPropagation();
    const widget = widgets.find(w => w.id === widgetId);
    if (widget?.locked) return;
    
    setSelectedWidget(widgetId);
    setIsDragging(true);
    setDragStart({
      x: e.clientX - widget.x * (zoom / 100),
      y: e.clientY - widget.y * (zoom / 100)
    });
  };

  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !selectedWidget) return;
    
    const newX = snapToGrid((e.clientX - dragStart.x) / (zoom / 100));
    const newY = snapToGrid((e.clientY - dragStart.y) / (zoom / 100));
    
    updateWidget(selectedWidget, { x: Math.max(0, newX), y: Math.max(0, newY) });
  }, [isDragging, selectedWidget, dragStart, zoom, updateWidget, snapToGrid]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Save graphic
  const saveGraphic = () => {
    const graphic = {
      name: graphicName,
      canvasSize,
      widgets,
      savedAt: new Date().toISOString()
    };
    
    // Save to localStorage for now
    const graphics = JSON.parse(localStorage.getItem('comgate_graphics') || '[]');
    const existingIndex = graphics.findIndex(g => g.name === graphicName);
    if (existingIndex >= 0) {
      graphics[existingIndex] = graphic;
    } else {
      graphics.push(graphic);
    }
    localStorage.setItem('comgate_graphics', JSON.stringify(graphics));
    
    toast.success('Graphic saved');
    setShowSaveDialog(false);
  };

  // Load graphics list
  const loadGraphicsList = () => {
    const graphics = JSON.parse(localStorage.getItem('comgate_graphics') || '[]');
    setSavedGraphics(graphics);
    setShowLoadDialog(true);
  };

  // Load a graphic
  const loadGraphic = (graphic) => {
    setGraphicName(graphic.name);
    setCanvasSize(graphic.canvasSize);
    setWidgets(graphic.widgets);
    setSelectedWidget(null);
    setShowLoadDialog(false);
    toast.success(`Loaded "${graphic.name}"`);
  };

  // Render widget based on type
  const renderWidget = (widget) => {
    const isSelected = selectedWidget === widget.id;
    const scale = zoom / 100;
    
    const baseStyle = {
      position: 'absolute',
      left: widget.x * scale,
      top: widget.y * scale,
      width: widget.width * scale,
      height: widget.height * scale,
      transform: `rotate(${widget.rotation}deg)`,
      cursor: widget.locked ? 'not-allowed' : (isDragging && isSelected ? 'grabbing' : 'grab'),
      zIndex: widget.zIndex,
      opacity: widget.visible ? 1 : 0.3,
      outline: isSelected ? '2px solid #3b82f6' : 'none',
      outlineOffset: '2px'
    };

    switch (widget.type) {
      case 'text':
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: widget.props.fontSize * scale,
              color: widget.props.color,
              backgroundColor: widget.props.backgroundColor,
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            {widget.props.content}
          </div>
        );
        
      case 'rectangle':
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              backgroundColor: widget.props.fill,
              border: `${widget.props.strokeWidth}px solid ${widget.props.stroke}`,
              borderRadius: '4px'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          />
        );
        
      case 'circle':
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              backgroundColor: widget.props.fill,
              border: `${widget.props.strokeWidth}px solid ${widget.props.stroke}`,
              borderRadius: '50%'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          />
        );
        
      case 'gauge':
        const gaugePercent = ((widget.props.value - widget.props.min) / (widget.props.max - widget.props.min)) * 100;
        return (
          <div
            key={widget.id}
            style={{ ...baseStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            <div style={{
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              background: `conic-gradient(${widget.props.color} ${gaugePercent * 3.6}deg, #374151 0deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '60%',
                height: '60%',
                borderRadius: '50%',
                backgroundColor: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12 * scale,
                color: '#fff',
                fontWeight: 'bold'
              }}>
                {widget.props.value}
              </div>
            </div>
          </div>
        );
        
      case 'bar':
        const barPercent = ((widget.props.value - widget.props.min) / (widget.props.max - widget.props.min)) * 100;
        const isVertical = widget.props.orientation === 'vertical';
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              backgroundColor: '#374151',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: isVertical ? 'column-reverse' : 'row'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            <div style={{
              [isVertical ? 'height' : 'width']: `${barPercent}%`,
              [isVertical ? 'width' : 'height']: '100%',
              backgroundColor: widget.props.color,
              transition: 'all 0.3s ease'
            }} />
          </div>
        );
        
      case 'tank':
        const tankLevel = (widget.props.level / widget.props.maxLevel) * 100;
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              backgroundColor: '#1f2937',
              border: '3px solid #6b7280',
              borderRadius: '4px 4px 8px 8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column-reverse'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            <div style={{
              height: `${tankLevel}%`,
              width: '100%',
              backgroundColor: widget.props.color || '#3b82f6',
              transition: 'height 0.3s ease'
            }} />
          </div>
        );
      
      case 'line':
        const isHorizontalLine = widget.props.orientation === 'horizontal';
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            <div style={{
              width: isHorizontalLine ? '100%' : widget.props.strokeWidth,
              height: isHorizontalLine ? widget.props.strokeWidth : '100%',
              backgroundColor: widget.props.stroke
            }} />
          </div>
        );
      
      case 'indicator':
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            <div style={{
              width: '70%',
              height: '70%',
              borderRadius: '50%',
              backgroundColor: widget.props.isOn ? widget.props.colorOn : widget.props.colorOff,
              boxShadow: widget.props.isOn ? `0 0 10px ${widget.props.colorOn}` : 'none',
              border: '2px solid #374151'
            }} />
          </div>
        );
      
      case 'valve':
        return (
          <svg
            key={widget.id}
            style={baseStyle}
            viewBox="0 0 100 100"
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            {/* Valve body - two triangles forming butterfly shape */}
            <polygon 
              points="10,50 50,20 50,80" 
              fill={widget.props.isOpen ? widget.props.color : '#6b7280'}
              stroke="#374151"
              strokeWidth="2"
            />
            <polygon 
              points="90,50 50,20 50,80" 
              fill={widget.props.isOpen ? widget.props.color : '#6b7280'}
              stroke="#374151"
              strokeWidth="2"
            />
            {/* Valve stem */}
            <line x1="50" y1="50" x2="50" y2="5" stroke="#9ca3af" strokeWidth="4" />
            <circle cx="50" cy="5" r="5" fill="#9ca3af" />
            {/* Status indicator */}
            <text x="50" y="95" textAnchor="middle" fontSize="12" fill="#fff">
              {widget.props.isOpen ? 'OPEN' : 'CLOSED'}
            </text>
          </svg>
        );
      
      case 'pump':
        return (
          <svg
            key={widget.id}
            style={baseStyle}
            viewBox="0 0 100 100"
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            {/* Pump housing - circle */}
            <circle 
              cx="50" cy="50" r="35" 
              fill={widget.props.isRunning ? widget.props.color : '#374151'}
              stroke="#6b7280"
              strokeWidth="3"
            />
            {/* Impeller */}
            <g style={{ transformOrigin: '50px 50px', animation: widget.props.isRunning ? 'spin 1s linear infinite' : 'none' }}>
              <line x1="50" y1="20" x2="50" y2="80" stroke="#fff" strokeWidth="3" />
              <line x1="20" y1="50" x2="80" y2="50" stroke="#fff" strokeWidth="3" />
              <line x1="28" y1="28" x2="72" y2="72" stroke="#fff" strokeWidth="2" />
              <line x1="72" y1="28" x2="28" y2="72" stroke="#fff" strokeWidth="2" />
            </g>
            {/* Inlet/Outlet pipes */}
            <rect x="0" y="42" width="15" height="16" fill="#6b7280" />
            <rect x="85" y="42" width="15" height="16" fill="#6b7280" />
          </svg>
        );
      
      case 'motor':
        return (
          <svg
            key={widget.id}
            style={baseStyle}
            viewBox="0 0 100 80"
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            {/* Motor body - rectangle */}
            <rect 
              x="10" y="15" width="60" height="50" rx="4"
              fill={widget.props.isRunning ? widget.props.color : '#374151'}
              stroke="#6b7280"
              strokeWidth="2"
            />
            {/* Motor fins */}
            <line x1="15" y1="20" x2="15" y2="60" stroke="#4b5563" strokeWidth="2" />
            <line x1="25" y1="20" x2="25" y2="60" stroke="#4b5563" strokeWidth="2" />
            <line x1="35" y1="20" x2="35" y2="60" stroke="#4b5563" strokeWidth="2" />
            <line x1="45" y1="20" x2="45" y2="60" stroke="#4b5563" strokeWidth="2" />
            <line x1="55" y1="20" x2="55" y2="60" stroke="#4b5563" strokeWidth="2" />
            {/* Shaft */}
            <rect x="70" y="35" width="25" height="10" fill="#9ca3af" />
            {/* Base */}
            <rect x="5" y="65" width="70" height="10" fill="#4b5563" />
            {/* Label */}
            <text x="40" y="78" textAnchor="middle" fontSize="8" fill="#fff">
              {widget.props.isRunning ? 'RUN' : 'STOP'}
            </text>
          </svg>
        );
      
      case 'pipe':
        const isPipeHorizontal = widget.props.orientation === 'horizontal';
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            <div style={{
              width: isPipeHorizontal ? '100%' : '20px',
              height: isPipeHorizontal ? '20px' : '100%',
              backgroundColor: widget.props.color,
              border: '2px solid #374151',
              borderRadius: '2px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Flow animation */}
              {widget.props.flow && (
                <div style={{
                  position: 'absolute',
                  width: isPipeHorizontal ? '200%' : '100%',
                  height: isPipeHorizontal ? '100%' : '200%',
                  background: isPipeHorizontal 
                    ? 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)'
                    : 'repeating-linear-gradient(180deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)',
                  animation: `flow-${isPipeHorizontal ? 'h' : 'v'} 1s linear infinite`
                }} />
              )}
            </div>
          </div>
        );
      
      case 'sensor':
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1f2937',
              border: `2px solid ${widget.props.color}`,
              borderRadius: '8px',
              padding: '4px'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            <div style={{
              fontSize: Math.max(10, 14 * scale),
              fontWeight: 'bold',
              color: widget.props.color
            }}>
              {widget.props.value}
            </div>
            <div style={{
              fontSize: Math.max(8, 10 * scale),
              color: '#9ca3af'
            }}>
              {widget.props.unit}
            </div>
          </div>
        );
      
      case 'thermometer':
        const tempPercent = ((widget.props.value - widget.props.min) / (widget.props.max - widget.props.min)) * 100;
        return (
          <div
            key={widget.id}
            style={{
              ...baseStyle,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '4px'
            }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          >
            {/* Bulb at bottom */}
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              position: 'relative',
              zIndex: 2
            }} />
            {/* Tube */}
            <div style={{
              width: '12px',
              height: 'calc(100% - 35px)',
              backgroundColor: '#374151',
              borderRadius: '6px 6px 0 0',
              marginBottom: '-5px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: `${tempPercent}%`,
                backgroundColor: '#ef4444',
                transition: 'height 0.3s ease'
              }} />
            </div>
            {/* Value label */}
            <div style={{
              position: 'absolute',
              top: '4px',
              fontSize: 10 * scale,
              color: '#fff'
            }}>
              {widget.props.value}{widget.props.unit}
            </div>
          </div>
        );
        
      default:
        return (
          <div
            key={widget.id}
            style={{ ...baseStyle, backgroundColor: '#374151', borderRadius: '4px' }}
            onMouseDown={(e) => handleWidgetMouseDown(e, widget.id)}
          />
        );
    }
  };

  const selectedWidgetData = widgets.find(w => w.id === selectedWidget);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col" data-testid="historian-builder-page">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <Input
            value={graphicName}
            onChange={(e) => setGraphicName(e.target.value)}
            className="w-48 h-8"
            placeholder="Graphic Name"
          />
          <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
          <Button variant="outline" size="sm" onClick={loadGraphicsList}>
            <FolderOpen className="w-4 h-4 mr-1" /> Load
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant={tool === 'select' ? 'default' : 'outline'} size="sm" onClick={() => setTool('select')}>
            <MousePointer className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(25, zoom - 25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-12 text-center">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button variant={showGrid ? 'default' : 'outline'} size="sm" onClick={() => setShowGrid(!showGrid)}>
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setWidgets([]); setSelectedWidget(null); }}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyWidget} disabled={!selectedWidget}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={pasteWidget} disabled={!clipboard}>
            <Clipboard className="w-4 h-4" />
          </Button>
          {selectedWidget && (
            <Button variant="destructive" size="sm" onClick={() => deleteWidget(selectedWidget)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Widget Palette */}
        <div className="w-48 border-r bg-card p-2 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Widgets</p>
          <div className="space-y-1">
            {['basic', 'shapes', 'indicators', 'equipment'].map(category => (
              <div key={category} className="mb-3">
                <p className="text-xs text-muted-foreground capitalize mb-1">{category}</p>
                <div className="grid grid-cols-2 gap-1">
                  {WIDGET_TYPES.filter(w => w.category === category).map(widget => (
                    <Button
                      key={widget.id}
                      variant="outline"
                      size="sm"
                      className="h-12 flex flex-col items-center justify-center text-xs"
                      onClick={() => addWidget(widget.id)}
                      disabled={!canConfigure()}
                    >
                      <widget.icon className="w-4 h-4 mb-1" />
                      {widget.name.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div 
          className="flex-1 overflow-auto bg-zinc-900 p-4"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            ref={canvasRef}
            className="relative bg-zinc-800 rounded-lg"
            style={{
              width: canvasSize.width * (zoom / 100),
              height: canvasSize.height * (zoom / 100),
              backgroundImage: showGrid 
                ? `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                   linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`
                : 'none',
              backgroundSize: `${gridSize * (zoom / 100)}px ${gridSize * (zoom / 100)}px`
            }}
            onClick={() => setSelectedWidget(null)}
          >
            {widgets.map(renderWidget)}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-64 border-l bg-card p-3 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Properties</p>
          
          {selectedWidgetData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">X</span>
                    <Input
                      type="number"
                      value={selectedWidgetData.x}
                      onChange={(e) => updateWidget(selectedWidget, { x: parseInt(e.target.value) || 0 })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Y</span>
                    <Input
                      type="number"
                      value={selectedWidgetData.y}
                      onChange={(e) => updateWidget(selectedWidget, { y: parseInt(e.target.value) || 0 })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Width</span>
                    <Input
                      type="number"
                      value={selectedWidgetData.width}
                      onChange={(e) => updateWidget(selectedWidget, { width: parseInt(e.target.value) || 50 })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Height</span>
                    <Input
                      type="number"
                      value={selectedWidgetData.height}
                      onChange={(e) => updateWidget(selectedWidget, { height: parseInt(e.target.value) || 50 })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Locked</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateWidget(selectedWidget, { locked: !selectedWidgetData.locked })}
                >
                  {selectedWidgetData.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Visible</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateWidget(selectedWidget, { visible: !selectedWidgetData.visible })}
                >
                  {selectedWidgetData.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </Button>
              </div>

              {/* Type-specific properties */}
              {selectedWidgetData.type === 'text' && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs">Text Content</Label>
                  <Input
                    value={selectedWidgetData.props.content}
                    onChange={(e) => updateWidgetProps(selectedWidget, { content: e.target.value })}
                    className="h-7 text-xs"
                  />
                  <Label className="text-xs">Font Size</Label>
                  <Input
                    type="number"
                    value={selectedWidgetData.props.fontSize}
                    onChange={(e) => updateWidgetProps(selectedWidget, { fontSize: parseInt(e.target.value) || 14 })}
                    className="h-7 text-xs"
                  />
                </div>
              )}

              {(selectedWidgetData.type === 'gauge' || selectedWidgetData.type === 'bar' || selectedWidgetData.type === 'tank') && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs">Value</Label>
                  <Slider
                    value={[selectedWidgetData.props.value || selectedWidgetData.props.level || 50]}
                    onValueChange={([val]) => updateWidgetProps(selectedWidget, selectedWidgetData.type === 'tank' ? { level: val } : { value: val })}
                    max={selectedWidgetData.props.max || selectedWidgetData.props.maxLevel || 100}
                    min={selectedWidgetData.props.min || 0}
                    step={1}
                  />
                  <Label className="text-xs">Tag Binding</Label>
                  <Select
                    value={selectedWidgetData.props.tagId || 'none'}
                    onValueChange={(v) => updateWidgetProps(selectedWidget, { tagId: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select tag" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No binding</SelectItem>
                      {tags.slice(0, 50).map(tag => (
                        <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Select a widget to edit properties</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Graphic</DialogTitle>
            <DialogDescription className="sr-only">Enter a name to save this graphic</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Graphic Name</Label>
              <Input value={graphicName} onChange={(e) => setGraphicName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={saveGraphic}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Graphic</DialogTitle>
            <DialogDescription className="sr-only">Select a saved graphic to load</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {savedGraphics.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No saved graphics</p>
            ) : (
              <div className="space-y-2">
                {savedGraphics.map((graphic, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => loadGraphic(graphic)}
                  >
                    <span>{graphic.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(graphic.savedAt).toLocaleDateString()}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
