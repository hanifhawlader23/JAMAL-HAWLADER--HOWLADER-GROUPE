


import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { db } from '../firebase'; // Using Firebase now
import { collection, onSnapshot, doc, addDoc, setDoc, deleteDoc, DocumentData } from 'firebase/firestore';
import { getInitialCompanyDetails } from '../lib/initialData';
import { CompanyDetails, User, Client, Product, Entry, Delivery, Document } from '../types';
import { useToast } from '../hooks/useToast';

export const DataContext = createContext(undefined);

export const AppLoadingScreen = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[var(--page-bg)] text-white">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[var(--rose-gold-base)]"></div>
    <p className="mt-4 text-xl">Loading application data from Cloud...</p>
  </div>
);

export const ConnectionErrorScreen = ({ error }: { error: string }) => (
    <div className="flex flex-col items-center justify-center h-screen bg-[var(--page-bg)] text-white p-4 sm:p-8">
        <div className="text-6xl mb-4" role="img" aria-label="Disconnected Plug">🔌</div>
        <h1 className="text-3xl font-bold text-red-400 mb-2 text-center">Failed to Connect to Database</h1>
        <p className="text-md text-center text-[var(--text-secondary)] max-w-2xl mb-6">
            The application could not establish a connection to the backend. This is common during first-time deployment and is usually a configuration issue, not a bug.
        </p>

        <div className="bg-[var(--component-bg)] p-6 rounded-lg border border-[var(--border-color)] max-w-3xl w-full">
            <h2 className="text-xl font-semibold text-[var(--rose-gold-base)] mb-4">For Administrators: Troubleshooting Steps</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
                The `Firestore: [code=unavailable]` error often points to a configuration issue. Please verify the following in order:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>
                    <strong className="text-white">Environment Variables:</strong> On your deployment service (e.g., Vercel, Netlify), ensure you have set all the `VITE_FIREBASE_*` environment variables from your project's configuration. The application code now reads these variables to connect to Firebase.
                </li>
                <li>
                    <strong className="text-white">Authorized Domains:</strong> Go to <strong className="text-white">Firebase Console → Authentication → Settings → Authorized domains</strong>. Add your deployment URL (e.g., <code className="bg-black/50 px-1 py-0.5 rounded">your-app.vercel.app</code>).
                </li>
                <li>
                    <strong className="text-white">API Key Restrictions:</strong> In <strong className="text-white">Google Cloud Console → APIs & Services → Credentials</strong>, check your API key's <strong className="text-white">Application restrictions</strong>. If using `HTTP referrers`, add your deployment URL.
                </li>
            </ol>
        </div>

        <button
            onClick={() => window.location.reload()}
            className="mt-8 btn-3d primary"
        >
            Retry Connection
        </button>
        
        <p className="text-xs text-gray-500 mt-6 max-w-3xl text-center">
            <strong>Original Error:</strong> {error}
        </p>
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const { addToast } = useToast();
  const hasLoadedAnyData = useRef(false);

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

    const handleSuccess = (querySnapshot: DocumentData, setter: Function, name: string) => {
        if (!querySnapshot.empty) {
            hasLoadedAnyData.current = true;
        }
        const data = querySnapshot.docs.map((d: DocumentData) => ({ id: d.id, ...d.data() }));
        setter(data as any);
        setLoadingStatus(prev => ({ ...prev, [name]: false }));

        if (!querySnapshot.metadata.fromCache && isOffline) {
            setIsOffline(false);
            addToast('Connection restored. You are back online!', 'success');
        }
    };
    
    const handleError = (error: any, name: string) => {
        console.error(`Error loading ${name}:`, error);
        if (error.code === 'unavailable') {
            if (hasLoadedAnyData.current) {
                if (!isOffline) {
                    setIsOffline(true);
                    addToast("Connection lost. Operating in offline mode.", 'warning');
                }
            } else if (!connectionError) {
                // The ConnectionErrorScreen component now contains the detailed troubleshooting steps.
                // We just pass the raw error for display.
                setConnectionError(error.message);
            }
        }
        setLoadingStatus(prev => ({ ...prev, [name.replace('collection ', '')]: false }));
    };

    const unsubscribes = collectionsToLoad.map(({ name, setter }) => {
      return onSnapshot(
        collection(db, name), 
        (snapshot) => handleSuccess(snapshot, setter, name),
        (error) => handleError(error, `collection ${name}`)
      );
    });

    // For companyDetails (single document)
    const unsubDetails = onSnapshot(doc(db, "app_config", "companyDetails"), (docSnapshot) => {
      if (docSnapshot.exists()) {
        hasLoadedAnyData.current = true;
        setCompanyDetails(docSnapshot.data() as CompanyDetails);
      } else {
        // If it doesn't exist in Firestore, maybe set it with the initial data
        setDoc(doc(db, "app_config", "companyDetails"), getInitialCompanyDetails());
      }
      setLoadingStatus(prev => ({ ...prev, companyDetails: false }));
       if (!docSnapshot.metadata.fromCache && isOffline) {
          setIsOffline(false);
          // Toast is handled by collection listeners to avoid duplicates
      }
    }, (error) => {
        handleError(error, "companyDetails");
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      unsubDetails();
    };
  }, [connectionError, isOffline]);

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
    isAppLoading, // Expose loading state
    connectionError,
    isOffline,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};