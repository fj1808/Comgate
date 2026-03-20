import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { DeviceCard } from '../components/DeviceCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Plus, Server } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const defaultDevice = {
  name: '',
  protocol: 'tcp',
  group: '',
  is_enabled: true,
  ip_address: '',
  port: 502,
  com_port: '',
  baud_rate: 9600,
  parity: 'N',
  data_bits: 8,
  stop_bits: 1,
  unit_id: 1,
  timeout_ms: 3000,
  retries: 3,
  max_block_size: 120,
  default_endian: 'ABCD'
};

export const DevicesPage = () => {
  const { token, canConfigure } = useAuth();
  const { currentProject, devices, refreshDevices } = useProject();
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState(defaultDevice);
  const [deleteDevice, setDeleteDevice] = useState(null);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentProject) {
      toast.error('Please select a project first');
      return;
    }
    
    setLoading(true);
    try {
      if (editingDevice) {
        await axios.put(`${API_URL}/api/devices/${editingDevice.id}`, deviceForm, { headers });
        toast.success('Device updated successfully');
      } else {
        await axios.post(`${API_URL}/api/projects/${currentProject.id}/devices`, deviceForm, { headers });
        toast.success('Device created successfully');
      }
      setShowDialog(false);
      setEditingDevice(null);
      setDeviceForm(defaultDevice);
      refreshDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save device');
    }
    setLoading(false);
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setDeviceForm({
      ...defaultDevice,
      ...device
    });
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteDevice) return;
    
    try {
      await axios.delete(`${API_URL}/api/devices/${deleteDevice.id}`, { headers });
      toast.success('Device deleted successfully');
      refreshDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete device');
    }
    setDeleteDevice(null);
  };

  const openCreateDialog = () => {
    setEditingDevice(null);
    setDeviceForm(defaultDevice);
    setShowDialog(true);
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="devices-page-no-project">
        <Server className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
        <p className="text-muted-foreground">Select a project from the sidebar to manage devices</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="devices-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground">Manage Modbus devices for {currentProject.name}</p>
        </div>
        {canConfigure() && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="add-device-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDevice ? 'Edit Device' : 'Add New Device'}</DialogTitle>
                <DialogDescription className="sr-only">Configure device connection settings</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Device Name</Label>
                    <Input
                      id="name"
                      value={deviceForm.name}
                      onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                      placeholder="VendorA_PLC"
                      required
                      data-testid="device-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="protocol">Protocol</Label>
                    <Select
                      value={deviceForm.protocol}
                      onValueChange={(value) => setDeviceForm({ ...deviceForm, protocol: value })}
                    >
                      <SelectTrigger data-testid="device-protocol-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tcp">Modbus TCP</SelectItem>
                        <SelectItem value="udp">Modbus UDP</SelectItem>
                        <SelectItem value="rtu">Modbus RTU</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(deviceForm.protocol === 'tcp' || deviceForm.protocol === 'udp') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ip">IP Address</Label>
                      <Input
                        id="ip"
                        value={deviceForm.ip_address}
                        onChange={(e) => setDeviceForm({ ...deviceForm, ip_address: e.target.value })}
                        placeholder="192.168.1.100"
                        required
                        data-testid="device-ip-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={deviceForm.port}
                        onChange={(e) => setDeviceForm({ ...deviceForm, port: parseInt(e.target.value) })}
                        placeholder="502"
                        required
                        data-testid="device-port-input"
                      />
                    </div>
                  </div>
                )}

                {deviceForm.protocol === 'rtu' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="com">COM Port</Label>
                        <Input
                          id="com"
                          value={deviceForm.com_port}
                          onChange={(e) => setDeviceForm({ ...deviceForm, com_port: e.target.value })}
                          placeholder="COM1"
                          required
                          data-testid="device-com-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="baud">Baud Rate</Label>
                        <Select
                          value={String(deviceForm.baud_rate)}
                          onValueChange={(value) => setDeviceForm({ ...deviceForm, baud_rate: parseInt(value) })}
                        >
                          <SelectTrigger data-testid="device-baud-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="9600">9600</SelectItem>
                            <SelectItem value="19200">19200</SelectItem>
                            <SelectItem value="38400">38400</SelectItem>
                            <SelectItem value="57600">57600</SelectItem>
                            <SelectItem value="115200">115200</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parity">Parity</Label>
                        <Select
                          value={deviceForm.parity}
                          onValueChange={(value) => setDeviceForm({ ...deviceForm, parity: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="N">None</SelectItem>
                            <SelectItem value="E">Even</SelectItem>
                            <SelectItem value="O">Odd</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="data_bits">Data Bits</Label>
                        <Select
                          value={String(deviceForm.data_bits)}
                          onValueChange={(value) => setDeviceForm({ ...deviceForm, data_bits: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7</SelectItem>
                            <SelectItem value="8">8</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stop_bits">Stop Bits</Label>
                        <Select
                          value={String(deviceForm.stop_bits)}
                          onValueChange={(value) => setDeviceForm({ ...deviceForm, stop_bits: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_id">Unit ID</Label>
                    <Input
                      id="unit_id"
                      type="number"
                      value={deviceForm.unit_id}
                      onChange={(e) => setDeviceForm({ ...deviceForm, unit_id: parseInt(e.target.value) })}
                      min={1}
                      max={247}
                      data-testid="device-unit-id-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group">Group (Optional)</Label>
                    <Input
                      id="group"
                      value={deviceForm.group}
                      onChange={(e) => setDeviceForm({ ...deviceForm, group: e.target.value })}
                      placeholder="Vendor A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Timeout (ms)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={deviceForm.timeout_ms}
                      onChange={(e) => setDeviceForm({ ...deviceForm, timeout_ms: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retries">Retries</Label>
                    <Input
                      id="retries"
                      type="number"
                      value={deviceForm.retries}
                      onChange={(e) => setDeviceForm({ ...deviceForm, retries: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_block">Max Block Size</Label>
                    <Input
                      id="max_block"
                      type="number"
                      value={deviceForm.max_block_size}
                      onChange={(e) => setDeviceForm({ ...deviceForm, max_block_size: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endian">Default Endianness</Label>
                  <Select
                    value={deviceForm.default_endian}
                    onValueChange={(value) => setDeviceForm({ ...deviceForm, default_endian: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABCD">ABCD (Big Endian)</SelectItem>
                      <SelectItem value="CDAB">CDAB (Big Endian Swap)</SelectItem>
                      <SelectItem value="BADC">BADC (Little Endian Swap)</SelectItem>
                      <SelectItem value="DCBA">DCBA (Little Endian)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={loading} data-testid="device-submit-btn">
                  {loading ? 'Saving...' : (editingDevice ? 'Update Device' : 'Create Device')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Server className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Devices</h3>
            <p className="text-muted-foreground mb-4">Add your first Modbus device to get started</p>
            {canConfigure() && (
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onEdit={handleEdit}
              onDelete={(d) => setDeleteDevice(d)}
              canEdit={canConfigure()}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteDevice} onOpenChange={() => setDeleteDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDevice?.name}"? This will also delete all associated tags.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
