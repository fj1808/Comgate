import React from 'react';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatusTile = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  variant = 'default',
  className 
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-500/30 bg-green-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      case 'info':
        return 'border-blue-500/30 bg-blue-500/5';
      default:
        return '';
    }
  };

  return (
    <Card className={cn("card-hover", getVariantStyles(), className)} data-testid="status-tile">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>
        {(trend || trendValue) && (
          <div className={cn("flex items-center gap-1 mt-3 text-xs", getTrendColor())}>
            {getTrendIcon()}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
