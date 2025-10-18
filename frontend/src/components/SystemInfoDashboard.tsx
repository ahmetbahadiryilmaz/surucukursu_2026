import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Activity, 
  AlertCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiService } from "@/services/api-service";
import {
  SystemInfo,
  SystemInfoResponse,
  ServiceStatus,
  ServiceType,
  SystemDiskInfo,
  ServiceInfo
} from "@/types/system.types";

const SystemInfoDashboard: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchSystemInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: SystemInfoResponse = await apiService.admin.getSystemInfo();
      
      if (response.success && response.data) {
        setSystemInfo(response.data);
        setLastUpdated(new Date(response.timestamp).toLocaleString('tr-TR'));
      } else {
        setError(response.error || 'Failed to fetch system information');
      }
    } catch (err) {
      setError('Network error: Unable to fetch system information');
      console.error('Error fetching system info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemInfo, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ServiceStatus): string => {
    switch (status) {
      case ServiceStatus.RUNNING:
        return 'bg-green-500';
      case ServiceStatus.DOWN:
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.RUNNING:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case ServiceStatus.DOWN:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getServiceIcon = (serviceType: ServiceType) => {
    switch (serviceType) {
      case ServiceType.DATABASE:
        return <Database className="h-5 w-5" />;
      case ServiceType.BACKEND:
      case ServiceType.FRONTEND:
        return <Server className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getServiceDisplayName = (serviceType: ServiceType): string => {
    switch (serviceType) {
      case ServiceType.BACKEND:
        return 'Backend API';
      case ServiceType.DATABASE:
        return 'Database';
      case ServiceType.RABBITMQ:
        return 'RabbitMQ';
      case ServiceType.REDIS:
        return 'Redis Cache';
      case ServiceType.FRONTEND:
        return 'Frontend';
      default:
        return serviceType;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">System Info</h2>
          <Button disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">System Info</h2>
          <Button onClick={fetchSystemInfo}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!systemInfo) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">System Info</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </span>
          <Button onClick={fetchSystemInfo} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* RAM Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">RAM Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.ram.usagePercentage}%</div>
            <div className="text-xs text-muted-foreground mb-2">
              {systemInfo.ram.used} / {systemInfo.ram.total}
            </div>
            <Progress value={systemInfo.ram.usagePercentage} className="h-2" />
          </CardContent>
        </Card>

        {/* CPU Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.cpu.usage}%</div>
            <p className="text-xs text-muted-foreground">
              {systemInfo.cpu.cores} cores
            </p>
            <Progress value={systemInfo.cpu.usage} className="h-2 mt-2" />
          </CardContent>
        </Card>

        {/* Disk Usage */}
        {systemInfo.disks.map((disk: SystemDiskInfo, index: number) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{disk.name}</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{disk.usagePercentage}%</div>
              <div className="text-xs text-muted-foreground mb-2">
                {disk.used} / {disk.total}
              </div>
              <Progress value={disk.usagePercentage} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle>Services Status</CardTitle>
          <CardDescription>Current status of all system services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(systemInfo.services).map(([serviceType, serviceInfo]: [string, ServiceInfo]) => (
              <div key={serviceType} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getServiceIcon(serviceType as ServiceType)}
                  <div>
                    <div className="font-medium">{getServiceDisplayName(serviceType as ServiceType)}</div>
                    <div className="text-xs text-muted-foreground">Port {serviceInfo.port}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(serviceInfo.status)}
                  <Badge
                    variant={serviceInfo.status === ServiceStatus.RUNNING ? "default" : "destructive"}
                    className={`${getStatusColor(serviceInfo.status)} text-white`}
                  >
                    {serviceInfo.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemInfoDashboard;
