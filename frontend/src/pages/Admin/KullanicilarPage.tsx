import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Pencil, Trash2, Eye } from "lucide-react";

// Kullanıcı tipi tanımlaması
type User = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'instructor' | 'staff';
  status: 'active' | 'inactive';
  lastLogin: string;
};

// Sahte kullanıcı verileri
const fakeUsers: User[] = [
  {
    id: 1,
    name: "Ahmet Yılmaz",
    email: "ahmet@mtsk.com",
    role: "admin",
    status: "active",
    lastLogin: "2025-04-28 09:45:23"
  },
  {
    id: 2,
    name: "Ayşe Kaya",
    email: "ayse@mtsk.com",
    role: "manager",
    status: "active",
    lastLogin: "2025-04-29 14:30:12"
  },
  {
    id: 3,
    name: "Mehmet Demir",
    email: "mehmet@mtsk.com",
    role: "instructor",
    status: "active",
    lastLogin: "2025-04-27 08:15:38"
  },
  {
    id: 4,
    name: "Fatma Şahin",
    email: "fatma@mtsk.com",
    role: "staff",
    status: "inactive",
    lastLogin: "2025-04-20 16:22:05"
  }
];

const KullanicilarTable: React.FC = () => {
  const navigate = useNavigate();
  const [users] = useState<User[]>(fakeUsers);

  // Rol metni formatlaması
  const formatRole = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Yönetici';
      case 'instructor': return 'Eğitmen';
      case 'staff': return 'Personel';
      default: return role;
    }
  };

  // Kullanıcı detaylarını görüntüleme
  const handleViewUser = (id: number) => {
    console.log("Kullanıcı detayları görüntüleniyor:", id);
    navigate(`/admin/kullanici-detay/${id}`);
  };

  // Kullanıcı düzenleme
  const handleEditUser = (id: number) => {
    console.log("Kullanıcı düzenleniyor:", id);
  };

  // Kullanıcı silme
  const handleDeleteUser = (id: number) => {
    console.log("Kullanıcı siliniyor:", id);
  };

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-6">Kullanıcılar</h1>
      
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Kullanıcı Listesi</CardTitle>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Yeni Kullanıcı
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead className="hidden md:table-cell">Rol</TableHead>
                  <TableHead className="hidden md:table-cell">Durum</TableHead>
                  <TableHead className="hidden md:table-cell">Son Giriş</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatRole(user.role)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.lastLogin}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleViewUser(user.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleEditUser(user.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-red-500" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KullanicilarTable;
