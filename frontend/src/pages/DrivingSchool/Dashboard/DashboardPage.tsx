import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Users, 
  Car, 
  Clock, 
  Activity, 
  BookOpen,
  Server,
  Cpu,
  HardDrive,
  AlertCircle,
  CheckCircle 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/services/api-service";
import {
  SystemInfo,
  ServiceStatus,
  ServiceType,
} from "@/types/system.types";
import { useUser } from "@/components/contexts/DrivingSchoolManagerContext";

const DrivingSchoolDashboard: React.FC = () => {
  // Get driving school context
  const { activeDrivingSchool } = useUser();

  // Dashboard data states
  const [stats, setStats] = useState({
    studentCount: 0,
    activeStudents: 0,
    carCount: 0,
    lastLogin: ""
  });
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data from backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!activeDrivingSchool) {
        setError('No driving school selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Use driving school specific endpoint
        const response = await apiService.drivingSchool.getDashboard(activeDrivingSchool.id.toString());
        
        if (response.success && response.data) {
          setStats(response.data.stats);
          setRecentActivities(response.data.recentActivities);
          if (response.data.systemInfo) {
            setSystemInfo(response.data.systemInfo);
          }
        } else {
          setError(response.error || 'Failed to fetch dashboard data');
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setError('Network error: Unable to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeDrivingSchool]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { 
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    }).format(date);
  };



  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.RUNNING:
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case ServiceStatus.DOWN:
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      default:
        return <AlertCircle className="h-3 w-3 text-yellow-600" />;
    }
  };

  const getServiceDisplayName = (serviceType: ServiceType): string => {
    switch (serviceType) {
      case ServiceType.BACKEND:
        return 'Backend';
      case ServiceType.DATABASE:
        return 'Database';
      case ServiceType.RABBITMQ:
        return 'RabbitMQ';
      case ServiceType.REDIS:
        return 'Redis';
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
          <h2 className="text-3xl font-bold">Dashboard</h2>
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
          <h2 className="text-3xl font-bold">Dashboard</h2>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          {activeDrivingSchool && (
            <p className="text-sm text-muted-foreground mt-1">
              {activeDrivingSchool.name} - Gerçek Zamanlı Veriler
            </p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Öğrenci Sayısı */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Öğrenci Sayısı
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studentCount}</div>
            <div className="mt-2">
              <Progress
                value={(stats.activeStudents / stats.studentCount) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Araç Sayısı */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Araç Sayısı
            </CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.carCount}</div>
            <p className="text-xs text-muted-foreground">
              Aktif kayıtlı araç
            </p>
          </CardContent>
        </Card>


      </div>

      {/* System Info Cards */}
      {systemInfo && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Sistem Durumu</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* RAM Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">RAM</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{systemInfo.ram.usagePercentage}%</div>
                <Progress value={systemInfo.ram.usagePercentage} className="h-1 mt-2" />
              </CardContent>
            </Card>

            {/* CPU Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">CPU</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{systemInfo.cpu.usage}%</div>
                <Progress value={systemInfo.cpu.usage} className="h-1 mt-2" />
              </CardContent>
            </Card>

            {/* Disk Usage - First disk */}
            {systemInfo.disks.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Disk</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{systemInfo.disks[0].usagePercentage}%</div>
                  <Progress value={systemInfo.disks[0].usagePercentage} className="h-1 mt-2" />
                </CardContent>
              </Card>
            )}

            {/* Services Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Servisler</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(systemInfo.services).slice(0, 3).map(([serviceType, serviceInfo]) => (
                    <div key={serviceType} className="flex items-center space-x-1">
                      {getStatusIcon(serviceInfo.status)}
                      <span className="text-xs">{getServiceDisplayName(serviceType as ServiceType)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Activity and Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Son Aktiviteler</CardTitle>
            <CardDescription>
              Sistemde gerçekleşen son işlemler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-start space-x-4 border-b pb-3 last:border-0">
                  <div className="bg-primary/10 p-2 rounded-full">
                    {activity.type === "login" && <Clock className="h-4 w-4 text-primary" />}
                    {activity.type === "student" && <Users className="h-4 w-4 text-primary" />}
                    {activity.type === "download" && <Activity className="h-4 w-4 text-primary" />}
                    {activity.type === "exam" && <BookOpen className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground"> </p>
                      <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Özet Bilgiler</CardTitle>
            <CardDescription>
              Hesap ve işlem özeti
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Son Giriş</span>
              </div>
              <span className="text-sm font-medium">{formatDate(stats.lastLogin)}</span>
            </div>
            
            {/* System Status Summary */}
            {systemInfo && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Sistem Durumu</div>
                {Object.entries(systemInfo.services).map(([serviceType, serviceInfo]) => (
                  <div key={serviceType} className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {getServiceDisplayName(serviceType as ServiceType)}
                    </span>
                    <Badge
                      variant={serviceInfo.status === ServiceStatus.RUNNING ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {serviceInfo.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DrivingSchoolDashboard;
