

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../firebase'; // Using Firebase now
import { collection, onSnapshot, doc, addDoc, setDoc, deleteDoc, DocumentData } from 'firebase/firestore';
import { getInitialCompanyDetails } from '../lib/initialData';
import { CompanyDetails, User, Client, Product, Entry, Delivery, Document } from '../types';

export const DataContext = createContext(undefined);

export const AppLoadingScreen = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[var(--page-bg)] text-white">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[var(--rose-gold-base)]"></div>
    <p className="mt-4 text-xl">Loading application data from Cloud...</p>
  </div>
);


export const DataProvider = ({ children }: { children: ReactNode }) => {
  // --- Using React's useState instead of useIndexedDB ---
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(getInitialCompanyDetails());
  
  const [loadingStatus, setLoadingStatus] = useState({
    users: true,
    clients: true,
    products: true,
    entries: true,
    deliveries: true,
    documents: true,
    companyDetails: true,
  });

  // --- Real-time data fetching from Firestore ---
  useEffect(() => {
    const collectionsToLoad = [
        { name: 'users', setter: setUsers },
        { name: 'clients', setter: setClients },
        { name: 'products', setter: setProducts },
        { name: 'entries', setter: setEntries },
        { name: 'deliveries', setter: setDeliveries },
        { name: 'documents', setter: setDocuments },
    ];

    const unsubscribes = collectionsToLoad.map(({ name, setter }) => {
      return onSnapshot(collection(db, name), (querySnapshot) => {
        const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setter(data as any);
        setLoadingStatus(prev => ({ ...prev, [name]: false }));
      }, (error) => {
          console.error(`Error loading collection ${name}:`, error);
          setLoadingStatus(prev => ({ ...prev, [name]: false })); // Stop loading even on error
      });
    });

    // For companyDetails (single document)
    const unsubDetails = onSnapshot(doc(db, "app_config", "companyDetails"), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setCompanyDetails(docSnapshot.data() as CompanyDetails);
      } else {
        // If it doesn't exist in Firestore, maybe set it with the initial data
        setDoc(doc(db, "app_config", "companyDetails"), getInitialCompanyDetails());
      }
      setLoadingStatus(prev => ({ ...prev, companyDetails: false }));
    }, (error) => {
        console.error(`Error loading companyDetails:`, error);
        setLoadingStatus(prev => ({ ...prev, companyDetails: false }));
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      unsubDetails();
    };
  }, []);

  // --- Firestore Data Manipulation Functions ---

  const addUser = async (user: Omit<User, 'id'>) => {
    return await addDoc(collection(db, 'users'), user);
  };
  const updateUser = async (id: string, updates: Partial<User>) => { await setDoc(doc(db, 'users', id), updates, { merge: true }); };
  const deleteUser = async (id: string) => { await deleteDoc(doc(db, 'users', id)); };
  
  const addClient = async (client: Omit<Client, 'id'>) => { await addDoc(collection(db, 'clients'), client); };
  const updateClient = async (id: string, updates: Partial<Client>) => { await setDoc(doc(db, 'clients', id), updates, { merge: true }); };
  const deleteClient = async (id: string) => { await deleteDoc(doc(db, 'clients', id)); };
  
  const addProduct = async (product: Omit<Product, 'id'>) => { await addDoc(collection(db, 'products'), product); };
  const updateProduct = async (id: string, updates: Partial<Product>) => { await setDoc(doc(db, 'products', id), updates, { merge: true }); };
  const deleteProduct = async (id: string) => { await deleteDoc(doc(db, 'products', id)); };

  const addEntry = async (entry: Omit<Entry, 'id'>) => { await addDoc(collection(db, 'entries'), entry); };
  const updateEntry = async (id: string, updates: Partial<Entry>) => { await setDoc(doc(db, 'entries', id), updates, { merge: true }); };
  const deleteEntry = async (id: string) => { await deleteDoc(doc(db, 'entries', id)); };

  const addDelivery = async (delivery: Omit<Delivery, 'id'>) => { await addDoc(collection(db, 'deliveries'), delivery); };

  const addDocument = async (documentData: Omit<Document, 'id'>) => {
    const newDocRef = await addDoc(collection(db, 'documents'), documentData);
    return { id: newDocRef.id, ...documentData } as Document;
  };
  const updateDocument = async (id: string, updates: Partial<Document>) => { await setDoc(doc(db, 'documents', id), updates, { merge: true }); };
  const deleteDocument = async (id: string) => { await deleteDoc(doc(db, 'documents', id)); };

  const updateCompanyDetails = async (details: CompanyDetails) => {
    await setDoc(doc(db, "app_config", "companyDetails"), details);
  };

  const isAppLoading = Object.values(loadingStatus).some(status => status === true);

  const value = {
    users,
    clients,
    products,
    entries,
    deliveries,
    documents,
    companyDetails,
    addUser,
    updateUser,
    deleteUser,
    addClient,
    updateClient,
    deleteClient,
    addProduct,
    updateProduct,
    deleteProduct,
    addEntry,
    updateEntry,
    deleteEntry,
    addDelivery,
    addDocument,
    updateDocument,
    deleteDocument,
    updateCompanyDetails,
    isAppLoading // Expose loading state
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};