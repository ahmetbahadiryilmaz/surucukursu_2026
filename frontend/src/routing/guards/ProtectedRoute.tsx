import { ReactNode, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { apiService } from "@/services/api-service";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import { UserTypes } from "@/shared/enums";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: number | number[];
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const [userRole, setUserRole] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = drivingSchoolOwnerContext();

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Always verify with server — catches expired tokens and server-down scenarios
        await apiService.user.me();

        // Server validated — use local role data
        const roleFromContext = user?.userType;
        const roleFromStorage = apiService.getUserRole();
        const roleNumber = roleFromContext ?? (roleFromStorage ? parseInt(roleFromStorage) : NaN);

        if (!isNaN(roleNumber)) {
          setUserRole(roleNumber);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        // Network error or 401 — clear stale credentials and force login
        apiService.authentication.logout();
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, [user]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 text-sm">Kimlik doğrulanıyor...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || userRole === null) {
    return <Navigate to="/login" replace />;
  }
  
  // Check role permissions if specified
  if (allowedRole !== undefined) {
    const hasPermission = Array.isArray(allowedRole) 
      ? allowedRole.includes(userRole)
      : userRole === allowedRole;

    if (!hasPermission) {
      // Redirect based on user role to their appropriate dashboard
      const redirectPath = getDefaultRoute(userRole);
      return <Navigate to={redirectPath} replace />;
    }
  }
  
  return <>{children}</>;
};

// Helper function to get default route based on user role
const getDefaultRoute = (userRole: number): string => {
  switch (userRole) {
    case UserTypes.ADMIN:
    case UserTypes.SUPER_ADMIN:
      return "/admin/";
    
    case UserTypes.DRIVING_SCHOOL_OWNER:
    case UserTypes.DRIVING_SCHOOL_MANAGER:
      return "/driving-school/";
    
    default:
      return "/";
  }
};

export default ProtectedRoute;