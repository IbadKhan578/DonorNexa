import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ title, actions }) {
  const { user } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'DN';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-[#E0DACF] px-8 flex items-center justify-between flex-shrink-0">
      <h2 className="text-xl font-semibold leading-7 text-[#1B1A18] font-sans">
        {title}
      </h2>

      <div className="flex items-center gap-4">
        {actions && <div className="flex items-center gap-3">{actions}</div>}

        <div className="flex items-center gap-1 text-[#524E47] cursor-pointer hover:text-[#1B1A18] relative">
          <Bell className="w-[18px] h-[18px]" />
          <span className="bg-[#B3202A] text-white text-[11px] font-semibold w-4 h-4 rounded-full flex items-center justify-center absolute -top-1.5 -right-2">
            3
          </span>
        </div>

        {user && (
          <span className="av sm ml-2">
            {getInitials(user.name)}
          </span>
        )}
      </div>
    </header>
  );
}
