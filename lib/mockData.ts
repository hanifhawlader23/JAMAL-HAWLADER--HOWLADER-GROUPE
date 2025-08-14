import { User, Client, Product, Entry, Delivery, Document, CompanyDetails, Role, EntryStatus, PaymentStatus } from '../types';

export const generateMockData = () => {
  const users: User[] = [
    {
      id: '1',
      username: 'admin@hawlader.eu',
      role: Role.ADMIN,
      fullName: 'Admin Hawlader'
    },
    {
      id: '2',
      username: 'hanif@hawlader.eu',
      role: Role.ADMIN,
      fullName: 'Hanif Hawlader'
    },
    {
      id: '3',
      username: 'user@hawlader.eu',
      role: Role.USER,
      fullName: 'Demo User'
    }
  ];

  const clients: Client[] = [
    {
      id: 'client-1',
      name: 'AUSTRAL SPORT S.A.',
      address: 'Av. Industrial 123, Barcelona, Spain',
      email: 'contact@australsport.com',
      phone: '+34 93 123 4567',
      vatNumber: 'ESB12345678',
      logoUrl: ''
    },
    {
      id: 'client-2',
      name: 'Fashion Retail Ltd.',
      address: '456 Fashion Street, London, UK',
      email: 'orders@fashionretail.co.uk',
      phone: '+44 20 7123 4567',
      vatNumber: 'GB123456789',
      logoUrl: ''
    },
    {
      id: 'client-3',
      name: 'Urban Threads Co.',
      address: '789 Urban Ave, New York, NY',
      email: 'info@urbanthreads.com',
      phone: '+1 212 555 0123',
      vatNumber: 'US123456789',
      logoUrl: ''
    }
  ];

  const products: Product[] = [
    {
      id: 'prod-1',
      code: 'TSH001',
      modelName: 'Classic Cotton T-Shirt',
      price: 15.50,
      category: 'T-Shirts',
      reference: 'CC-TSH-001',
      description: 'Premium cotton t-shirt with reinforced seams',
      clientId: 'client-1'
    },
    {
      id: 'prod-2',
      code: 'HOD001',
      modelName: 'Sport Hoodie',
      price: 45.00,
      category: 'Hoodies',
      reference: 'SP-HOD-001',
      description: 'Comfortable sport hoodie with kangaroo pocket',
      clientId: 'client-1'
    },
    {
      id: 'prod-3',
      code: 'JEA001',
      modelName: 'Slim Fit Jeans',
      price: 85.00,
      category: 'Jeans',
      reference: 'SF-JEA-001',
      description: 'Modern slim fit jeans in dark wash',
      clientId: 'client-2'
    },
    {
      id: 'prod-4',
      code: 'DRS001',
      modelName: 'Summer Dress',
      price: 65.00,
      category: 'Dresses',
      reference: 'SM-DRS-001',
      description: 'Light summer dress with floral pattern',
      clientId: 'client-3'
    }
  ];

  const entries: Entry[] = [
    {
      id: 'entry-1',
      code: 'E2025001',
      date: '2025-01-10T08:00:00Z',
      clientId: 'client-1',
      whoInput: 'Admin Hawlader',
      status: EntryStatus.DELIVERED,
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productRef: 'CC-TSH-001',
          description: 'Classic Cotton T-Shirt',
          sizeQuantities: { 'S': 50, 'M': 100, 'L': 80, 'XL': 30 },
          optionalRef1: 'REF001',
          optionalRef2: '',
          imageUrl: ''
        }
      ]
    },
    {
      id: 'entry-2',
      code: 'E2025002',
      date: '2025-01-12T09:30:00Z',
      clientId: 'client-1',
      whoInput: 'Hanif Hawlader',
      status: EntryStatus.IN_PROCESS,
      items: [
        {
          id: 'item-2',
          productId: 'prod-2',
          productRef: 'SP-HOD-001',
          description: 'Sport Hoodie',
          sizeQuantities: { 'S': 25, 'M': 50, 'L': 40, 'XL': 15 },
          optionalRef1: '',
          optionalRef2: '',
          imageUrl: ''
        }
      ]
    },
    {
      id: 'entry-3',
      code: 'E2025003',
      date: '2025-01-14T14:15:00Z',
      clientId: 'client-2',
      whoInput: 'Admin Hawlader',
      status: EntryStatus.RECEIVED,
      items: [
        {
          id: 'item-3',
          productId: 'prod-3',
          productRef: 'SF-JEA-001',
          description: 'Slim Fit Jeans',
          sizeQuantities: { '28': 20, '30': 35, '32': 40, '34': 25 },
          optionalRef1: '',
          optionalRef2: '',
          imageUrl: ''
        }
      ]
    }
  ];

  const deliveries: Delivery[] = [
    {
      id: 'delivery-1',
      entryCode: 'E2025001',
      deliveryDate: '2025-01-15T10:00:00Z',
      whoDelivered: 'Admin Hawlader',
      items: [
        {
          entryId: 'entry-1',
          entryItemId: 'item-1',
          productId: 'prod-1',
          sizeQuantities: { 'S': 50, 'M': 100, 'L': 80, 'XL': 30 }
        }
      ]
    },
    {
      id: 'delivery-2',
      entryCode: 'E2025002',
      deliveryDate: '2025-01-16T11:30:00Z',
      whoDelivered: 'Hanif Hawlader',
      items: [
        {
          entryId: 'entry-2',
          entryItemId: 'item-2',
          productId: 'prod-2',
          sizeQuantities: { 'S': 15, 'M': 30, 'L': 25, 'XL': 10 }
        }
      ]
    }
  ];

  const documents: Document[] = [
    {
      id: 'doc-1',
      documentNumber: 'FA-0001',
      documentType: 'Factura',
      clientId: 'client-1',
      date: '2025-01-15T00:00:00Z',
      entryIds: ['entry-1'],
      items: [
        {
          productId: 'prod-1',
          description: 'Classic Cotton T-Shirt',
          unitPrice: 15.50,
          total: 4030.00,
          entryCode: 'E2025001',
          reference: 'CC-TSH-001',
          orderedQty: 260,
          deliveredQty: 260,
          pendingQty: 0,
          lastDeliveryDate: '2025-01-15T10:00:00Z',
          status: EntryStatus.DELIVERED
        }
      ],
      subtotal: 4030.00,
      surcharges: [],
      taxRate: 21.00,
      taxAmount: 846.30,
      total: 4876.30,
      paymentStatus: PaymentStatus.PAID,
      payments: [
        {
          amount: 4876.30,
          date: '2025-01-16T00:00:00Z',
          method: 'Bank Transfer',
          notes: 'Payment received in full'
        }
      ]
    }
  ];

  const companyDetails: CompanyDetails = {
    name: 'HAWLDER Textile Manufacturing',
    address: 'Carrer de la Industria 25, Barcelona, Spain',
    phone: '+34 93 456 7890',
    email: 'info@hawlder.com',
    vatNumber: 'ESB87654321',
    logoUrl: ''
  };

  return {
    users,
    clients,
    products,
    entries,
    deliveries,
    documents,
    companyDetails
  };
};