import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Play, Square, Server, RefreshCw, Edit2, Radio, Wifi, Network, Globe, Activity, Link2, Unlink, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const SimulatorPage = () => {
  const { token, canConfigure } = useAuth();
  
  // In-Memory Simulator State
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [simulatorData, setSimulatorData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [config, setConfig] = useState({
    protocol: 'tcp',
    port: 5020,
    unit_id: 1,
    num_coils: 100,
    num_discrete_inputs: 100,
    num_input_registers: 100,
    num_holding_registers: 100
  });

  const [editAddress, setEditAddress] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Modbus Server State
  const [modbusServers, setModbusServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [serverData, setServerData] = useState(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState({});
  
  const [serverConfig, setServerConfig] = useState({
    protocol: 'tcp',
    host: '0.0.0.0',
    port: 5020,
    unit_id: 1,
    num_coils: 1000,
    num_discrete_inputs: 1000,
    num_input_registers: 1000,
    num_holding_registers: 1000
  });

  // Simulation Config
  const [simConfig, setSimConfig] = useState({
    enabled: true,
    interval_ms: 1000,
    pattern: 'sine',
    amplitude: 50.0,
    offset: 50.0,
    period_seconds: 60.0
  });

  const [serverEditAddress, setServerEditAddress] = useState(null);
  const [serverEditValue, setServerEditValue] = useState('');

  // Modbus Client State
  const [modbusClients, setModbusClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [clientLoading, setClientLoading] = useState(false);
  
  const [clientConfig, setClientConfig] = useState({
    protocol: 'tcp',
    remote_host: '',
    remote_port: 5020,
    unit_id: 1,
    poll_interval_ms: 1000,
    read_coils: true,
    read_discrete_inputs: true,
    read_input_registers: true,
    read_holding_registers: true,
    start_address: 0,
    register_count: 20
  });

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch functions
  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/simulator/sessions`, { headers });
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchSimulatorData = async (sessionId) => {
    try {
      const response = await axios.get(`${API_URL}/api/simulator/${sessionId}/data`, { headers });
      setSimulatorData(response.data);
    } catch (error) {
      console.error('Failed to fetch simulator data:', error);
    }
  };

  const fetchModbusServers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/modbus-server/list`, { headers });
      setModbusServers(response.data);
      // Fetch simulation status for each server
      for (const server of response.data) {
        fetchSimulationStatus(server.id);
      }
    } catch (error) {
      console.error('Failed to fetch Modbus servers:', error);
    }
  };

  const fetchServerData = async (serverId) => {
    try {
      const response = await axios.get(`${API_URL}/api/modbus-server/${serverId}/data`, { headers });
      setServerData(response.data);
    } catch (error) {
      console.error('Failed to fetch server data:', error);
    }
  };

  const fetchSimulationStatus = async (serverId) => {
    try {
      const response = await axios.get(`${API_URL}/api/modbus-server/${serverId}/simulation/status`, { headers });
      setSimulationStatus(prev => ({ ...prev, [serverId]: response.data }));
    } catch (error) {
      console.error('Failed to fetch simulation status:', error);
    }
  };

  const fetchModbusClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/modbus-client/list`, { headers });
      setModbusClients(response.data);
    } catch (error) {
      console.error('Failed to fetch Modbus clients:', error);
    }
  };

  const fetchClientData = async (clientId) => {
    try {
      const response = await axios.get(`${API_URL}/api/modbus-client/${clientId}/data`, { headers });
      setClientData(response.data);
    } catch (error) {
      console.error('Failed to fetch client data:', error);
    }
  };

  // Effects
  useEffect(() => {
    fetchSessions();
    fetchModbusServers();
    fetchModbusClients();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchSimulatorData(selectedSession);
      const interval = setInterval(() => fetchSimulatorData(selectedSession), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  useEffect(() => {
    if (selectedServer) {
      fetchServerData(selectedServer);
      fetchSimulationStatus(selectedServer);
      const interval = setInterval(() => {
        fetchServerData(selectedServer);
        fetchSimulationStatus(selectedServer);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedServer]);

  useEffect(() => {
    if (selectedClient) {
      fetchClientData(selectedClient);
      const interval = setInterval(() => fetchClientData(selectedClient), 1000);
      return () => clearInterval(interval);
    }
  }, [selectedClient]);

  // Handlers - Modbus Server
  const handleStartModbusServer = async () => {
    setServerLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/modbus-server/start`, serverConfig, { headers });
      toast.success(`Modbus Server started on port ${serverConfig.port}`);
      fetchModbusServers();
      setSelectedServer(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start Modbus server');
    }
    setServerLoading(false);
  };

  const handleStopModbusServer = async (serverId) => {
    try {
      // Stop simulation first if running
      if (simulationStatus[serverId]?.is_running) {
        await axios.post(`${API_URL}/api/modbus-server/${serverId}/simulation/stop`, {}, { headers });
      }
      await axios.post(`${API_URL}/api/modbus-server/${serverId}/stop`, {}, { headers });
      toast.success('Modbus Server stopped');
      if (selectedServer === serverId) {
        setSelectedServer(null);
        setServerData(null);
      }
      fetchModbusServers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to stop Modbus server');
    }
  };

  const handleStartSimulation = async (serverId) => {
    try {
      await axios.post(`${API_URL}/api/modbus-server/${serverId}/simulation/start`, simConfig, { headers });
      toast.success('Data simulation started (sine wave pattern)');
      fetchSimulationStatus(serverId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start simulation');
    }
  };

  const handleStopSimulation = async (serverId) => {
    try {
      await axios.post(`${API_URL}/api/modbus-server/${serverId}/simulation/stop`, {}, { headers });
      toast.success('Data simulation stopped');
      fetchSimulationStatus(serverId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to stop simulation');
    }
  };

  const handleWriteServerValue = async (registerType, address) => {
    try {
      const value = registerType === 'coil' || registerType === 'discrete_input' 
        ? serverEditValue === 'true' 
        : parseInt(serverEditValue);
      
      await axios.post(
        `${API_URL}/api/modbus-server/${selectedServer}/write`,
        { register_type: registerType, address: address, values: [value] },
        { headers }
      );
      toast.success('Value written');
      setServerEditAddress(null);
      setServerEditValue('');
      fetchServerData(selectedServer);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to write value');
    }
  };

  // Handlers - Modbus Client
  const handleConnectClient = async () => {
    if (!clientConfig.remote_host) {
      toast.error('Please enter the remote server IP address');
      return;
    }
    setClientLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/modbus-client/connect`, clientConfig, { headers });
      if (response.data.is_connected) {
        toast.success(`Connected to ${clientConfig.remote_host}:${clientConfig.remote_port}`);
      } else {
        toast.warning(`Connection initiated but not yet established: ${response.data.error_message || 'Retrying...'}`);
      }
      fetchModbusClients();
      setSelectedClient(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect');
    }
    setClientLoading(false);
  };

  const handleDisconnectClient = async (clientId) => {
    try {
      await axios.post(`${API_URL}/api/modbus-client/${clientId}/disconnect`, {}, { headers });
      toast.success('Client disconnected');
      if (selectedClient === clientId) {
        setSelectedClient(null);
        setClientData(null);
      }
      fetchModbusClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to disconnect');
    }
  };

  // Handlers - In-Memory Simulator
  const handleStartSimulator = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/simulator/start`, config, { headers });
      toast.success('Simulator started');
      fetchSessions();
      setSelectedSession(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start simulator');
    }
    setLoading(false);
  };

  const handleStopSimulator = async (sessionId) => {
    try {
      await axios.post(`${API_URL}/api/simulator/${sessionId}/stop`, {}, { headers });
      toast.success('Simulator stopped');
      if (selectedSession === sessionId) {
        setSelectedSession(null);
        setSimulatorData(null);
      }
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to stop simulator');
    }
  };

  const handleWriteValue = async (objectType, address) => {
    try {
      await axios.post(
        `${API_URL}/api/simulator/${selectedSession}/write`,
        null,
        {
          headers,
          params: {
            object_type: objectType,
            address: address,
            value: objectType === 'coil' ? editValue === 'true' : parseInt(editValue)
          }
        }
      );
      toast.success('Value written');
      setEditAddress(null);
      setEditValue('');
      fetchSimulatorData(selectedSession);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to write value');
    }
  };

  return (
    <div className="space-y-6" data-testid="simulator-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modbus Communication Hub</h1>
          <p className="text-muted-foreground">Server mode, Client mode, and Simulator for multi-PC communication</p>
        </div>
      </div>

      <Tabs defaultValue="client">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="client" className="flex items-center gap-2" data-testid="modbus-client-tab">
            <Link2 className="w-4 h-4" />
            Connect to Slave
          </TabsTrigger>
          <TabsTrigger value="server" className="flex items-center gap-2" data-testid="modbus-server-tab">
            <Globe className="w-4 h-4" />
            Run as Slave
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Local Simulator
          </TabsTrigger>
        </TabsList>

        {/* CLIENT TAB - Default for Option 1 users */}
        <TabsContent value="client" className="mt-6">
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <ArrowLeftRight className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-500">Connect to another PC running Modbus Slave</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the IP address of the PC running Option 2 or 3 (Modbus Slave). Find the IP using <code className="bg-muted px-1 rounded">ipconfig</code> on that PC.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Client Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Connection Settings
                </CardTitle>
                <CardDescription>Connect to the other laptop</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={clientConfig.protocol} onValueChange={(v) => setClientConfig({ ...clientConfig, protocol: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tcp">Modbus TCP</SelectItem>
                      <SelectItem value="udp">Modbus UDP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Slave PC IP Address</Label>
                  <Input
                    value={clientConfig.remote_host}
                    onChange={(e) => setClientConfig({ ...clientConfig, remote_host: e.target.value })}
                    placeholder="e.g., 192.168.0.120"
                    data-testid="client-remote-host"
                  />
                  <p className="text-xs text-muted-foreground">IP of the PC running Option 2 or 3</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={clientConfig.remote_port}
                      onChange={(e) => setClientConfig({ ...clientConfig, remote_port: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit ID</Label>
                    <Input
                      type="number"
                      value={clientConfig.unit_id}
                      onChange={(e) => setClientConfig({ ...clientConfig, unit_id: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Poll Interval (ms)</Label>
                  <Input
                    type="number"
                    value={clientConfig.poll_interval_ms}
                    onChange={(e) => setClientConfig({ ...clientConfig, poll_interval_ms: parseInt(e.target.value) })}
                  />
                </div>

                <Button
                  onClick={handleConnectClient}
                  disabled={clientLoading || !clientConfig.remote_host}
                  className="w-full"
                  data-testid="connect-client-btn"
                >
                  {clientLoading ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Connect</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Active Connections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Active Connections
                  </span>
                  <Button variant="ghost" size="icon" onClick={fetchModbusClients}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modbusClients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No active connections</p>
                    <p className="text-xs mt-1">Enter the slave IP and click Connect</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {modbusClients.map((client) => (
                        <div
                          key={client.id}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedClient === client.id ? "border-purple-500 bg-purple-500/10" : "hover:border-border"
                          )}
                          onClick={() => {
                            setSelectedClient(client.id);
                            fetchClientData(client.id);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm">{client.remote_host}:{client.remote_port}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchClientData(client.id);
                                }}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Badge variant={client.is_connected ? "default" : "destructive"}>
                                {client.is_connected ? "Connected" : "Disconnected"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Unit {client.unit_id}</span>
                            <span>{client.poll_interval_ms}ms</span>
                            {client.error_message && (
                              <span className="text-red-500">{client.error_message}</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDisconnectClient(client.id);
                            }}
                          >
                            <Unlink className="w-4 h-4 mr-2" />
                            Disconnect
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Received Data */}
            <Card>
              <CardHeader>
                <CardTitle>Received Data</CardTitle>
                <CardDescription>Data from the slave PC</CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedClient ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Connect to a slave to see data</p>
                  </div>
                ) : !clientData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p>Loading data...</p>
                  </div>
                ) : clientData.error ? (
                  <div className="text-center py-8 text-red-500">
                    <Badge variant="destructive">Failed to connect</Badge>
                    <p className="mt-2 text-sm">{clientData.error}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Holding Registers</h4>
                        <div className="grid grid-cols-5 gap-1">
                          {(clientData.holding_registers || []).slice(0, 20).map((val, idx) => (
                            <div key={idx} className="bg-muted p-1 rounded text-center text-xs font-mono">
                              {val}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Input Registers</h4>
                        <div className="grid grid-cols-5 gap-1">
                          {(clientData.input_registers || []).slice(0, 20).map((val, idx) => (
                            <div key={idx} className="bg-muted p-1 rounded text-center text-xs font-mono">
                              {val}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Coils</h4>
                        <div className="grid grid-cols-10 gap-1">
                          {(clientData.coils || []).slice(0, 20).map((val, idx) => (
                            <div key={idx} className={cn("p-1 rounded text-center text-xs", val ? "bg-green-500" : "bg-muted")}>
                              {val ? 1 : 0}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SERVER TAB */}
        <TabsContent value="server" className="mt-6">
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Network className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-500">Run as Slave (other PCs connect to this one)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Only use this if you want THIS laptop to provide data. For Option 1 users, use "Connect to Slave" tab instead.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Server Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Server Configuration
                </CardTitle>
                <CardDescription>Configure Modbus server (slave)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={serverConfig.protocol} onValueChange={(v) => setServerConfig({ ...serverConfig, protocol: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tcp">Modbus TCP</SelectItem>
                      <SelectItem value="udp">Modbus UDP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Host Address</Label>
                  <Input
                    value={serverConfig.host}
                    onChange={(e) => setServerConfig({ ...serverConfig, host: e.target.value })}
                    placeholder="0.0.0.0"
                  />
                  <p className="text-xs text-muted-foreground">0.0.0.0 = all interfaces</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={serverConfig.port}
                      onChange={(e) => setServerConfig({ ...serverConfig, port: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit ID</Label>
                    <Input
                      type="number"
                      value={serverConfig.unit_id}
                      onChange={(e) => setServerConfig({ ...serverConfig, unit_id: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                {canConfigure() && (
                  <Button className="w-full" onClick={handleStartModbusServer} disabled={serverLoading} data-testid="start-modbus-server-btn">
                    <Play className="w-4 h-4 mr-2" />
                    {serverLoading ? 'Starting...' : 'Start Server'}
                  </Button>
                )}

                {/* Simulation Config */}
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Data Simulation
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Pattern</Label>
                      <Select value={simConfig.pattern} onValueChange={(v) => setSimConfig({ ...simConfig, pattern: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sine">Sine Wave</SelectItem>
                          <SelectItem value="ramp">Ramp</SelectItem>
                          <SelectItem value="square">Square Wave</SelectItem>
                          <SelectItem value="random">Random</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Interval (ms)</Label>
                        <Input
                          type="number"
                          value={simConfig.interval_ms}
                          onChange={(e) => setSimConfig({ ...simConfig, interval_ms: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Period (sec)</Label>
                        <Input
                          type="number"
                          value={simConfig.period_seconds}
                          onChange={(e) => setSimConfig({ ...simConfig, period_seconds: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Servers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Servers</CardTitle>
                  <Button variant="ghost" size="icon" onClick={fetchModbusServers}><RefreshCw className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                {modbusServers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No active servers</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {modbusServers.map((server) => (
                      <div
                        key={server.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedServer === server.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setSelectedServer(server.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full animate-pulse", server.is_running ? "bg-green-500" : "bg-zinc-500")} />
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500">{server.host}:{server.port}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleStopModbusServer(server.id); }}>
                            <Square className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">Unit {server.unit_id}</Badge>
                          {simulationStatus[server.id]?.is_running ? (
                            <Badge className="text-xs bg-green-500/20 text-green-500 border-green-500/30">
                              <Activity className="w-3 h-3 mr-1" />
                              Simulating
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Static</Badge>
                          )}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {simulationStatus[server.id]?.is_running ? (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStopSimulation(server.id); }}>
                              <Square className="w-3 h-3 mr-1" /> Stop Sim
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStartSimulation(server.id); }}>
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

            {/* Server Data */}
            <Card>
              <CardHeader>
                <CardTitle>Server Register Data</CardTitle>
                <CardDescription>{selectedServer ? 'Live data (first 20)' : 'Select a server'}</CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedServer ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a server</p>
                  </div>
                ) : !serverData ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Coils (0x)</p>
                        <div className="flex flex-wrap gap-1">
                          {serverData.coils?.map((val, idx) => (
                            <div key={idx} className={cn("w-8 h-8 rounded text-xs font-mono flex items-center justify-center border", val ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-muted border-border")} title={`Coil ${idx}`}>{idx}</div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Holding Registers (4x)</p>
                        <Table>
                          <TableHeader><TableRow><TableHead className="w-[80px]">Address</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {serverData.holding_registers?.map((val, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono">{40001 + idx}</TableCell>
                                <TableCell className="text-right font-mono tabular-nums">{val}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        {/* LOCAL SIMULATOR TAB */}
        <TabsContent value="simulator" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Local Simulator</CardTitle>
                <CardDescription>In-memory simulator for local testing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={config.protocol} onValueChange={(v) => setConfig({ ...config, protocol: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tcp">Modbus TCP</SelectItem>
                      <SelectItem value="udp">Modbus UDP</SelectItem>
                      <SelectItem value="rtu">Modbus RTU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input type="number" value={config.port} onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit ID</Label>
                    <Input type="number" value={config.unit_id} onChange={(e) => setConfig({ ...config, unit_id: parseInt(e.target.value) })} />
                  </div>
                </div>
                {canConfigure() && (
                  <Button className="w-full" onClick={handleStartSimulator} disabled={loading}>
                    <Play className="w-4 h-4 mr-2" />{loading ? 'Starting...' : 'Start Simulator'}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Simulators</CardTitle>
                  <Button variant="ghost" size="icon" onClick={fetchSessions}><RefreshCw className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No active simulators</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div key={session.id} className={cn("p-3 rounded-lg border cursor-pointer transition-colors", selectedSession === session.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")} onClick={() => setSelectedSession(session.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", session.is_running ? "bg-green-500" : "bg-zinc-500")} />
                            <span className="font-mono text-sm">{session.protocol?.toUpperCase()}</span>
                            <Badge variant="outline">Port {session.port}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleStopSimulator(session.id); }}>
                            <Square className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Register Data</CardTitle>
                <CardDescription>{selectedSession ? 'Live values' : 'Select a simulator'}</CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedSession ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a simulator</p>
                  </div>
                ) : !simulatorData ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Coils</p>
                        <div className="flex flex-wrap gap-1">
                          {simulatorData.coils?.map((val, idx) => (
                            <div key={idx} className={cn("w-8 h-8 rounded text-xs font-mono flex items-center justify-center border", val ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-muted border-border")}>{idx}</div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Holding Registers</p>
                        <Table>
                          <TableHeader><TableRow><TableHead>Address</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {simulatorData.holding_registers?.map((val, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono">{40001 + idx}</TableCell>
                                <TableCell className="text-right font-mono">{val}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
