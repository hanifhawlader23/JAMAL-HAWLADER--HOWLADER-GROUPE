import { Role, EntryStatus } from './types';

export const COLORS = {
  ROSE_GOLD_BASE: 'var(--rose-gold-base)',
  LIGHT_ROSE_GOLD: 'var(--light-rose-gold)',
  METALLIC_ROSE: 'var(--metallic-rose)',
  WARM_BEIGE: 'var(--warm-beige)',
  DEEP_ROSE: 'var(--deep-rose)',
  SOFT_BLUSH: 'var(--soft-blush)',
};

export const ROLES = {
  [Role.ADMIN]: 'Admin',
  [Role.MANAGER]: 'Manager',
  [Role.USER]: 'User',
};

export const STATUS_STYLES = {
  [EntryStatus.RECEIVED]: { background: '#3b82f6', color: '#ffffff' }, // Blue
  [EntryStatus.IN_PROCESS]: { background: '#f97316', color: '#ffffff' }, // Orange
  [EntryStatus.DELIVERED]: { background: '#22c55e', color: '#ffffff' }, // Green
  [EntryStatus.PRE_INVOICED]: { background: '#a855f7', color: '#ffffff' }, // Purple
  [EntryStatus.INVOICED]: { background: '#6b7280', color: '#ffffff' }, // Gray
};


export const SIZES = ['2', '4', '6', '8', '10', '12', '14', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL'];

export const SPECIAL_CLIENT_NAME = 'AUSTRAL SPORT S.A.';

export const NAVIGATION_LINKS = [
  { path: '/', label: 'Dashboard', icon: '🏠', roles: [Role.ADMIN, Role.MANAGER, Role.USER] },
  { path: '/entries', label: 'All Entries', icon: '📦', roles: [Role.ADMIN, Role.MANAGER, Role.USER] },
  { path: '/entries/pending', label: 'Faltas de Entrega', icon: '⏳', roles: [Role.ADMIN, Role.MANAGER, Role.USER] },
  { path: '/entries/delivered', label: 'Entregada', icon: '🚚', roles: [Role.ADMIN, Role.MANAGER, Role.USER] },
  { path: '/entries/pre-invoiced', label: 'Prefacturado', icon: '🧾', roles: [Role.ADMIN, Role.MANAGER, Role.USER] },
  { path: '/invoice-workbench', label: 'Invoice Workbench', icon: '🛠️', roles: [Role.ADMIN] },
  { path: '/invoice-history', label: 'Invoice History', icon: '📜', roles: [Role.ADMIN] },
  { path: '/products', label: 'Product Catalog', icon: '🏷️', roles: [Role.ADMIN] },
  { path: '/clients', label: 'Clients', icon: '👥', roles: [Role.ADMIN] },
  { path: '/company', label: 'Company Details', icon: '🏢', roles: [Role.ADMIN] },
  { path: '/users', label: 'User Management', icon: '👤', roles: [Role.ADMIN] },
];