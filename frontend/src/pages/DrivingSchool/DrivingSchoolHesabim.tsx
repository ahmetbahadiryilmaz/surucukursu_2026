// pages/DrivingSchool/DrivingSchoolHesabim.tsx
import { useState, useEffect } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Sun, Moon, Monitor, Save, CheckCircle } from "lucide-react";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api-service";

// Simulation types from global enums
export enum SimulationType {
  SESIM = 'sesim',
  ANA_GRUP = 'ana_grup'
}

export default function DrivingSchoolHesabim() {
  const { theme, setTheme } = useTheme();
  const { activeDrivingSchool } = drivingSchoolOwnerContext();
  const { toast } = useToast();
  
  const [simulatorType, setSimulatorType] = useState<SimulationType | undefined>(undefined);
  const [preferences, setPreferences] = useState({
    studentNotifications: true,
    lessonReminders: true,
    examAlerts: true,
    marketingEmails: false,
    systemUpdates: true,
    autoScheduling: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      if (!activeDrivingSchool?.id) return;

      try {
        setIsLoading(true);
        const settings = await apiService.drivingSchool.getSettings(String(activeDrivingSchool.id));
        if (settings.simulator_type) {
          setSimulatorType(settings.simulator_type as SimulationType);
        }
        
        setPreferences({
          studentNotifications: settings.student_notifications ?? true,
          lessonReminders: settings.lesson_reminders ?? true,
          examAlerts: settings.exam_alerts ?? true,
          marketingEmails: settings.marketing_emails ?? false,
          systemUpdates: settings.system_updates ?? true,
          autoScheduling: settings.auto_scheduling ?? false,
        });
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({
          title: "Hata",
          description: "Ayarlar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [activeDrivingSchool?.id, toast]);

  // Save all settings to backend
  const handleSaveSettings = async () => {
    if (!activeDrivingSchool?.id) return;

    try {
      setIsSaving(true);
      await apiService.drivingSchool.updateSettings(String(activeDrivingSchool.id), {
        simulator_type: simulatorType,
        student_notifications: preferences.studentNotifications,
        lesson_reminders: preferences.lessonReminders,
        exam_alerts: preferences.examAlerts,
        marketing_emails: preferences.marketingEmails,
        system_updates: preferences.systemUpdates,
        auto_scheduling: preferences.autoScheduling,
      });

      toast({
        title: "Başarılı",
        description: "Ayarlar başarıyla kaydedildi.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full pb-16 pt-6 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <header className="mb-10">
          <div>
            <h1 className="text-3xl font-bold">Sürücü Kursu Ayarları</h1>
            <p className="text-muted-foreground mt-1">Sürücü kursu yönetici paneli ayarları</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Simülatör Ayarları
              </CardTitle>
              <CardDescription>
                Kurumunuzda kullanılan simülatör sistemini belirtin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Simülatör Tipi</label>
                  <Select
                    value={simulatorType}
                    onValueChange={(value) => setSimulatorType(value as SimulationType)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Simülatör tipi seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SimulationType.SESIM}>
                        Sesim
                      </SelectItem>
                      <SelectItem value={SimulationType.ANA_GRUP}>
                        Ana Grup
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    Seçilen simülatör tipine göre raporlama ve takip sistemi ayarlanacaktır.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Tema Ayarları
              </CardTitle>
              <CardDescription>
                Mevcut tema tercihiniz yerel depolamada kaydedilir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Aktif Tema</p>
                    <p className="text-sm text-muted-foreground">
                      {theme === "system" 
                        ? "Sistem tercihi (cihaz ayarlarını takip eder)"
                        : theme === "light" 
                        ? "Açık mod"
                        : "Koyu mod"}
                    </p>
                  </div>
                  <div className={`h-6 w-6 rounded-full ${
                    theme === "light" 
                      ? "bg-yellow-400" 
                      : theme === "dark" 
                      ? "bg-slate-800 border border-slate-600" 
                      : "bg-gradient-to-r from-yellow-400 to-slate-800"
                  }`}></div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Tema Seçin</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="flex items-center gap-2"
                    >
                      <Sun className="h-4 w-4" />
                      Açık
                    </Button>
                    
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="flex items-center gap-2"
                    >
                      <Moon className="h-4 w-4" />
                      Koyu
                    </Button>
                    
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                      className="flex items-center gap-2"
                    >
                      <Monitor className="h-4 w-4" />
                      Sistem
                    </Button>
                  </div>
                </div>         
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Bildirim Tercihleri</CardTitle>
              <CardDescription>
                Bildirim tercihlerinizi yönetin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="studentNotifications"
                    checked={preferences.studentNotifications}
                    onChange={(e) => setPreferences({...preferences, studentNotifications: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={isLoading}
                  />
                  <label htmlFor="studentNotifications" className="text-sm font-medium">
                    Öğrenci bildirimleri
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="lessonReminders"
                    checked={preferences.lessonReminders}
                    onChange={(e) => setPreferences({...preferences, lessonReminders: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={isLoading}
                  />
                  <label htmlFor="lessonReminders" className="text-sm font-medium">
                    Ders hatırlatmaları
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="examAlerts"
                    checked={preferences.examAlerts}
                    onChange={(e) => setPreferences({...preferences, examAlerts: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={isLoading}
                  />
                  <label htmlFor="examAlerts" className="text-sm font-medium">
                    Sınav uyarıları
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="systemUpdates"
                    checked={preferences.systemUpdates}
                    onChange={(e) => setPreferences({...preferences, systemUpdates: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={isLoading}
                  />
                  <label htmlFor="systemUpdates" className="text-sm font-medium">
                    Sistem güncellemeleri
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoScheduling"
                    checked={preferences.autoScheduling}
                    onChange={(e) => setPreferences({...preferences, autoScheduling: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={isLoading}
                  />
                  <label htmlFor="autoScheduling" className="text-sm font-medium">
                    Otomatik program oluşturma
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSaving || isLoading || !activeDrivingSchool?.id}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Ayarları Kaydet
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

 
      </div>
    </div>
  );
}
