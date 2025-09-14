import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useSnackbar } from 'notistack';
import type { ServiceType } from '../types/catalog';
import type { ServiceTypeFormData } from '../schemas/catalogValidation';

export function useServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Load service types from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'service_types'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📊 Service types snapshot received:', snapshot.size, 'documents');
      const types: ServiceType[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Service type document:', doc.id, data);
        types.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ServiceType);
      });
      console.log('✅ Service types loaded:', types);
      setServiceTypes(types);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading service types:', error);
      enqueueSnackbar('Error al cargar tipos de servicio: ' + error.message, { variant: 'error' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enqueueSnackbar]);

  // Get active service types only
  const getActiveServiceTypes = () => {
    return serviceTypes.filter(type => type.active);
  };

  // Create new service type
  const createServiceType = async (data: ServiceTypeFormData): Promise<string | null> => {
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'service_types'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user', // Replace with actual user ID
      });
      
      enqueueSnackbar('Tipo de servicio creado exitosamente', { variant: 'success' });
      return docRef.id;
    } catch (error) {
      console.error('Error creating service type:', error);
      enqueueSnackbar('Error al crear tipo de servicio', { variant: 'error' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Update service type
  const updateServiceType = async (id: string, data: Partial<ServiceTypeFormData>): Promise<boolean> => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'service_types', id), {
        ...data,
        updatedAt: new Date(),
      });
      
      enqueueSnackbar('Tipo de servicio actualizado exitosamente', { variant: 'success' });
      return true;
    } catch (error) {
      console.error('Error updating service type:', error);
      enqueueSnackbar('Error al actualizar tipo de servicio', { variant: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Delete service type
  const deleteServiceType = async (id: string): Promise<boolean> => {
    setSaving(true);
    try {
      // For now, we'll just mark as inactive instead of deleting
      await updateDoc(doc(db, 'service_types', id), {
        active: false,
        updatedAt: new Date(),
      });
      
      enqueueSnackbar('Tipo de servicio desactivado exitosamente', { variant: 'success' });
      return true;
    } catch (error) {
      console.error('Error deleting service type:', error);
      enqueueSnackbar('Error al eliminar tipo de servicio', { variant: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Reorder service types
  const reorderServiceTypes = async (reorderedTypes: ServiceType[]): Promise<boolean> => {
    setSaving(true);
    try {
      const batch = [];
      for (let i = 0; i < reorderedTypes.length; i++) {
        batch.push(
          updateDoc(doc(db, 'service_types', reorderedTypes[i].id), {
            order: i,
            updatedAt: new Date(),
          })
        );
      }
      
      await Promise.all(batch);
      enqueueSnackbar('Orden actualizado exitosamente', { variant: 'success' });
      return true;
    } catch (error) {
      console.error('Error reordering service types:', error);
      enqueueSnackbar('Error al reordenar tipos de servicio', { variant: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    serviceTypes,
    activeServiceTypes: getActiveServiceTypes(),
    loading,
    saving,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    reorderServiceTypes,
  };
}
