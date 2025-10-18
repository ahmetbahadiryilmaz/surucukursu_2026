import { ReactNode, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { apiService } from "@/services/api-service";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import { UserTypes } from "@/shared/enums";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: number | number[];
}

/**
 * Enhanced ProtectedRoute component that integrates with the API service architecture
 * 
 * Features:
 * - Leverages user context for fast authentication checks
 * - Falls back to API service methods for authentication validation
 * - Provides role-based access control
 * - Redirects unauthorized users to appropriate routes
 * - Enhanced loading states and error handling
 * - Integrates with the existing toast and error handling system
 */
const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const [userRole, setUserRole] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = drivingSchoolOwnerContext();

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Check if user is in context first (faster)
        if (user && user.userType !== undefined) {
          setUserRole(user.userType);
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }

        // Fallback: Check API service for user data
        const storedUser = apiService.getUser();
        const storedRole = apiService.getUserRole();

        if (storedUser && storedRole) {
          const roleNumber = parseInt(storedRole);
          
          // Validate role number
          if (!isNaN(roleNumber)) {
            setUserRole(roleNumber);
            setIsAuthenticated(true);
          } else {
            console.warn("Invalid user role format in storage:", storedRole);
            setIsAuthenticated(false);
          }
        } else {
          // No valid authentication found
          console.debug("No authentication data found");
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, [user, allowedRole]);

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
    return <Navigate to="/" replace />;
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