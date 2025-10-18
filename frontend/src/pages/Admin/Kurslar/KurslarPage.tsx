import React, { useState, useEffect } from 'react';
import { DrivingSchool } from '@/services/api-service';
import {
  KursFormModal,
  KursCard,
  KursTable,
  KursToolbar,
  KursDetailDialog,
  DeleteConfirmDialog,
  ErrorAlert,
  LoadingSpinner,
  EmptyState
} from './components';
import {
  useKurslar,
  useResponsive,
  useKursFilter
} from './hooks';
import type { EditFormData } from './kurslar.types';

const KurslarPage: React.FC = () => {
  // Custom hooks
  const {
    kurslar,
    loading,
    error,
    owners,
    managers,
    cities,
    districts,
    fetchKurslar,
    fetchOwnersAndManagers,
    fetchCitiesAndDistricts,
    createKurs,
    updateKurs,
    deleteKurs,
    getOwnerName,
    getManagerName
  } = useKurslar();

  const { isMobile } = useResponsive();
  const { filterText, setFilterText, filteredKurslar } = useKursFilter(kurslar, owners, managers);

  // Local state for modals and forms
  const [modalError, setModalError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [kursToDelete, setKursToDelete] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<DrivingSchool | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [currentKursId, setCurrentKursId] = useState<string>("");
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    address: '',
    phone: '',
    owner_id: '',
    manager_id: '',
    city_id: '',
    district_id: '',
    subscription_type: 'demo',
    subscription_duration: 'monthly',
    subscription_ends_at: ''
  });

  // Initialize data on component mount
  useEffect(() => {
    fetchKurslar();
    fetchOwnersAndManagers();
    fetchCitiesAndDistricts();
  }, [fetchKurslar, fetchOwnersAndManagers, fetchCitiesAndDistricts]);

  // Event handlers
  const handleRefresh = () => {
    fetchKurslar(true);
  };

  const handleEdit = (id: string): void => {
    const kurs = kurslar.find(k => k.id === id);
    if (kurs) {
      setCurrentKursId(id);
      setEditForm({
        name: kurs.name || '',
        address: kurs.address || '',
        phone: kurs.phone || '',
        owner_id: kurs.owner_id ? kurs.owner_id.toString() : '',
        manager_id: kurs.manager_id ? kurs.manager_id.toString() : '',
        city_id: kurs.city_id ? kurs.city_id.toString() : '',
        district_id: kurs.district_id ? kurs.district_id.toString() : '',
        subscription_type: kurs.subscription?.type || 'demo',
        subscription_duration: 'monthly', // Not used in edit mode
        subscription_ends_at: kurs.subscription?.ends_at ? new Date(kurs.subscription.ends_at).toISOString().split('T')[0] : ''
      });
      setModalError(null);
      setIsEditOpen(true);
    }
  };

  const handleAdd = (): void => {
    setEditForm({
      name: '',
      address: '',
      phone: '',
      owner_id: '',
      manager_id: '',
      city_id: '',
      district_id: '',
      subscription_type: 'demo',
      subscription_duration: 'monthly',
      subscription_ends_at: ''
    });
    setModalError(null);
    setIsAddOpen(true);
  };

  const handleViewDetails = (kurs: DrivingSchool): void => {
    setDetailView(kurs);
  };

  const confirmDelete = (id: string): void => {
    setKursToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!kursToDelete) return;
    
    const success = await deleteKurs(kursToDelete);
    if (success) {
      setShowDeleteConfirm(false);
      setKursToDelete(null);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { name: string; value: string | number }): void => {
    const name = 'name' in e ? e.name : e.target.name;
    const value = 'value' in e ? e.value : e.target.value;
    
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (modalError) {
      setModalError(null);
    }
  };

  const validateForm = (formData: EditFormData): string | null => {
    if (!formData.name || !formData.address || !formData.phone) {
      return 'Lütfen tüm zorunlu alanları doldurun.';
    }
    
    if (!formData.owner_id || !formData.manager_id) {
      return 'Kurs sahibi ve yönetici alanları zorunludur.';
    }

    if (!formData.subscription_type) {
      return 'Abonelik türü seçimi zorunludur.';
    }

    // If editing, check for end date
    if (formData.subscription_ends_at === undefined && !formData.subscription_duration) {
      return 'Abonelik süresi veya bitiş tarihi belirtilmelidir.';
    }

    return null;
  };

  const saveEdit = async (): Promise<void> => {
    const validationError = validateForm(editForm);
    if (validationError) {
      setModalError(validationError);
      return;
    }

    if (!currentKursId) return;

    const success = await updateKurs(currentKursId, editForm);
    if (success) {
      setIsEditOpen(false);
      setCurrentKursId("");
      setModalError(null);
    }
  };

  const saveNewKurs = async (): Promise<void> => {
    const validationError = validateForm(editForm);
    if (validationError) {
      setModalError(validationError);
      return;
    }

    const success = await createKurs(editForm);
    if (success) {
      setIsAddOpen(false);
      setModalError(null);
    }
  };

  // Loading state
  if (loading && kurslar.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Sürücü Kursları</h2>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error && kurslar.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Sürücü Kursları</h2>
        </div>
        <ErrorAlert error={error} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Sürücü Kursları</h2>
      </div>

      {/* Error Alert */}
      {error && (
        <ErrorAlert error={error} />
      )}

      {/* Toolbar */}
      <KursToolbar
        filterText={filterText}
        onFilterChange={setFilterText}
        onRefresh={handleRefresh}
        onAdd={handleAdd}
        loading={loading}
      />

      {/* Loading Spinner */}
      {loading && <LoadingSpinner />}

      {/* Content */}
      {!loading && (
        <>
          {filteredKurslar.length === 0 ? (
            <EmptyState filterText={filterText} />
          ) : (
            <>
              {/* Mobile view - Cards */}
              {isMobile && (
                <div className="space-y-4">
                  {filteredKurslar.map((kurs) => (
                    <KursCard
                      key={kurs.id}
                      kurs={kurs}
                      onViewDetails={handleViewDetails}
                      onEdit={handleEdit}
                      onDelete={confirmDelete}
                      getOwnerName={getOwnerName}
                      getManagerName={getManagerName}
                    />
                  ))}
                </div>
              )}

              {/* Desktop view - Table */}
              {!isMobile && (
                <KursTable
                  kurslar={filteredKurslar}
                  onEdit={handleEdit}
                  onDelete={confirmDelete}
                  getOwnerName={getOwnerName}
                  getManagerName={getManagerName}
                  filterText={filterText}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Modals */}
      <KursFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={saveEdit}
        title="Kurs Düzenle"
        isEdit={true}
        formData={editForm}
        onChange={handleFormChange}
        owners={owners}
        managers={managers}
        cities={cities}
        districts={districts}
        error={modalError}
      />

      <KursFormModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={saveNewKurs}
        title="Yeni Kurs Ekle"
        isEdit={false}
        formData={editForm}
        onChange={handleFormChange}
        owners={owners}
        managers={managers}
        cities={cities}
        districts={districts}
        error={modalError}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        loading={loading}
      />

      <KursDetailDialog
        kurs={detailView}
        isOpen={!!detailView}
        onClose={() => setDetailView(null)}
        onEdit={handleEdit}
        onDelete={confirmDelete}
        getOwnerName={getOwnerName}
        getManagerName={getManagerName}
      />
    </div>
  );
};

export default KurslarPage;
