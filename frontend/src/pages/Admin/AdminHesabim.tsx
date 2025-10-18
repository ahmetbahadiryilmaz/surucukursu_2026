// pages/theme-demo.tsx
import { useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Home, User, Bell } from "lucide-react";

export default function ThemeDemoPage() {
  const { theme } = useTheme();
  const [preferences, setPreferences] = useState({
    notifications: true,
    marketing: false,
    updates: true,
  });

  // Save user preferences to localStorage based on current theme
  const savePreferences = () => {
    localStorage.setItem(`preferences-${theme}`, JSON.stringify(preferences));
    alert(`Preferences saved for ${theme} theme!`);
  };

  // Sample content to demonstrate theme switching
  return (
    <div className="min-h-screen w-full pb-16 pt-6 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <header className="mb-10 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Theme Customization</h1>
          <ThemeToggle />
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Current Theme Settings
              </CardTitle>
              <CardDescription>
                Your current theme preference is saved in local storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Selected Theme</p>
                    <p className="text-sm text-muted-foreground">
                      {theme === "system" 
                        ? "System preference (follows your device settings)"
                        : `${theme.charAt(0).toUpperCase() + theme.slice(1)} mode`}
                    </p>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-primary"></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Storage Key</p>
                    <p className="text-sm text-muted-foreground">ui-theme</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Theme-Specific Preferences</CardTitle>
              <CardDescription>
                Save different preferences for each theme mode.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={preferences.notifications}
                  onChange={(e) => setPreferences({...preferences, notifications: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="notifications" className="text-sm font-medium">
                  Enable notifications
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="marketing" className="text-sm font-medium">
                  Receive marketing emails
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="updates"
                  checked={preferences.updates}
                  onChange={(e) => setPreferences({...preferences, updates: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="updates" className="text-sm font-medium">
                  Receive product updates
                </label>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={savePreferences}>Save {theme} preferences</Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-10">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard</CardTitle>
                  <CardDescription>
                    View your dashboard with theme-aware components.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium">Theme Demonstration</h3>
                      <p className="mt-1 text-sm">
                        This page demonstrates how components adapt to your selected theme preference.
                        Try switching between light, dark, and system modes using the toggle in the header.
                      </p>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-md bg-primary/10 p-4">
                        <h4 className="font-medium text-primary">Primary Color</h4>
                        <p className="mt-1 text-sm">This box uses your theme's primary color.</p>
                      </div>
                      
                      <div className="rounded-md bg-secondary/10 p-4">
                        <h4 className="font-medium text-secondary">Secondary Color</h4>
                        <p className="mt-1 text-sm">This box uses your theme's secondary color.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                  <CardDescription>Manage your account settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Account settings would appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Manage your notification preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Notification settings would appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Manage your application settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Application settings would appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
