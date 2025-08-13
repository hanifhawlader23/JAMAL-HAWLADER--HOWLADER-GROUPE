
import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { CompanyDetails, User, Client, Product, Entry, Delivery, Document, Role } from '../types';
import { useAuth } from '../hooks/useAuth.tsx';
import { AppLoadingScreen } from '../components/AppLoadingScreen';

export const DataContext = createContext(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, setCurrentUser } = useAuth();
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);

  const fetchData = useCallback(async () => {
    setIsAppLoading(true);
    setConnectionError(null);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) {
        throw new Error(`Failed to fetch data: ${res.statusText}`);
      }
      const data = await res.json();
      setUsers(data.users || []);
      setClients(data.clients || []);
      
      // Prices from the DB can be strings, so we parse them to numbers here.
      const parsedProducts = (data.products || []).map((p: any) => ({
          ...p,
          price: parseFloat(p.price) || 0,
      }));
      setProducts(parsedProducts);

      setEntries(data.entries || []);
      setDeliveries(data.deliveries || []);
      setDocuments(data.documents || []);
      setCompanyDetails(data.companyDetails || { name: '', address: '', phone: '', email: '', vatNumber: '', logoUrl: '' });
      // Update current user with fresh data from DB
      if (data.currentUser) {
          setCurrentUser(data.currentUser);
      }

    } catch (err: any) {
      setConnectionError(err.message);
      console.error(err);
    } finally {
      setIsAppLoading(false);
    }
  }, [setCurrentUser]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setIsAppLoading(false);
    }
  }, [isAuthenticated, fetchData]);
  
  const handleApiCall = async (resource: string, action: string, payload?: any) => {
      const res = await fetch(`/api/${resource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'API call failed');
      }
      return await res.json();
  };

  const crudOperations = (resource: string, setData: Function) => ({
      add: async (data: any) => {
          const newItem = await handleApiCall(resource, 'create', data);
          setData((prev: any[]) => [...prev, newItem]);
          return newItem;
      },
      update: async (id: string, updates: any) => {
          const updatedItem = await handleApiCall(resource, 'update', { id, ...updates });
          setData((prev: any[]) => prev.map(item => item.id === id ? updatedItem : item));
      },
      delete: async (id: string) => {
          await handleApiCall(resource, 'delete', { id });
          setData((prev: any[]) => prev.filter(item => item.id !== id));
      }
  });

  const userOps = crudOperations('users', setUsers);
  const clientOps = crudOperations('clients', setClients);
  const productOps = crudOperations('products', setProducts);
  const entryOps = crudOperations('entries', setEntries);
  const deliveryOps = crudOperations('deliveries', setDeliveries);
  const documentOps = crudOperations('documents', setDocuments);
  
  const updateCompanyDetails = async (details: CompanyDetails) => {
    const updatedDetails = await handleApiCall('company', 'update', details);
    setCompanyDetails(updatedDetails);
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
