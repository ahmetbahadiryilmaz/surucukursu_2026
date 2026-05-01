import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { apiService } from "@/services/api-service";

/**
 * Kullanıcı tipi tanımlaması
 */
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
}

/**
 * Düzenleme için kullanıcı tipi - index bilgisi ile
 */
interface EditUserWithIndex extends User {
  index: number;
}

/**
 * Sürücü Kursları Yönetim Bileşeni
 */
const SurucuKurslari = (): JSX.Element => {
  // Temel state değişkenleri
  const [users, setUsers] = useState<Array<User>>([
    { id: "1", name: "Ali Yılmaz", email: "ali@example.com", password: "******", phone: "555-1234" },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog kontrolleri
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editUser, setEditUser] = useState<EditUserWithIndex | null>(null);
  
  // Kullanıcı rolü ve okul ID'si
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Token bulunamadı. Lütfen giriş yapın.");
        }

        const response = await apiService.me();
        setUserRole(response.role || ""); 

        if (response.drivingSchools && response.drivingSchools.length > 0) {
          // Veri yükleme işlemini başlat
          await fetchUserList();
        }
        
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu";
        setError(errorMessage);
        setLoading(false);
      }
    };

    void fetchUserData();
  }, []);

  /**
   * Kullanıcı listesini getir
   */
  const fetchUserList = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Token bulunamadı");
      }
      
      // Örnek API isteği - gerçek projeye göre endpointi değiştirebilirsiniz
      const response = await axios.get(
        `https://test.mtsk.app/api/v1/driving-school/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data) {
        setUsers(response.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu";
      setError(errorMessage);
    }
  };

  /**
   * Kullanıcıyı düzenleme modunu aç
   */
  const handleEdit = (index: number): void => {
    const userToEdit = users[index];
    if (userToEdit) {
      setEditUser({ ...userToEdit, index });
      setEditOpen(true);
    }
  };

  /**
   * Kullanıcı bilgilerini güncelle
   */
  const handleUpdateUser = (): void => {
    if (!editUser) return;
    
    const updatedUsers = users.map((user, index) =>
      index === editUser.index
        ? { 
            id: editUser.id,
            name: editUser.name, 
            email: editUser.email, 
            password: editUser.password, 
            phone: editUser.phone 
          }
        : user
    );
    
    setUsers(updatedUsers);
    setEditOpen(false);
    setEditUser(null);
  };

  // Yükleme durumu
  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  // Hata durumu
  if (error) {
    return <div>Hata: {error}</div>;
  }

  return (
    <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-black">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        Sürücü Kursları
      </h2>

      {userRole === "ADMIN" && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => {}} className="mb-4">
            Yeni Ekle
          </Button>
        </div>
      )}

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>İsim</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length > 0 ? (
            users.map((user, index) => (
              <TableRow key={user.id || index}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(index)}
                    className="flex items-center gap-1"
                  >
                    Düzenle
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
                Veri bulunamadı
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Düzenleme Dialog'u */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">İsim</Label>
            <Input 
              id="name" 
              value={editUser?.name || ""} 
              onChange={(e) => {
                if (editUser) {
                  setEditUser({ ...editUser, name: e.target.value });
                }
              }} 
            />
            
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={editUser?.email || ""} 
              onChange={(e) => {
                if (editUser) {
                  setEditUser({ ...editUser, email: e.target.value });
                }
              }} 
            />
            
            <Label htmlFor="password">Şifre</Label>
            <Input 
              id="password" 
              type="password" 
              value={editUser?.password || ""} 
              onChange={(e) => {
                if (editUser) {
                  setEditUser({ ...editUser, password: e.target.value });
                }
              }} 
            />
            
            <Label htmlFor="phone">Telefon</Label>
            <Input 
              id="phone" 
              value={editUser?.phone || ""} 
              onChange={(e) => {
                if (editUser) {
                  setEditUser({ ...editUser, phone: e.target.value });
                }
              }} 
            />
          </div>
          <Button onClick={handleUpdateUser}>Güncelle</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SurucuKurslari;
