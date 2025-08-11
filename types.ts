
export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

export enum EntryStatus {
  RECEIVED = 'Recibida',
  IN_PROCESS = 'En Proceso',
  DELIVERED = 'Entregada',
  PRE_INVOICED = 'Prefacturado',
  INVOICED = 'Facturado',
}

export enum PaymentStatus {
  PAID = 'Paid',
  PENDING = 'Pending',
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
  fullName: string;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  vatNumber: string;
  logoUrl: string;
}

export interface Product {
    id: string;
    code: string;
    modelName: string;
    price: number;
    category: string;
    reference: string;
    description: string;
    clientId?: string;
}

export interface EntryItem {
    id: string;
    productId: string;
    productRef: string;
    description: string;
    sizeQuantities: { [size: string]: number };
    optionalRef1?: string;
    optionalRef2?: string;
    imageUrl?: string;
}

export interface Entry {
    id: string;
    code: string;
    date: string;
    clientId: string;
    whoInput: string;
    status: EntryStatus;
    items: EntryItem[];
    invoiceId?: string;
}

export interface DeliveryItem {
    entryId: string;
    entryItemId: string;
    productId: string;
    sizeQuantities: { [size: string]: number };
}

export interface Delivery {
    id: string;
    entryCode: string;
    deliveryDate: string;
    whoDelivered: string;
    items: DeliveryItem[];
}

export interface DocumentItem {
    productId: string;
    description: string;
    unitPrice: number;
    total: number;
    entryCode: string;
    reference: string;
    orderedQty: number;
    deliveredQty: number;
    pendingQty: number;
    lastDeliveryDate?: string;
    status: EntryStatus;
}

export interface Surcharge {
    reason: string;
    amount: number;
}

export interface Payment {
    amount: number;
    date: string;
    method: string;
    notes?: string;
}

export interface Document {
    id: string;
    documentNumber: string;
    documentType: string;
    clientId: string;
    date: string;
    entryIds: string[];
    items: DocumentItem[];
    subtotal: number;
    surcharges: Surcharge[];
    taxRate: number;
    taxAmount: number;
    total: number;
    paymentStatus: PaymentStatus;
    payments: Payment[];
    invoicePeriodStart?: string;
    invoicePeriodEnd?: string;
    // For UI state
    derivedStatus?: 'Paid' | 'Pending' | 'Overdue';
    amountPaid?: number;
    amountDue?: number;
}


export interface CompanyDetails {
    name: string;
    address: string;
    phone: string;
    email: string;
    vatNumber: string;
    logoUrl: string;
}
