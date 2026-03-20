import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Play, Square, RefreshCw, Link2, Unlink, Activity, Server, Globe, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const OPCPage = () => {
  const { token, canConfigure } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  // OPC UA Server State
  const [opcuaServers, setOpcuaServers] = useState([]);
  const [selectedOpcuaServer, setSelectedOpcuaServer] = useState(null);
  const [opcuaServerData, setOpcuaServerData] = useState(null);
  const [opcuaServerLoading, setOpcuaServerLoading] = useState(false);
  const [opcuaServerConfig, setOpcuaServerConfig] = useState({
    endpoint_url: 'opc.tcp://0.0.0.0:4840/comgate/server/',
    server_name: 'ComGate OPC UA Server',
    namespace: 'http://comgate.industrial/opcua',
    security_mode: 'none',
    num_variables: 100
  });

  // OPC UA Client State
  const [opcuaClients, setOpcuaClients] = useState([]);
  const [selectedOpcuaClient, setSelectedOpcuaClient] = useState(null);
  const [opcuaClientData, setOpcuaClientData] = useState(null);
  const [opcuaClientLoading, setOpcuaClientLoading] = useState(false);
  const [opcuaClientConfig, setOpcuaClientConfig] = useState({
    endpoint_url: '',
    security_mode: 'none',
    poll_interval_ms: 1000
  });

  // OPC DA Server State
  const [opcdaServers, setOpcdaServers] = useState([]);
  const [selectedOpcdaServer, setSelectedOpcdaServer] = useState(null);
  const [opcdaServerData, setOpcdaServerData] = useState(null);
  const [opcdaServerLoading, setOpcdaServerLoading] = useState(false);
  const [opcdaServerConfig, setOpcdaServerConfig] = useState({
    server_name: 'ComGate.OPC.DA.Server',
    prog_id: 'ComGate.OPC.Simulation',
    num_tags: 100
  });

  // OPC DA Client State
  const [opcdaClients, setOpcdaClients] = useState([]);
  const [selectedOpcdaClient, setSelectedOpcdaClient] = useState(null);
  const [opcdaClientData, setOpcdaClientData] = useState(null);
  const [opcdaClientLoading, setOpcdaClientLoading] = useState(false);
  const [opcdaClientConfig, setOpcdaClientConfig] = useState({
    server_prog_id: 'Matrikon.OPC.Simulation',
    host: 'localhost',
    poll_interval_ms: 1000
  });

  // Simulation config
  const [simConfig, setSimConfig] = useState({
    enabled: true,
    interval_ms: 1000,
    pattern: 'sine'
  });

  // Fetch functions
  const fetchOpcuaServers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/opcua-server/list`, { headers });
      setOpcuaServers(response.data);
    } catch (error) {
      console.error('Failed to fetch OPC UA servers:', error);
    }
  };

  const fetchOpcuaServerData = async (serverId) => {
    try {
      const response = await axios.get(`${API_URL}/api/opcua-server/${serverId}/data`, { headers });
      setOpcuaServerData(response.data);
    } catch (error) {
      console.error('Failed to fetch OPC UA server data:', error);
    }
  };

  const fetchOpcuaClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/opcua-client/list`, { headers });
      setOpcuaClients(response.data);
    } catch (error) {
      console.error('Failed to fetch OPC UA clients:', error);
    }
  };

  const fetchOpcuaClientData = async (clientId) => {
    try {
      const response = await axios.get(`${API_URL}/api/opcua-client/${clientId}/data`, { headers });
      setOpcuaClientData(response.data);
    } catch (error) {
      console.error('Failed to fetch OPC UA client data:', error);
    }
  };

  const fetchOpcdaServers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/opcda-server/list`, { headers });
      setOpcdaServers(response.data);
    } catch (error) {
      console.error('Failed to fetch OPC DA servers:', error);
    }
  };

  const fetchOpcdaServerData = async (serverId) => {
    try {
      const response = await axios.get(`${API_URL}/api/opcda-server/${serverId}/data`, { headers });
      setOpcdaServerData(response.data);
    } catch (error) {
      console.error('Failed to fetch OPC DA server data:', error);
    }
  };

  const fetchOpcdaClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/opcda-client/list`, { headers });
      setOpcdaClients(response.data);
    } catch (error) {
      console.error('Failed to fetch OPC DA clients:', error);
    }
  };

  const fetchOpcdaClientData = async (clientId) => {
    try {
      const response = await axios.get(`${API_URL}/api/opcda-client/${clientId}/data`, { headers });
      setOpcdaClientData(response.data);
    } catch (error) {
      console.error('Failed to fetch OPC DA client data:', error);
    }
  };

  // Effects
  useEffect(() => {
    fetchOpcuaServers();
    fetchOpcuaClients();
    fetchOpcdaServers();
    fetchOpcdaClients();
  }, []);

  useEffect(() => {
    if (selectedOpcuaServer) {
      fetchOpcuaServerData(selectedOpcuaServer);
      const interval = setInterval(() => fetchOpcuaServerData(selectedOpcuaServer), 1000);
      return () => clearInterval(interval);
    }
  }, [selectedOpcuaServer]);

  useEffect(() => {
    if (selectedOpcuaClient) {
      fetchOpcuaClientData(selectedOpcuaClient);
      const interval = setInterval(() => fetchOpcuaClientData(selectedOpcuaClient), 1000);
      return () => clearInterval(interval);
    }
  }, [selectedOpcuaClient]);

  useEffect(() => {
    if (selectedOpcdaServer) {
      fetchOpcdaServerData(selectedOpcdaServer);
      const interval = setInterval(() => fetchOpcdaServerData(selectedOpcdaServer), 1000);
      return () => clearInterval(interval);
    }
  }, [selectedOpcdaServer]);

  useEffect(() => {
    if (selectedOpcdaClient) {
      fetchOpcdaClientData(selectedOpcdaClient);
      const interval = setInterval(() => fetchOpcdaClientData(selectedOpcdaClient), 1000);
      return () => clearInterval(interval);
    }
  }, [selectedOpcdaClient]);

  // OPC UA Server Handlers
  const handleStartOpcuaServer = async () => {
    setOpcuaServerLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/opcua-server/start`, opcuaServerConfig, { headers });
      toast.success('OPC UA Server started');
      fetchOpcuaServers();
      setSelectedOpcuaServer(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start OPC UA server');
    }
    setOpcuaServerLoading(false);
  };

  const handleStopOpcuaServer = async (serverId) => {
    try {
      await axios.post(`${API_URL}/api/opcua-server/${serverId}/stop`, {}, { headers });
      toast.success('OPC UA Server stopped');
      if (selectedOpcuaServer === serverId) {
        setSelectedOpcuaServer(null);
        setOpcuaServerData(null);
      }
      fetchOpcuaServers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to stop server');
    }
  };

  const handleStartOpcuaSimulation = async (serverId) => {
    try {
      await axios.post(`${API_URL}/api/opcua-server/${serverId}/simulation/start`, simConfig, { headers });
      toast.success('Simulation started');
      fetchOpcuaServers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start simulation');
    }
  };

  const handleStopOpcuaSimulation = async (serverId) => {
    try {
      await axios.post(`${API_URL}/api/opcua-server/${serverId}/simulation/stop`, {}, { headers });
      toast.success('Simulation stopped');
      fetchOpcuaServers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to stop simulation');
    }
  };

  // OPC UA Client Handlers
  const handleConnectOpcuaClient = async () => {
    if (!opcuaClientConfig.endpoint_url) {
      toast.error('Please enter the OPC UA server endpoint URL');
      return;
    }
    setOpcuaClientLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/opcua-client/connect`, opcuaClientConfig, { headers });
      toast.success('Connected to OPC UA server');
      fetchOpcuaClients();
      setSelectedOpcuaClient(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect');
    }
    setOpcuaClientLoading(false);
  };

  const handleDisconnectOpcuaClient = async (clientId) => {
    try {
      await axios.post(`${API_URL}/api/opcua-client/${clientId}/disconnect`, {}, { headers });
      toast.success('Disconnected');
      if (selectedOpcuaClient === clientId) {
        setSelectedOpcuaClient(null);
        setOpcuaClientData(null);
      }
      fetchOpcuaClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to disconnect');
    }
  };

  // OPC DA Server Handlers
  const handleStartOpcdaServer = async () => {
    setOpcdaServerLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/opcda-server/start`, opcdaServerConfig, { headers });
      toast.success('OPC DA Server started (simulation mode)');
      fetchOpcdaServers();
      setSelectedOpcdaServer(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start server');
    }
    setOpcdaServerLoading(false);
  };

  const handleStopOpcdaServer = async (serverId) => {
    try {
      await axios.post(`${API_URL}/api/opcda-server/${serverId}/stop`, {}, { headers });
      toast.success('OPC DA Server stopped');
      if (selectedOpcdaServer === serverId) {
        setSelectedOpcdaServer(null);
        setOpcdaServerData(null);
      }
      fetchOpcdaServers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to stop server');
    }
  };

  const handleStartOpcdaSimulation = async (serverId) => {
    try {
      await axios.post(`${API_URL}/api/opcda-server/${serverId}/simulation/start`, simConfig, { headers });
      toast.success('Simulation started');
      fetchOpcdaServers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start simulation');
    }
  };

  const handleStopOpcdaSimulation = async (serverId) => {
    try {
      await axios.post(`${API_URL}/api/opcda-server/${serverId}/simulation/stop`, {}, { headers });
      toast.success('Simulation stopped');
      fetchOpcdaServers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to stop simulation');
    }
  };

  // OPC DA Client Handlers
  const handleConnectOpcdaClient = async () => {
    setOpcdaClientLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/opcda-client/connect`, opcdaClientConfig, { headers });
      toast.success('Connected to OPC DA server (simulation)');
      fetchOpcdaClients();
      setSelectedOpcdaClient(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect');
    }
    setOpcdaClientLoading(false);
  };

  const handleDisconnectOpcdaClient = async (clientId) => {
    try {
      await axios.post(`${API_URL}/api/opcda-client/${clientId}/disconnect`, {}, { headers });
      toast.success('Disconnected');
      if (selectedOpcdaClient === clientId) {
        setSelectedOpcdaClient(null);
        setOpcdaClientData(null);
      }
      fetchOpcdaClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to disconnect');
    }
  };

  const SecurityIcon = ({ mode }) => {
    switch (mode) {
      case 'sign_encrypt': return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'sign': return <Shield className="w-4 h-4 text-yellow-500" />;
      default: return <ShieldAlert className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-6" data-testid="opc-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OPC Communication Hub</h1>
          <p className="text-muted-foreground">Industrial OPC protocol support - OPC UA recommended for new projects</p>
        </div>
      </div>

      <Tabs defaultValue="opcua">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="opcua" className="flex items-center gap-2" data-testid="opcua-tab">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            OPC UA
            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4 bg-green-500/10 text-green-500 border-green-500/30">RECOMMENDED</Badge>
          </TabsTrigger>
          <TabsTrigger value="opcda" className="flex items-center gap-2" data-testid="opcda-tab">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            OPC DA
            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4 bg-amber-500/10 text-amber-500 border-amber-500/30">LEGACY</Badge>
          </TabsTrigger>
        </TabsList>

        {/* OPC UA Tab */}
        <TabsContent value="opcua" className="mt-6">
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-500">OPC UA (Unified Architecture) - Recommended</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Modern, cross-platform protocol with built-in security. Works on Windows, Linux, and cloud environments.
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="ua-server">
            <TabsList>
              <TabsTrigger value="ua-server">Server Mode</TabsTrigger>
              <TabsTrigger value="ua-client">Client Mode</TabsTrigger>
            </TabsList>

            {/* OPC UA Server */}
            <TabsContent value="ua-server" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Server Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Endpoint URL</Label>
                      <Input
                        value={opcuaServerConfig.endpoint_url}
                        onChange={(e) => setOpcuaServerConfig({ ...opcuaServerConfig, endpoint_url: e.target.value })}
                        placeholder="opc.tcp://0.0.0.0:4840/server/"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Server Name</Label>
                      <Input
                        value={opcuaServerConfig.server_name}
                        onChange={(e) => setOpcuaServerConfig({ ...opcuaServerConfig, server_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Security Mode</Label>
                      <Select value={opcuaServerConfig.security_mode} onValueChange={(v) => setOpcuaServerConfig({ ...opcuaServerConfig, security_mode: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (No Security)</SelectItem>
                          <SelectItem value="sign">Sign</SelectItem>
                          <SelectItem value="sign_encrypt">Sign & Encrypt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Variables</Label>
                      <Input
                        type="number"
                        value={opcuaServerConfig.num_variables}
                        onChange={(e) => setOpcuaServerConfig({ ...opcuaServerConfig, num_variables: parseInt(e.target.value) })}
                      />
                    </div>
                    {canConfigure() && (
                      <Button className="w-full" onClick={handleStartOpcuaServer} disabled={opcuaServerLoading} data-testid="start-opcua-server-btn">
                        <Play className="w-4 h-4 mr-2" />
                        {opcuaServerLoading ? 'Starting...' : 'Start OPC UA Server'}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Active OPC UA Servers</CardTitle>
                      <Button variant="ghost" size="icon" onClick={fetchOpcuaServers}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {opcuaServers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No active OPC UA servers</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {opcuaServers.map((server) => (
                          <div
                            key={server.id}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedOpcuaServer === server.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            )}
                            onClick={() => setSelectedOpcuaServer(server.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full animate-pulse", server.is_running ? "bg-green-500" : "bg-zinc-500")} />
                                <SecurityIcon mode={server.security_mode} />
                                <span className="text-sm font-mono truncate max-w-[150px]">{server.endpoint_url.split('//')[1]}</span>
                              </div>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleStopOpcuaServer(server.id); }}>
                                <Square className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {server.simulation_enabled ? (
                                <>
                                  <Badge className="text-xs bg-green-500/20 text-green-500">Simulating</Badge>
                                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStopOpcuaSimulation(server.id); }}>
                                    <Square className="w-3 h-3 mr-1" /> Stop
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStartOpcuaSimulation(server.id); }}>
                                  <Activity className="w-3 h-3 mr-1" /> Start Sim
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Server Variables</CardTitle>
                    <CardDescription>{selectedOpcuaServer ? 'Live values' : 'Select a server'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedOpcuaServer ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Select a server</p>
                      </div>
                    ) : !opcuaServerData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Variable</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(opcuaServerData.variables || {}).map(([name, value]) => (
                              <TableRow key={name}>
                                <TableCell className="font-mono text-xs">{name}</TableCell>
                                <TableCell className="text-right font-mono tabular-nums">{typeof value === 'number' ? value.toFixed(2) : String(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* OPC UA Client */}
            <TabsContent value="ua-client" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="w-5 h-5" />
                      Client Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Server Endpoint URL</Label>
                      <Input
                        value={opcuaClientConfig.endpoint_url}
                        onChange={(e) => setOpcuaClientConfig({ ...opcuaClientConfig, endpoint_url: e.target.value })}
                        placeholder="opc.tcp://192.168.1.100:4840/server/"
                        data-testid="opcua-client-endpoint"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Security Mode</Label>
                      <Select value={opcuaClientConfig.security_mode} onValueChange={(v) => setOpcuaClientConfig({ ...opcuaClientConfig, security_mode: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="sign">Sign</SelectItem>
                          <SelectItem value="sign_encrypt">Sign & Encrypt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Poll Interval (ms)</Label>
                      <Input
                        type="number"
                        value={opcuaClientConfig.poll_interval_ms}
                        onChange={(e) => setOpcuaClientConfig({ ...opcuaClientConfig, poll_interval_ms: parseInt(e.target.value) })}
                      />
                    </div>
                    {canConfigure() && (
                      <Button className="w-full" onClick={handleConnectOpcuaClient} disabled={opcuaClientLoading} data-testid="connect-opcua-client-btn">
                        <Link2 className="w-4 h-4 mr-2" />
                        {opcuaClientLoading ? 'Connecting...' : 'Connect to Server'}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Active Connections</CardTitle>
                      <Button variant="ghost" size="icon" onClick={fetchOpcuaClients}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {opcuaClients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No active connections</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {opcuaClients.map((client) => (
                          <div
                            key={client.id}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedOpcuaClient === client.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            )}
                            onClick={() => setSelectedOpcuaClient(client.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", client.is_connected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                                <span className="text-sm font-mono truncate max-w-[150px]">{client.endpoint_url.split('//')[1]}</span>
                              </div>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDisconnectOpcuaClient(client.id); }}>
                                <Unlink className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <SecurityIcon mode={client.security_mode} />
                              <Badge variant={client.is_connected ? "default" : "destructive"} className="text-xs">
                                {client.is_connected ? "Connected" : "Disconnected"}
                              </Badge>
                            </div>
                            {client.error_message && <p className="text-xs text-red-500 mt-1 truncate">{client.error_message}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Received Data</CardTitle>
                    <CardDescription>{selectedOpcuaClient ? 'Data from server' : 'Select a connection'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedOpcuaClient ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Select a connection</p>
                      </div>
                    ) : !opcuaClientData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        {opcuaClientData.error_message && (
                          <div className="p-2 mb-2 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
                            {opcuaClientData.error_message}
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Variable</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(opcuaClientData.variables || {}).map(([name, value]) => (
                              <TableRow key={name}>
                                <TableCell className="font-mono text-xs">{name}</TableCell>
                                <TableCell className="text-right font-mono tabular-nums">{typeof value === 'number' ? value.toFixed(2) : String(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* OPC DA Tab */}
        <TabsContent value="opcda" className="mt-6">
          {/* Legacy Protocol Warning Banner */}
          <div className="mb-4 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-amber-500">OPC DA - Legacy Protocol (Simulation Only)</p>
                  <Badge variant="outline" className="text-amber-500 border-amber-500">DEPRECATED</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  OPC DA is a Windows-only protocol based on COM/DCOM technology from the 1990s. It cannot run on Linux or modern cloud environments.
                </p>
                <div className="pt-2 border-t border-amber-500/20 mt-2">
                  <p className="text-xs font-medium text-green-500 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Recommendation: Use OPC UA instead - it's cross-platform, secure, and actively maintained.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="da-server">
            <TabsList>
              <TabsTrigger value="da-server">Server Mode</TabsTrigger>
              <TabsTrigger value="da-client">Client Mode</TabsTrigger>
            </TabsList>

            {/* OPC DA Server */}
            <TabsContent value="da-server" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      Server Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Server Name</Label>
                      <Input
                        value={opcdaServerConfig.server_name}
                        onChange={(e) => setOpcdaServerConfig({ ...opcdaServerConfig, server_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ProgID</Label>
                      <Input
                        value={opcdaServerConfig.prog_id}
                        onChange={(e) => setOpcdaServerConfig({ ...opcdaServerConfig, prog_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Tags</Label>
                      <Input
                        type="number"
                        value={opcdaServerConfig.num_tags}
                        onChange={(e) => setOpcdaServerConfig({ ...opcdaServerConfig, num_tags: parseInt(e.target.value) })}
                      />
                    </div>
                    {canConfigure() && (
                      <Button className="w-full" onClick={handleStartOpcdaServer} disabled={opcdaServerLoading} data-testid="start-opcda-server-btn">
                        <Play className="w-4 h-4 mr-2" />
                        {opcdaServerLoading ? 'Starting...' : 'Start OPC DA Server'}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Active OPC DA Servers</CardTitle>
                      <Button variant="ghost" size="icon" onClick={fetchOpcdaServers}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {opcdaServers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No active OPC DA servers</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {opcdaServers.map((server) => (
                          <div
                            key={server.id}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedOpcdaServer === server.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            )}
                            onClick={() => setSelectedOpcdaServer(server.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full animate-pulse", server.is_running ? "bg-green-500" : "bg-zinc-500")} />
                                <span className="text-sm font-medium">{server.prog_id}</span>
                              </div>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleStopOpcdaServer(server.id); }}>
                                <Square className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500">Simulation</Badge>
                              {server.simulation_enabled ? (
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStopOpcdaSimulation(server.id); }}>
                                  <Square className="w-3 h-3 mr-1" /> Stop Sim
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStartOpcdaSimulation(server.id); }}>
                                  <Activity className="w-3 h-3 mr-1" /> Start Sim
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Server Tags</CardTitle>
                    <CardDescription>{selectedOpcdaServer ? 'Live values' : 'Select a server'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedOpcdaServer ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Select a server</p>
                      </div>
                    ) : !opcdaServerData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tag</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(opcdaServerData.tags || {}).map(([name, value]) => (
                              <TableRow key={name}>
                                <TableCell className="font-mono text-xs">{name}</TableCell>
                                <TableCell className="text-right font-mono tabular-nums">{typeof value === 'number' ? value.toFixed(2) : String(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* OPC DA Client */}
            <TabsContent value="da-client" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="w-5 h-5" />
                      Client Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Server ProgID</Label>
                      <Input
                        value={opcdaClientConfig.server_prog_id}
                        onChange={(e) => setOpcdaClientConfig({ ...opcdaClientConfig, server_prog_id: e.target.value })}
                        placeholder="Matrikon.OPC.Simulation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Host</Label>
                      <Input
                        value={opcdaClientConfig.host}
                        onChange={(e) => setOpcdaClientConfig({ ...opcdaClientConfig, host: e.target.value })}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Poll Interval (ms)</Label>
                      <Input
                        type="number"
                        value={opcdaClientConfig.poll_interval_ms}
                        onChange={(e) => setOpcdaClientConfig({ ...opcdaClientConfig, poll_interval_ms: parseInt(e.target.value) })}
                      />
                    </div>
                    {canConfigure() && (
                      <Button className="w-full" onClick={handleConnectOpcdaClient} disabled={opcdaClientLoading} data-testid="connect-opcda-client-btn">
                        <Link2 className="w-4 h-4 mr-2" />
                        {opcdaClientLoading ? 'Connecting...' : 'Connect to Server'}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Active Connections</CardTitle>
                      <Button variant="ghost" size="icon" onClick={fetchOpcdaClients}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {opcdaClients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No active connections</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {opcdaClients.map((client) => (
                          <div
                            key={client.id}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedOpcdaClient === client.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            )}
                            onClick={() => setSelectedOpcdaClient(client.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", client.is_connected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                                <span className="text-sm font-medium">{client.server_prog_id}</span>
                              </div>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDisconnectOpcdaClient(client.id); }}>
                                <Unlink className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{client.host}</Badge>
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500">Simulation</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Received Data</CardTitle>
                    <CardDescription>{selectedOpcdaClient ? 'Data from server' : 'Select a connection'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedOpcdaClient ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Select a connection</p>
                      </div>
                    ) : !opcdaClientData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tag</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(opcdaClientData.tags || {}).map(([name, value]) => (
                              <TableRow key={name}>
                                <TableCell className="font-mono text-xs">{name}</TableCell>
                                <TableCell className="text-right font-mono tabular-nums">{typeof value === 'number' ? value.toFixed(2) : String(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};
