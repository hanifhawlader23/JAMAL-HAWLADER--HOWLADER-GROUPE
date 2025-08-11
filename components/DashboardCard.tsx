
import React from 'react';

const DashboardCard = ({ title, value, icon, color, onClick }: { title: string, value: string | number, icon: string, color: string, onClick?: () => void }) => {
  const cardContent = (
    <>
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] uppercase">{title}</p>
        <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
      </div>
      <div className="text-4xl" style={{ color }}>
        {icon}
      </div>
    </>
  );

  const baseClasses = "bg-[var(--component-bg)] p-6 rounded-lg shadow-lg flex items-center justify-between border-l-4";

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} w-full text-left transition-transform duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--page-bg)] focus:ring-[var(--rose-gold-base)]`}
        style={{ borderColor: color }}
        aria-label={`View details for ${title}`}
      >
        {cardContent}
      </button>
    );
  }
  
  return (
    <div className={baseClasses} style={{ borderColor: color }}>
      {cardContent}
    </div>
  );
};

export default DashboardCard;
