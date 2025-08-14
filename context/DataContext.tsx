
import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { CompanyDetails, User, Client, Product, Entry, Delivery, Document, Role } from '../types';
import { useAuth } from '../hooks/useAuth.tsx';
import { AppLoadingScreen } from '../components/AppLoadingScreen';
import { generateMockData } from '../lib/mockData';

export const DataContext = createContext(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, setCurrentUser } = useAuth();
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Initialize with mock data
  const mockData = generateMockData();
  const [users, setUsers] = useState<User[]>(mockData.users);
  const [clients, setClients] = useState<Client[]>(mockData.clients);
  const [products, setProducts] = useState<Product[]>(mockData.products);
  const [entries, setEntries] = useState<Entry[]>(mockData.entries);
  const [deliveries, setDeliveries] = useState<Delivery[]>(mockData.deliveries);
  const [documents, setDocuments] = useState<Document[]>(mockData.documents);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(mockData.companyDetails);

  const fetchData = useCallback(() => {
    setIsAppLoading(true);
    setConnectionError(null);
    // Simulate loading time
    setTimeout(() => {
      setIsAppLoading(false);
    }, 500);
  }, [setCurrentUser]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setIsAppLoading(false);
    }
  }, [isAuthenticated, fetchData]);
  
  // Generate unique ID
  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const crudOperations = (setData: Function) => ({
      add: async (data: any) => {
          const newItem = { ...data, id: generateId() };
          setData((prev: any[]) => [...prev, newItem]);
          return newItem;
      },
      update: async (id: string, updates: any) => {
          const updatedItem = { ...updates, id };
          setData((prev: any[]) => prev.map(item => item.id === id ? { ...item, ...updates } : item));
          return updatedItem;
      },
      delete: async (id: string) => {
          setData((prev: any[]) => prev.filter(item => item.id !== id));
      }
  });

  const userOps = crudOperations(setUsers);
  const clientOps = crudOperations(setClients);
  const productOps = crudOperations(setProducts);
  const entryOps = crudOperations(setEntries);
  const deliveryOps = crudOperations(setDeliveries);
  const documentOps = crudOperations(setDocuments);
  
  const updateCompanyDetails = async (details: CompanyDetails) => {
    setCompanyDetails(details);
    return details;
  };
  
  const value = {
    users,
    clients,
    products,
    entries,
    deliveries,
    documents,
    companyDetails,
    addUser: userOps.add,
    updateUser: userOps.update,
    deleteUser: userOps.delete,
    addClient: clientOps.add,
    updateClient: clientOps.update,
    deleteClient: clientOps.delete,
    addProduct: productOps.add,
    updateProduct: productOps.update,
    deleteProduct: productOps.delete,
    addEntry: entryOps.add,
    updateEntry: entryOps.update,
    deleteEntry: entryOps.delete,
    addDelivery: deliveryOps.add,
    addDocument: documentOps.add,
    updateDocument: documentOps.update,
    deleteDocument: documentOps.delete,
    updateCompanyDetails,
    isAppLoading,
    connectionError,
    refreshData: fetchData,
  };

  return (
    <DataContext.Provider value={value}>
      {isAppLoading && isAuthenticated ? <AppLoadingScreen /> : children}
    </DataContext.Provider>
  );
};
