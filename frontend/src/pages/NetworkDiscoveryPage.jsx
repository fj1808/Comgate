import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Radar, Server, Wifi, Monitor, Loader2, CheckCircle, XCircle, Copy, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const NetworkDiscoveryPage = () => {
  const { token } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanningModbus, setScanningModbus] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [modbusResult, setModbusResult] = useState(null);
  const [customSubnet, setCustomSubnet] = useState('');
  const [modbusPort, setModbusPort] = useState('5020');
  const headers = { Authorization: `Bearer ${token}` };

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const payload = {};
      if (customSubnet.trim()) payload.subnet = customSubnet.trim();
      const response = await axios.post(`${API_URL}/api/discovery/scan`, payload, { headers });
      setScanResult(response.data);
      if (response.data.servers.length === 0) {
        toast.info('No ComGate servers found on the network');
      } else {
        toast.success(`Found ${response.data.servers.length} ComGate server(s)`);
      }
    } catch (error) {
      toast.error('Network scan failed: ' + (error.response?.data?.detail || error.message));
    }
    setScanning(false);
  };

  const handleModbusScan = async () => {
    setScanningModbus(true);
    setModbusResult(null);
    try {
      const payload = { port: parseInt(modbusPort) || 5020 };
      if (customSubnet.trim()) payload.subnet = customSubnet.trim();
      const response = await axios.post(`${API_URL}/api/discovery/scan-modbus`, payload, { headers });
      setModbusResult(response.data);
      if (response.data.devices.length === 0) {
        toast.info('No Modbus devices found on the network');
      } else {
        toast.success(`Found ${response.data.devices.length} Modbus device(s)`);
      }
    } catch (error) {
      toast.error('Modbus scan failed: ' + (error.response?.data?.detail || error.message));
    }
    setScanningModbus(false);
  };

  const copyIp = (ip) => {
    navigator.clipboard.writeText(ip);
    toast.success(`Copied ${ip} to clipboard`);
  };

  return (
    <div className="space-y-6" data-testid="network-discovery-page">
      <div>
        <h2 className="text-lg font-semibold">Network Discovery</h2>
        <p className="text-sm text-muted-foreground">
          Scan your local network to find ComGate servers and Modbus devices
        </p>
      </div>

      {/* Scan Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="w-5 h-5" />
            Network Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subnet (optional, auto-detected if empty)</Label>
              <Input
                placeholder="e.g. 192.168.1"
                value={customSubnet}
                onChange={(e) => setCustomSubnet(e.target.value)}
                data-testid="subnet-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Modbus Port</Label>
              <Input
                placeholder="5020"
                value={modbusPort}
                onChange={(e) => setModbusPort(e.target.value)}
                data-testid="modbus-port-input"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleScan}
              disabled={scanning || scanningModbus}
              className="flex-1"
              data-testid="scan-comgate-btn"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4 mr-2" />
                  Scan ComGate Servers
                </>
              )}
            </Button>
            <Button
              onClick={handleModbusScan}
              disabled={scanning || scanningModbus}
              variant="secondary"
              className="flex-1"
              data-testid="scan-modbus-btn"
            >
              {scanningModbus ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Plug className="w-4 h-4 mr-2" />
                  Scan Modbus Devices
                </>
              )}
            </Button>
          </div>

          {(scanning || scanningModbus) && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-primary/30 animate-ping absolute" />
                <Radar className="w-10 h-10 text-primary relative" />
              </div>
              <div>
                <p className="font-medium">Scanning network...</p>
                <p className="text-sm text-muted-foreground">
                  {scanning ? 'Looking for ComGate servers on port 8001' : `Looking for Modbus devices on port ${modbusPort}`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modbus Scan Results */}
      {modbusResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plug className="w-5 h-5" />
                Modbus Devices
              </span>
              <Badge variant="outline">
                {modbusResult.devices.length} device(s) found
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-muted-foreground">
              Your IP: <span className="font-mono text-foreground">{modbusResult.local_ip}</span>
              {' | '}Port scanned: <span className="font-mono text-foreground">{modbusResult.port_scanned}</span>
              {' | '}Scanned at: {new Date(modbusResult.scanned_at).toLocaleTimeString()}
            </div>

            {modbusResult.devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No Modbus devices found on port {modbusResult.port_scanned}</p>
                <p className="text-sm mt-1">Make sure the Modbus slave is running on the client laptop</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modbusResult.devices.map((device, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-lg border flex items-center justify-between",
                      device.is_self ? "border-primary bg-primary/5" : "border-green-500 bg-green-500/5"
                    )}
                    data-testid={`modbus-device-${idx}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-full",
                        device.is_self ? "bg-primary/20" : "bg-green-500/20"
                      )}>
                        <Plug className={cn("w-6 h-6", device.is_self ? "text-primary" : "text-green-500")} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-semibold">{device.ip}</span>
                          {device.is_self && <Badge className="bg-primary/20 text-primary text-xs">This PC</Badge>}
                          <Badge className="bg-green-500/20 text-green-600 text-xs">Modbus TCP</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>Port: {device.port}</span>
                        </div>
                      </div>
                    </div>
                    {!device.is_self && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyIp(device.ip)}
                        data-testid={`copy-modbus-ip-${idx}`}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy IP
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {modbusResult.devices.filter(d => !d.is_self).length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                <p className="font-medium mb-1 text-green-700">To connect to this Modbus device:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to <strong>Devices</strong> page</li>
                  <li>Click <strong>+ New Device</strong></li>
                  <li>Set Protocol: <strong>TCP</strong></li>
                  <li>Set IP: <strong>{modbusResult.devices.find(d => !d.is_self)?.ip}</strong></li>
                  <li>Set Port: <strong>{modbusResult.port_scanned}</strong></li>
                  <li>Set Unit ID: <strong>1</strong></li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ComGate Scan Results */}
      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                ComGate Servers
              </span>
              <Badge variant="outline">
                {scanResult.servers.length} server(s) found
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-muted-foreground">
              Your IP: <span className="font-mono text-foreground">{scanResult.local_ip}</span>
              {' | '}Subnet: <span className="font-mono text-foreground">{scanResult.subnet}.*</span>
              {' | '}Scanned at: {new Date(scanResult.scanned_at).toLocaleTimeString()}
            </div>

            {scanResult.servers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No ComGate servers found</p>
                <p className="text-sm mt-1">Make sure the server laptop is running ComGate and is on the same network</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scanResult.servers.map((server, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-lg border flex items-center justify-between",
                      server.is_self ? "border-primary bg-primary/5" : "border-border"
                    )}
                    data-testid={`discovered-server-${idx}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-full",
                        server.is_self ? "bg-primary/20" : "bg-green-500/20"
                      )}>
                        {server.is_self ? (
                          <Monitor className="w-6 h-6 text-primary" />
                        ) : (
                          <Server className="w-6 h-6 text-green-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-semibold">{server.ip}</span>
                          {server.is_self && <Badge className="bg-primary/20 text-primary text-xs">This PC</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>Port: {server.port}</span>
                          {server.modbus_servers_active > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                              Modbus: {server.modbus_servers_active}
                            </Badge>
                          )}
                          {server.opcua_servers_active > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                              OPC UA: {server.opcua_servers_active}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!server.is_self && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyIp(server.ip)}
                        data-testid={`copy-ip-${idx}`}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy IP
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
