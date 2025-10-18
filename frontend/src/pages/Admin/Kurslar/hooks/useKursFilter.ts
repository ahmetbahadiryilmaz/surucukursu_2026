import { useState, useEffect } from 'react';
import { DrivingSchool } from '@/services/api-service';

export const useKursFilter = (kurslar: DrivingSchool[], owners: any[], managers: any[]) => {
  const [filterText, setFilterText] = useState<string>("");
  const [filteredKurslar, setFilteredKurslar] = useState<DrivingSchool[]>([]);

  const getOwnerName = (owner_id: string | number | null | undefined): string => {
    if (!owner_id) return "-";
    const id = owner_id.toString();
    const owner = owners.find(o => o.id === id);
    return owner ? owner.name : "-";
  };

  const getManagerName = (manager_id: string | number | null | undefined): string => {
    if (!manager_id) return "-";
    const id = manager_id.toString();
    const manager = managers.find(m => m.id === id);
    return manager ? manager.name : "-";
  };

  useEffect(() => {
    if (filterText.trim() === '') {
      setFilteredKurslar(kurslar);
      return;
    }
    
    const searchTerm = filterText.toLowerCase();
    const filtered = kurslar.filter(kurs => 
      (kurs.name && kurs.name.toLowerCase().includes(searchTerm)) ||
      (kurs.address && kurs.address.toLowerCase().includes(searchTerm)) ||
      (kurs.phone && kurs.phone.toLowerCase().includes(searchTerm)) ||
      (getOwnerName(kurs.owner_id).toLowerCase().includes(searchTerm)) ||
      (getManagerName(kurs.manager_id).toLowerCase().includes(searchTerm))
    );
    
    setFilteredKurslar(filtered);
  }, [kurslar, filterText, owners, managers]);

  return {
    filterText,
    setFilterText,
    filteredKurslar
  };
};
