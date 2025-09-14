export interface ServiceType {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  order?: number;
}

export interface ServiceTypeCatalog {
  serviceTypes: ServiceType[];
}

export type ServiceTypeFormData = Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;
