import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString();
}

export function formatTimestamp(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

export function formatMs(ms) {
  if (ms === null || ms === undefined) return '-';
  return `${ms.toFixed(2)} ms`;
}

export function getQualityColor(quality) {
  switch (quality) {
    case 'good': return 'text-green-500';
    case 'bad': return 'text-red-500';
    case 'uncertain': return 'text-yellow-500';
    default: return 'text-muted-foreground';
  }
}

export function getStatusColor(status) {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'offline': return 'bg-zinc-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-zinc-500';
  }
}

export function getProtocolBadgeColor(protocol) {
  switch (protocol) {
    case 'tcp': return 'bg-blue-500/20 text-blue-500';
    case 'udp': return 'bg-purple-500/20 text-purple-500';
    case 'rtu': return 'bg-orange-500/20 text-orange-500';
    default: return 'bg-zinc-500/20 text-zinc-500';
  }
}

export function truncateString(str, maxLength = 30) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}
