// User related types
export type UserRole = 'admin' | 'manager' | 'supervisor' | 'technician' | 'finance' | 'client';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientContact {
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

// Client related types
export interface Client {
  id: string;
  name: string;
  businessName?: string;
  taxId?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  contacts?: ClientContact[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  fiscalData?: {
    rfc?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  paymentTerms?: number;
  notes?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Service related types
export type ServiceStatus = 
  | 'Solicitado' 
  | 'En Proceso'
  | 'Visita Técnica'
  | 'En Visita Técnica' 
  | 'Pendiente Cotización'
  | 'Cotización Enviada'
  | 'Cotización Aprobada' 
  | 'Cotización Rechazada'
  | 'Rechazado'
  | 'En Planificación' 
  | 'En Ejecución' 
  | 'Finalizado' 
  | 'Facturado' 
  | 'Pagado';

export interface ServiceStatusHistoryEntry {
  status: ServiceStatus;
  changedAt: Date | any; // Firestore Timestamp
  notes?: string;
  changedBy: string; // UID
}

export interface Service {
  id: string;
  folio: string;
  clientId: string;
  client?: Client; // Populated on the client side
  status: ServiceStatus;
  fscf001_data: {
    // Form data for service request
    [key: string]: any;
  };
  fscf002_data?: {
    // Form data for technical visit
    [key: string]: any;
  };
  statusHistory?: ServiceStatusHistoryEntry[];
  proposalId?: string;
  assignedTeam?: string[]; // Array of user UIDs
  requiresTechnicalVisit?: boolean; // Flag to indicate if service requires technical visit
  createdAt: Date | any; // Firestore Timestamp
  updatedAt: Date | any; // Firestore Timestamp
}

// Proposal related types
export type ProposalStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada';

export interface ProposalItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Proposal {
  id: string;
  serviceId: string;
  version: number;
  costDetails: {
    labor: number;
    equipment: number;
    materials: number;
    other: number;
  };
  items: ProposalItem[];
  totalAmount: number;
  pdfURL?: string;
  status: ProposalStatus;
  notes?: string;
  validityDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Daily Report (RAD) types
export interface DailyReport {
  id: string;
  serviceId: string;
  date: Date;
  progress: {
    hectares: number;
    hours: number;
    description: string;
  };
  consumables: {
    fuel: number;
    fertilizer: number;
    other: string;
  };
  incidents?: string;
  evidenceURLs: string[];
  reportedBy: string; // User UID
  createdAt: Date;
}

// Invoice related types
export type InvoiceStatus = 'Pendiente' | 'Pagada';

export interface Invoice {
  id: string;
  serviceId: string;
  clientId: string;
  invoiceNumber: string;
  amount: number;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  xmlURL?: string;
  pdfURL?: string;
  createdAt: Date;
  updatedAt: Date;
}
