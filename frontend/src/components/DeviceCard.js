import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn, getStatusColor, getProtocolBadgeColor } from '../lib/utils';
import { Server, Wifi, Usb, Edit, Trash2 } from 'lucide-react';

export const DeviceCard = ({ device, onEdit, onDelete, canEdit }) => {
  const getProtocolIcon = () => {
    switch (device.protocol) {
      case 'tcp':
      case 'udp':
        return <Wifi className="w-4 h-4" />;
      case 'rtu':
        return <Usb className="w-4 h-4" />;
      default:
        return <Server className="w-4 h-4" />;
    }
  };

  const getConnectionInfo = () => {
    if (device.protocol === 'rtu') {
      return `${device.com_port} @ ${device.baud_rate} baud`;
    }
    return `${device.ip_address}:${device.port}`;
  };

  return (
    <Card className="card-hover" data-testid={`device-card-${device.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              device.status === 'online' ? 'bg-green-500/20' : 'bg-zinc-500/20'
            )}>
              {getProtocolIcon()}
            </div>
            <div>
              <CardTitle className="text-base">{device.name}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono">{getConnectionInfo()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor(device.status))} />
            <span className="text-xs text-muted-foreground capitalize">{device.status}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getProtocolBadgeColor(device.protocol)}>
              {device.protocol.toUpperCase()}
            </Badge>
            <Badge variant="outline">Unit ID: {device.unit_id}</Badge>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(device)} data-testid={`edit-device-${device.id}`}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(device)} data-testid={`delete-device-${device.id}`}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Success</p>
            <p className="text-sm font-mono text-green-500 tabular-nums">{device.success_count || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Errors</p>
            <p className="text-sm font-mono text-red-500 tabular-nums">{device.error_count || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
