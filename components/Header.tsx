
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { ROLES, NAVIGATION_LINKS } from '../constants';
import { Role } from '../types';

const Header = ({ toggleSidebar }) => {
  const { currentUser, logout, viewAsRole, setViewAsRole, registerBiometrics } = useAuth();
  const { clients, documents, entries, products } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
            setIsSearchActive(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    let currentLink = NAVIGATION_LINKS.find(link => link.path === location.pathname);
    if (!currentLink) {
        currentLink = NAVIGATION_LINKS.find(link => location.pathname.startsWith(link.path) && link.path !== '/');
    }
    return currentLink ? currentLink.label : 'Dashboard';
  };

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowerQuery = searchQuery.toLowerCase();

    const clientResults = clients
        .filter(c => c.name.toLowerCase().includes(lowerQuery))
        .map(c => ({ type: 'Client', label: c.name, id: c.id, path: '/clients' }));
    
    const docResults = documents
        .filter(d => d.documentNumber.toLowerCase().includes(lowerQuery))
        .map(d => ({ type: 'Invoice', label: d.documentNumber, id: d.id, path: '/invoice-history' }));

    const entryResults = entries
        .filter(e => e.code.toLowerCase().includes(lowerQuery))
        .map(e => ({ type: 'Entry', label: `Entry #${e.code}`, id: e.id, path: '/entries' }));

    const productResults = products
        .filter(p => p.modelName.toLowerCase().includes(lowerQuery) || p.reference.toLowerCase().includes(lowerQuery) || p.description.toLowerCase().includes(lowerQuery))
        .map(p => ({ type: 'Product', label: `${p.modelName} (${p.reference})`, id: p.id, path: '/products' }));

    return [...clientResults, ...docResults, ...entryResults, ...productResults].slice(0, 10);
  }, [searchQuery, clients, documents, entries, products]);

  const handleResultClick = (result) => {
      setSearchQuery('');
      setIsSearchActive(false);
      let stateToPass = {};
      if (result.type === 'Invoice') {
          stateToPass = { openDocumentId: result.id };
      } else if (result.type === 'Entry') {
          stateToPass = { openEntryId: result.id };
      }
      navigate(result.path, { state: stateToPass });
  };
  
  const handleRoleSwitch = (e) => {
      const role = e.target.value;
      setViewAsRole(role === 'null' ? null : role);
  };

  const handleRegisterBiometrics = async () => {
      await registerBiometrics();
  };

  const typeColors = {
    Client: 'bg-blue-500',
    Invoice: 'bg-green-500',
    Entry: 'bg-yellow-500',
    Product: 'bg-purple-500',
  };

  return (
    <header className="bg-[var(--component-bg)] shadow-lg p-4 flex justify-between items-center relative z-20 gap-4">
      <div className="flex items-center">
         <button onClick={toggleSidebar} className="lg:hidden mr-4 text-[var(--text-accent)] p-1 rounded-md hover:bg-[var(--rose-gold-base)]/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>
        <h2 className="text-2xl font-semibold text-[var(--text-accent)] hidden sm:block">{getPageTitle()}</h2>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-lg" ref={searchRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
            </div>
            <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchActive(true)}
                className="w-full pl-10 pr-4 py-2 rounded-lg"
            />
            {isSearchActive && searchResults.length > 0 && (
                <div className="absolute mt-2 w-full bg-[var(--charcoal-dark)] border border-[var(--border-color)] rounded-lg shadow-2xl overflow-hidden">
                    <ul>
                        {searchResults.map(result => (
                            <li key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result)}
                                className="p-3 hover:bg-[var(--rose-gold-base)]/20 cursor-pointer flex justify-between items-center transition-colors"
                            >
                                <span className="text-white">{result.label}</span>
                                <span className={`text-xs text-white px-2 py-0.5 rounded-full ${typeColors[result.type]}`}>
                                    {result.type}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
      </div>

      {currentUser && (
        <div className="flex items-center space-x-4">
          {currentUser.role === Role.ADMIN && (
              <div className="relative hidden xl:block">
                  <select
                      onChange={handleRoleSwitch}
                      value={viewAsRole ?? 'null'}
                      className="no-custom-arrow appearance-none bg-[var(--charcoal-dark)] border border-gray-600 text-[var(--text-primary)] text-sm rounded-lg focus:ring-[var(--rose-gold-base)] focus:border-[var(--rose-gold-base)] block w-full p-2 pr-8"
                  >
                      <option value={'null'}>View as Admin</option>
                      <option value={Role.MANAGER}>View as Manager</option>
                      <option value={Role.USER}>View as User</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-secondary)]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
              </div>
          )}
          <div className="text-right hidden md:block">
            <p className="font-semibold text-[var(--text-primary)]">{currentUser.fullName}</p>
            <p className="text-sm text-[var(--text-secondary)]">{ROLES[currentUser.role]}</p>
          </div>
          <button
            onClick={handleRegisterBiometrics}
            className="btn-3d secondary sm flex items-center"
            title="Register this device for biometric login"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.5 13.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM6 10a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zM6 13a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zM10 15a1 1 0 01-1-1h.01a1 1 0 110-2H9a1 1 0 110-2h1.01a1 1 0 110 2H10a1 1 0 01-1 1zM14 10a1 1 0 01-1-1h.01a1 1 0 110-2H13a1 1 0 110-2h1.01a1 1 0 110 2H14a1 1 0 01-1 1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={logout}
            className="btn-3d primary"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
