import { Role, EntryStatus, PaymentStatus } from '../types';
import { generateId } from './helpers';
import { SPECIAL_CLIENT_NAME } from '../constants';

export const getInitialUsers = () => [
  { id: 'user-1', username: 'hanif@hawlader.eu', password: 'password', role: Role.ADMIN, fullName: 'Hanif Hawlader' },
  { id: 'user-2', username: 'johurul@hawlader.eu', password: 'password', role: Role.USER, fullName: 'Johurul Hawlader' },
  { id: 'user-3', username: 'asad@hawlader.eu', password: 'password', role: Role.USER, fullName: 'Asad Hawlader' },
];

export const getInitialClients = () => [
  { id: 'client-1', name: SPECIAL_CLIENT_NAME, address: 'CALLE ALDECOA, 10 28945,FUENLABRADA(MADRID),ESPAÑA', email: 'austral@central.es', phone: '671038221', vatNumber: 'B83199121', logoUrl: '' },
  { id: 'client-2', name: 'Client Beta', address: 'Gulshan, Dhaka', email: 'beta@example.com', phone: '01700000002', vatNumber: 'VAT67890', logoUrl: '' },
];

export const getInitialProducts = () => [
  { id: 'prod-1', code: 'TS-001', modelName: 'Polo Shirt', price: 500, category: 'Shirt', reference: 'REF-P1', description: 'Cotton Polo Shirt', clientId: 'client-2' },
  { id: 'prod-2', code: 'JN-001', modelName: 'Denim Jeans', price: 1200, category: 'Pants', reference: 'REF-J1', description: 'Slim Fit Denim', clientId: 'client-1' },
  { id: 'prod-3', code: 'HD-001', modelName: 'Fleece Hoodie', price: 900, category: 'Hoodie', reference: 'REF-H1', description: 'Winter Fleece Hoodie' },
];

export const getInitialEntries = (clients, products, users) => [
  {
    id: generateId(),
    code: '1',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    clientId: clients[0].id,
    whoInput: 'user@textile.com', // Generic user for initial data
    status: EntryStatus.DELIVERED,
    items: [
      { id: generateId(), productId: products[0].id, productRef: products[0].reference, description: products[0].description, sizeQuantities: { 'S': 50, 'M': 50 } },
    ],
  },
  {
    id: generateId(),
    code: '2',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    clientId: clients[1].id,
    whoInput: 'user@textile.com',
    status: EntryStatus.IN_PROCESS,
    items: [
      { id: generateId(), productId: products[1].id, productRef: products[1].reference, description: products[1].description, sizeQuantities: { 'M': 100, 'L': 50 } },
      { id: generateId(), productId: products[2].id, productRef: products[2].reference, description: products[2].description, sizeQuantities: { 'M': 75 } },
    ],
  },
  {
    id: generateId(),
    code: '3',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    clientId: clients[0].id,
    whoInput: 'user@textile.com',
    status: EntryStatus.RECEIVED,
    items: [
      { id: generateId(), productId: products[0].id, productRef: products[0].reference, description: products[0].description, sizeQuantities: { 'L': 200, 'XL': 100 } },
    ],
  },
];

export const getInitialDocuments = () => {
    // Helper to create a date X months ago
    const getDate = (monthsAgo, daysAgo = 0) => {
        const date = new Date();
        date.setMonth(date.getMonth() - monthsAgo);
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
    };

    const sampleDoc = (id, client, date, total, status, type = 'Factura') => {
        const payments = [];
        if (status === PaymentStatus.PAID) {
            payments.push({ amount: total, date, method: 'Bank Transfer' });
        }
        
        // Add a partial payment for one of the overdue invoices for demonstration
        if (id === '5') {
            payments.push({ amount: 5000, date: getDate(2, 10), method: 'Bank Transfer' });
        }
        
        return ({
            id: `doc-${id}`,
            documentNumber: `FAC-2024-00${id}`,
            documentType: type,
            clientId: client,
            date: date,
            entryIds: [],
            items: [], // Simplified for chart demonstration
            subtotal: total / 1.21,
            surcharges: [],
            taxRate: 21,
            taxAmount: total - (total / 1.21),
            total: total,
            paymentStatus: status,
            payments,
        });
    };
    
    return [
        // Current Year Data
        sampleDoc('1', 'client-1', getDate(0, 10), 12500, PaymentStatus.PAID),
        sampleDoc('2', 'client-2', getDate(0, 5), 8200, PaymentStatus.PENDING),
        sampleDoc('3', 'client-1', getDate(1, 15), 22000, PaymentStatus.PAID),
        sampleDoc('4', 'client-2', getDate(1, 2), 4500, PaymentStatus.PAID),
        sampleDoc('5', 'client-1', getDate(2, 20), 15300, PaymentStatus.PENDING), // This will be overdue and partially paid
        sampleDoc('6', 'client-1', getDate(2, 1), 9800, PaymentStatus.PAID),
        sampleDoc('7', 'client-2', getDate(3, 18), 11200, PaymentStatus.PAID),
        sampleDoc('8', 'client-1', getDate(4, 5), 19500, PaymentStatus.PENDING), // This will be overdue

        // Last Year Data for comparison
        sampleDoc('9', 'client-1', getDate(12, 10), 11000, PaymentStatus.PAID),
        sampleDoc('10', 'client-2', getDate(12, 5), 7500, PaymentStatus.PAID),
        sampleDoc('11', 'client-1', getDate(13, 15), 18000, PaymentStatus.PAID),
        sampleDoc('12', 'client-2', getDate(13, 2), 4000, PaymentStatus.PAID),
        sampleDoc('13', 'client-1', getDate(14, 20), 14000, PaymentStatus.PAID),
    ];
};


export const getInitialCompanyDetails = () => ({
    name: 'My Textile Ltd.',
    address: '123, Industrial Area, Dhaka, Bangladesh',
    phone: '+880 2 12345678',
    email: 'contact@mytextile.com',
    vatNumber: 'BIN123456789',
    logoUrl: ''
});