import { useState, useEffect } from 'react';
import { DrivingSchool } from '@/services/api-service';
import { UI_CONFIG } from '../kurslar.consts';

export const useKursFilter = (kurslar: DrivingSchool[], owners: any[], managers: any[]) => {
  const [filterText, setFilterText] = useState<string>("");
  const [filteredKurslar, setFilteredKurslar] = useState<DrivingSchool[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const getOwnerEmail = (owner_id: string | number | null | undefined): string => {
    if (!owner_id) return "";
    const id = owner_id.toString();
    const owner = owners.find(o => o.id === id);
    return owner && owner.email ? owner.email : "";
  };

  const getManagerEmail = (manager_id: string | number | null | undefined): string => {
    if (!manager_id) return "";
    const id = manager_id.toString();
    const manager = managers.find(m => m.id === id);
    return manager && manager.email ? manager.email : "";
  };

  useEffect(() => {
    if (filterText.trim() === '') {
      setFilteredKurslar(kurslar);
    } else {
      const searchTerm = filterText.toLowerCase();
      const filtered = kurslar.filter(kurs =>
        (kurs.name && kurs.name.toLowerCase().includes(searchTerm)) ||
        (kurs.address && kurs.address.toLowerCase().includes(searchTerm)) ||
        (kurs.phone && kurs.phone.toLowerCase().includes(searchTerm)) ||
        (getOwnerEmail(kurs.owner_id).toLowerCase().includes(searchTerm)) ||
        (getManagerEmail(kurs.manager_id).toLowerCase().includes(searchTerm))
      );
      setFilteredKurslar(filtered);
    }
    // Reset to first page whenever filter changes
    setCurrentPage(1);
  }, [kurslar, filterText, owners, managers]);

  const pageSize = UI_CONFIG.ITEMS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filteredKurslar.length / pageSize));
  const paginatedKurslar = filteredKurslar.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return {
    filterText,
    setFilterText,
    filteredKurslar,
    paginatedKurslar,
    currentPage,
    totalPages,
    setCurrentPage,
  };
};
