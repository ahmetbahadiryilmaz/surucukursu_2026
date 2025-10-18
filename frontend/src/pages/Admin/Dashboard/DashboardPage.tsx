import { useState, useEffect } from 'react';
import { 
  Cpu,  
  HardDrive, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Users,
  Car,
  Activity
} from 'lucide-react';
import { apiService } from '@/services/api-service';
import { 
  Alert,
  AlertDescription,
  AlertTitle 
} from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  DashboardData,
  RecentActivity,
  SystemInfo
} from '@/types/system.types';


const AdminDashboard = () => {
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const [filteredActivities, setFilteredActivities] = useState<RecentActivity[]>([]);
  


  // Fetch dashboard data from backend
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get dashboard data from admin endpoint
      const response = await apiService.admin.getDashboard();
      console.log('Admin dashboard response:', response);
      
      if (response.success && response.data) {
        setDashboardData(response.data);
        setFilteredActivities(response.data.recentActivities || []);
        
        // Set system info from dashboard response if available
        if (response.data.systemInfo) {
          setSystemInfo(response.data.systemInfo);
        }
      } else {
        setError(response.error || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Network error: Unable to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const refreshData = () => {
    fetchDashboardData();
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter activities based on search text
  useEffect(() => {
    if (!dashboardData?.recentActivities) return;
    
    let result = dashboardData.recentActivities;
    
    if (filterText) {
      const searchTerm = filterText.toLowerCase();
      result = result.filter(activity => 
        activity.type.toLowerCase().includes(searchTerm) ||
        activity.user.toLowerCase().includes(searchTerm) ||
        activity.description.toLowerCase().includes(searchTerm)
      );
    }
    
    setFilteredActivities(result);
  }, [dashboardData, filterText]);

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.toLocaleTimeString('tr-TR')} ${date.toLocaleDateString('tr-TR')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <Button onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Alert className="border-red-500 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Error</AlertTitle>
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <Button 
          onClick={refreshData} 
          disabled={loading}
          className="flex items-center self-start"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* System Health Alert */}
 

      {/* Stats Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.studentCount}</div>
              <p className="text-xs text-muted-foreground">Total students enrolled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.activeStudents}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cars</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.carCount}</div>
              <p className="text-xs text-muted-foreground">Available vehicles</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Information */}
      {systemInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Cpu className="h-4 w-4 inline mr-2" />
                CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemInfo.cpu.usage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {systemInfo.cpu.cores} cores available
              </p>
              <Progress value={systemInfo.cpu.usage} className="mt-2" />
            </CardContent>
          </Card>

          {/* Memory Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemInfo.ram.usagePercentage}%</div>
              <p className="text-xs text-muted-foreground">
                {systemInfo.ram.used} / {systemInfo.ram.total}
              </p>
              <Progress value={systemInfo.ram.usagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          {/* Disk Cards */}
          {systemInfo.disks.map((disk, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <HardDrive className="h-4 w-4 inline mr-2" />
                  {disk.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{disk.usagePercentage || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {disk.used || 'N/A'} / {disk.total || 'N/A'}
                </p>
                <Progress value={disk.usagePercentage || 0} className="mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Services Status and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Status */}
        {systemInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Services Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(systemInfo.services).map(([serviceName, serviceInfo]) => (
                  <div key={serviceName} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{serviceName}</span>
                    <div className="flex items-center">
                      {serviceInfo.status === 'running' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      ) : serviceInfo.status === 'down' ? (
                        <XCircle className="h-4 w-4 text-red-500 mr-1" />
                      ) : (
                        <Settings className="h-4 w-4 text-yellow-500 mr-1" />
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        serviceInfo.status === 'running' 
                          ? 'bg-green-100 text-green-800' 
                          : serviceInfo.status === 'down'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {serviceInfo.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">:{serviceInfo.port}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activities */}
        {dashboardData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activities
                </div>
                {filteredActivities.length > 0 && (
                  <Input
                    type="text"
                    placeholder="Search activities..."
                    className="w-32 h-8 text-xs"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredActivities.length > 0 ? (
                  filteredActivities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {activity.user} • {formatDate(activity.date)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        activity.type === 'student' 
                          ? 'bg-blue-100 text-blue-800'
                          : activity.type === 'exam'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.type}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {filterText ? 'No activities match your search.' : 'No recent activities.'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
