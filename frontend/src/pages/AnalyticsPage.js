import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  BarChart3, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  TrendingDown,
  Zap,
  Server,
  Tags,
  RefreshCw,
  Download,
  PieChart,
  LineChart as LineChartIcon,
  Gauge,
  Shield,
  Wifi
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Color palette for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const QUALITY_COLORS = { good: '#10b981', bad: '#ef4444', uncertain: '#f59e0b' };

export const AnalyticsPage = () => {
  const { token } = useAuth();
  const { currentProject } = useProject();
  
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Analytics data
  const [commStats, setCommStats] = useState(null);
  const [tagHealth, setTagHealth] = useState(null);
  const [protocolComparison, setProtocolComparison] = useState(null);
  const [timeSeriesTraffic, setTimeSeriesTraffic] = useState([]);
  const [timeSeriesLatency, setTimeSeriesLatency] = useState([]);
  
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAnalytics = async () => {
    setRefreshing(true);
    try {
      const [commRes, healthRes, protocolRes, trafficRes, latencyRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/communication-stats?time_range=${timeRange}`, { headers }),
        axios.get(`${API_URL}/api/analytics/tag-health${currentProject ? `?project_id=${currentProject.id}` : ''}`, { headers }),
        axios.get(`${API_URL}/api/analytics/protocol-comparison`, { headers }),
        axios.get(`${API_URL}/api/analytics/time-series?metric=traffic&time_range=${timeRange}&interval=${timeRange === '1h' ? '5m' : timeRange === '24h' ? '1h' : '6h'}`, { headers }),
        axios.get(`${API_URL}/api/analytics/time-series?metric=latency&time_range=${timeRange}&interval=${timeRange === '1h' ? '5m' : timeRange === '24h' ? '1h' : '6h'}`, { headers })
      ]);
      
      setCommStats(commRes.data);
      setTagHealth(healthRes.data);
      setProtocolComparison(protocolRes.data);
      setTimeSeriesTraffic(trafficRes.data.data.map(d => ({
        ...d,
        time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })));
      setTimeSeriesLatency(latencyRes.data.data.map(d => ({
        ...d,
        time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })));
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, currentProject]);

  // Prepare chart data
  const qualityPieData = tagHealth ? [
    { name: 'Good', value: tagHealth.quality.good, color: QUALITY_COLORS.good },
    { name: 'Bad', value: tagHealth.quality.bad, color: QUALITY_COLORS.bad },
    { name: 'Uncertain', value: tagHealth.quality.uncertain, color: QUALITY_COLORS.uncertain }
  ].filter(d => d.value > 0) : [];

  const objectTypePieData = tagHealth ? Object.entries(tagHealth.by_object_type).map(([key, value], idx) => ({
    name: key.replace('_', ' '),
    value,
    color: COLORS[idx % COLORS.length]
  })) : [];

  const protocolBarData = protocolComparison ? [
    { name: 'Modbus TCP', requests: protocolComparison.modbus_tcp?.total_requests || 0, success: protocolComparison.modbus_tcp?.success_rate || 0 },
    { name: 'Modbus UDP', requests: protocolComparison.modbus_udp?.total_requests || 0, success: protocolComparison.modbus_udp?.success_rate || 0 },
    { name: 'OPC UA', requests: protocolComparison.opcua?.total_requests || 0, success: protocolComparison.opcua?.success_rate || 0 },
    { name: 'OPC DA', requests: protocolComparison.opcda?.total_requests || 0, success: protocolComparison.opcda?.success_rate || 0 }
  ] : [];

  const handleExportPDF = async () => {
    if (!currentProject) {
      toast.error('Select a project to export report');
      return;
    }
    try {
      const response = await axios.get(
        `${API_URL}/api/projects/${currentProject.id}/reports/export-pdf`,
        { headers, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics & Reporting</h1>
          <p className="text-muted-foreground">Comprehensive communication and tag analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1 Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={refreshing}>
            <RefreshCw className={cn("w-4 h-4 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</p>
                <p className="text-2xl font-bold text-blue-500 mt-1">{commStats?.success_rate || 100}%</p>
                <p className="text-xs text-muted-foreground mt-1">{commStats?.total_requests || 0} requests</p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                (commStats?.success_rate || 100) >= 95 ? "bg-green-500/20" : "bg-amber-500/20"
              )}>
                {(commStats?.success_rate || 100) >= 95 ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Latency</p>
                <p className="text-2xl font-bold text-green-500 mt-1">{commStats?.latency?.avg_ms || 0} ms</p>
                <p className="text-xs text-muted-foreground mt-1">Max: {commStats?.latency?.max_ms || 0} ms</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <Zap className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tag Health</p>
                <p className="text-2xl font-bold text-purple-500 mt-1">{tagHealth?.health_score || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{tagHealth?.total_tags || 0} tags</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <Tags className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <Progress value={tagHealth?.health_score || 0} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Throughput</p>
                <p className="text-2xl font-bold text-orange-500 mt-1">{commStats?.throughput_per_minute || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">req/min</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/20">
                <Activity className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="traffic" className="flex items-center gap-2">
            <LineChartIcon className="w-4 h-4" />
            Traffic Trends
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Tag Analysis
          </TabsTrigger>
          <TabsTrigger value="protocols" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Protocol Comparison
          </TabsTrigger>
        </TabsList>

        {/* Traffic Trends Tab */}
        <TabsContent value="traffic" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request Volume</CardTitle>
                <CardDescription>Traffic over time ({timeRange})</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={timeSeriesTraffic}>
                    <defs>
                      <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#6b7280" fontSize={10} />
                    <YAxis stroke="#6b7280" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorTraffic)" 
                      name="Requests"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latency Trend</CardTitle>
                <CardDescription>Average response time ({timeRange})</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={timeSeriesLatency}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#6b7280" fontSize={10} />
                    <YAxis stroke="#6b7280" fontSize={10} unit=" ms" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value) => [`${value} ms`, 'Latency']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                      name="Latency"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Traffic by Protocol */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Traffic by Protocol</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(commStats?.traffic_by_protocol || {}).map(([protocol, count]) => (
                  <div key={protocol} className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase">{protocol}</p>
                    <p className="text-xl font-bold mt-1">{count}</p>
                  </div>
                ))}
                {Object.keys(commStats?.traffic_by_protocol || {}).length === 0 && (
                  <p className="col-span-4 text-center text-muted-foreground py-4">No traffic data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tag Analysis Tab */}
        <TabsContent value="tags" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quality Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {qualityPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPie>
                      <Pie
                        data={qualityPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {qualityPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No quality data
                  </div>
                )}
                <div className="flex justify-center gap-4 mt-2">
                  {qualityPieData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                      {item.name}: {item.value}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Object Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Object Types</CardTitle>
              </CardHeader>
              <CardContent>
                {objectTypePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPie>
                      <Pie
                        data={objectTypePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {objectTypePieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No data
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {objectTypePieData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                      <span className="capitalize truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tag Health Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tag Health Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tags with Values</span>
                    <span className="font-medium">{tagHealth?.values?.with_value || 0}</span>
                  </div>
                  <Progress 
                    value={tagHealth?.total_tags > 0 ? (tagHealth.values.with_value / tagHealth.total_tags * 100) : 0} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stale Tags</span>
                    <span className="font-medium text-amber-500">{tagHealth?.values?.stale || 0}</span>
                  </div>
                  <Progress 
                    value={tagHealth?.total_tags > 0 ? (tagHealth.values.stale / tagHealth.total_tags * 100) : 0} 
                    className="h-2 bg-amber-500/20"
                  />
                </div>
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Read Only</span>
                    <span>{tagHealth?.permissions?.read_only || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Write Only</span>
                    <span>{tagHealth?.permissions?.write_only || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Read/Write</span>
                    <span>{tagHealth?.permissions?.read_write || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(tagHealth?.by_data_type || {}).map(([dtype, count]) => (
                  <div key={dtype} className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground uppercase">{dtype}</p>
                    <p className="text-lg font-bold mt-1">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocol Comparison Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Protocol Performance</CardTitle>
                <CardDescription>Request count and success rate by protocol</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={protocolBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                    <YAxis stroke="#6b7280" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="requests" name="Requests" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Connections</CardTitle>
                <CardDescription>Currently active protocol connections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Modbus</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Servers</span>
                        <Badge variant="outline">{protocolComparison?.active_connections?.modbus_servers || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clients</span>
                        <Badge variant="outline">{protocolComparison?.active_connections?.modbus_clients || 0}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">OPC UA</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Servers</span>
                        <Badge variant="outline">{protocolComparison?.active_connections?.opcua_servers || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clients</span>
                        <Badge variant="outline">{protocolComparison?.active_connections?.opcua_clients || 0}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Wifi className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">OPC DA</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">LEGACY</Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Servers</span>
                        <Badge variant="outline">{protocolComparison?.active_connections?.opcda_servers || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clients</span>
                        <Badge variant="outline">{protocolComparison?.active_connections?.opcda_clients || 0}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Summary</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Active</span>
                        <Badge className="bg-purple-500/20 text-purple-500">
                          {(protocolComparison?.active_connections?.modbus_servers || 0) +
                           (protocolComparison?.active_connections?.modbus_clients || 0) +
                           (protocolComparison?.active_connections?.opcua_servers || 0) +
                           (protocolComparison?.active_connections?.opcua_clients || 0) +
                           (protocolComparison?.active_connections?.opcda_servers || 0) +
                           (protocolComparison?.active_connections?.opcda_clients || 0)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Protocol Stats Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Protocol Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Protocol</th>
                      <th className="text-right py-2 px-3 font-medium">Requests</th>
                      <th className="text-right py-2 px-3 font-medium">Success</th>
                      <th className="text-right py-2 px-3 font-medium">Success Rate</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['modbus_tcp', 'modbus_udp', 'opcua', 'opcda'].map(protocol => {
                      const stats = protocolComparison?.[protocol] || {};
                      return (
                        <tr key={protocol} className="border-b border-border/50">
                          <td className="py-2 px-3 capitalize">{protocol.replace('_', ' ')}</td>
                          <td className="text-right py-2 px-3">{stats.total_requests || 0}</td>
                          <td className="text-right py-2 px-3">{stats.success_count || 0}</td>
                          <td className="text-right py-2 px-3">
                            <Badge variant={stats.success_rate >= 95 ? 'default' : 'destructive'} className="text-xs">
                              {stats.success_rate || 0}%
                            </Badge>
                          </td>
                          <td className="text-right py-2 px-3">{stats.avg_latency_ms || 0} ms</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
