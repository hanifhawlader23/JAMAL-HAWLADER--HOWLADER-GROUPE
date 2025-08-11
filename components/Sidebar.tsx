import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { NAVIGATION_LINKS } from '../constants';

const Sidebar = ({ isSidebarOpen, closeSidebar }) => {
  const { hasRole } = useAuth();

  const handleLinkClick = () => {
    // Only close if it's in mobile view (i.e., the sidebar is not permanently visible)
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  return (
    <div className={`w-64 bg-[var(--component-bg)] text-[var(--text-primary)] flex flex-col border-r border-[var(--border-color)] fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-4 border-b border-[var(--border-color)]">
        <h1 className="text-3xl font-bold text-center tracking-wider text-white">HAWLDER</h1>
      </div>
      <nav className="flex-grow p-2">
        <ul>
          {NAVIGATION_LINKS.map(link =>
            hasRole(link.roles) && (
              <li key={link.path} className="mb-2">
                <NavLink
                  to={link.path}
                  onClick={handleLinkClick}
                  className={({ isActive }) => 
                    `sidebar-link-3d ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="mr-3 text-xl">{link.icon}</span>
                  <span>{link.label}</span>
                </NavLink>
              </li>
            )
          )}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;