// Optimized UserProvider Context - Fixed localStorage state management
import { createContext, useContext, useEffect, useState, useCallback } from "react"

type User = {
  id: number;
  email: string;
  userType: number;
  date?: number;
  drivingSchools?: Array<{
    id: number;
    name: string;
    address: string;
    phone: string;
    created_at: string;
    updated_at: string;
  }>;
}

type UserProviderProps = {
  children: React.ReactNode
}

type UserProviderState = {
  user: User | null;
  isLoading: boolean;
  activeDrivingSchool: { id: number; name: string } | null;
  setUser: (user: User | null) => void;
  setActiveDrivingSchool: (schoolId: number) => void;
  clearUserData: () => void;
  refreshUserFromStorage: () => void;
}

const initialState: UserProviderState = {
  user: null,
  isLoading: true,
  activeDrivingSchool: null,
  setUser: () => {},
  setActiveDrivingSchool: () => {},
  clearUserData: () => {},
  refreshUserFromStorage: () => {},
}

const UserProviderContext = createContext<UserProviderState>(initialState)

export function DrivingSchoolManagerProvider({ children }: UserProviderProps) {
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeDrivingSchool, setActiveDrivingSchoolState] = useState<{ id: number; name: string } | null>(null)

  // Function to load user state from localStorage
  const loadUserStateFromStorage = useCallback(() => {
    console.log('🔄 Loading user state from localStorage...')
    
    try {
      const storedUser = localStorage.getItem("user")
      const storedActiveDrivingSchool = localStorage.getItem("activeDrivingSchool")
      
      console.log('📦 Stored user data:', storedUser)
      console.log('🏫 Stored driving school data:', storedActiveDrivingSchool)
      
      if (storedUser && storedUser !== 'null' && storedUser !== 'undefined') {
        const parsedUser = JSON.parse(storedUser)
        console.log('✅ Successfully parsed user:', parsedUser)
        
        setUserState(parsedUser)
        
        // Handle active driving school
        if (storedActiveDrivingSchool && storedActiveDrivingSchool !== 'null') {
          try {
            const parsedSchool = JSON.parse(storedActiveDrivingSchool)
            console.log('✅ Setting active driving school:', parsedSchool)
            setActiveDrivingSchoolState(parsedSchool)
          } catch (schoolError) {
            console.warn('⚠️ Error parsing stored driving school, using first school:', schoolError)
            // Fallback to first school
            if (parsedUser.drivingSchools?.length > 0) {
              const firstSchool = parsedUser.drivingSchools[0]
              const schoolInfo = { id: firstSchool.id, name: firstSchool.name }
              setActiveDrivingSchoolState(schoolInfo)
              localStorage.setItem("activeDrivingSchool", JSON.stringify(schoolInfo))
            }
          }
        } else if (parsedUser.drivingSchools?.length > 0) {
          // Set first driving school as active if none is selected
          console.log('🏫 Setting first driving school as active')
          const firstSchool = parsedUser.drivingSchools[0]
          const schoolInfo = { id: firstSchool.id, name: firstSchool.name }
          setActiveDrivingSchoolState(schoolInfo)
          localStorage.setItem("activeDrivingSchool", JSON.stringify(schoolInfo))
        }
      } else {
        console.log('❌ No valid user data found in localStorage')
        setUserState(null)
        setActiveDrivingSchoolState(null)
      }
    } catch (error) {
      console.error("💥 Error loading user state from storage:", error)
      // Clear potentially corrupted data
      localStorage.removeItem("user")
      localStorage.removeItem("activeDrivingSchool")
      setUserState(null)
      setActiveDrivingSchoolState(null)
    } finally {
      setIsLoading(false)
      console.log('✅ Loading complete')
    }
  }, [])

  // Initialize user state from localStorage on component mount
  useEffect(() => {
    console.log('🚀 UserProvider mounted, initializing...')
    loadUserStateFromStorage()
  }, [loadUserStateFromStorage])

  // Function to set user data and save to localStorage
  const handleSetUser = useCallback((userData: User | null) => {
    console.log('🎯 handleSetUser called with:', userData);
    
    setUserState(userData)
    
    if (userData) {
      try {
        // FIX: Bu satır yorum satırıydı, düzelttik
        localStorage.setItem("user", JSON.stringify(userData))
        console.log('💾 User data saved to localStorage')
        
        // Auto-select first driving school if user has schools and none is currently active
        if (userData.drivingSchools && userData.drivingSchools.length > 0 && !activeDrivingSchool) {
          const firstSchool = userData.drivingSchools[0]
          const schoolInfo = { id: firstSchool.id, name: firstSchool.name }
          setActiveDrivingSchoolState(schoolInfo)
          localStorage.setItem("activeDrivingSchool", JSON.stringify(schoolInfo))
          console.log('🏫 Auto-selected first driving school:', schoolInfo)
        }
      } catch (error) {
        console.error('💥 Error saving user data to localStorage:', error)
      }
    } else {
      console.log('🗑️ Clearing user data from localStorage')
      localStorage.removeItem("user")
      localStorage.removeItem("activeDrivingSchool")
      setActiveDrivingSchoolState(null)
    }
  }, [activeDrivingSchool])

  // Function to set active driving school
  const handleSetActiveDrivingSchool = useCallback((schoolId: number): void => {
    console.log('🏫 Setting active driving school ID:', schoolId)
    
    if (!user?.drivingSchools) {
      console.warn('⚠️ No driving schools available for user')
      return
    }
    
    const selectedSchool = user.drivingSchools.find(school => school.id === schoolId)
    if (selectedSchool) {
      const schoolInfo = { id: selectedSchool.id, name: selectedSchool.name }
      setActiveDrivingSchoolState(schoolInfo)
      try {
        localStorage.setItem("activeDrivingSchool", JSON.stringify(schoolInfo))
        console.log('✅ Active driving school set:', schoolInfo)
      } catch (error) {
        console.error('💥 Error saving active driving school to localStorage:', error)
      }
    } else {
      console.warn('⚠️ Driving school not found with ID:', schoolId)
    }
  }, [user])

  // Function to clear all user data
  const handleClearUserData = useCallback(() => {
    console.log('🗑️ Clearing all user data')
    
    setUserState(null)
    setActiveDrivingSchoolState(null)
    
    try {
      localStorage.removeItem("user")
      localStorage.removeItem("activeDrivingSchool")
      localStorage.removeItem("token")
      localStorage.removeItem("userRole")
      console.log('✅ All user data cleared')
    } catch (error) {
      console.error('💥 Error clearing localStorage:', error)
    }
  }, [])

  // Expose loadUserStateFromStorage as refreshUserFromStorage
  const handleRefreshUserFromStorage = useCallback(() => {
    console.log('🔄 Manual refresh requested')
    setIsLoading(true)
    loadUserStateFromStorage()
  }, [loadUserStateFromStorage])

  // Debug logging for state changes
  useEffect(() => {
    console.log('📊 User state changed:', user ? `User ID: ${user.id}, Email: ${user.email}` : 'null')
  }, [user])

  useEffect(() => {
    console.log('📊 Loading state changed:', isLoading)
  }, [isLoading])

  useEffect(() => {
    console.log('📊 Active driving school changed:', activeDrivingSchool)
  }, [activeDrivingSchool])

  const value = {
    user,
    isLoading,
    activeDrivingSchool,
    setUser: handleSetUser,
    setActiveDrivingSchool: handleSetActiveDrivingSchool,
    clearUserData: handleClearUserData,
    refreshUserFromStorage: handleRefreshUserFromStorage,
  }

  return (
    <UserProviderContext.Provider value={value}>
      {children}
    </UserProviderContext.Provider>
  )
}

// Custom hook to use the user context
export const useUser = () => {
  const context = useContext(UserProviderContext)

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }

  return context
}

// Keep the original export for backward compatibility
export const drivingSchoolOwnerContext = useUser
