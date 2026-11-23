import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import {
  LayoutDashboard,
  ClipboardList,
  History,
  Award,
  User,
  ShieldCheck,
  Building2,
  Users,
  FileText,
  Settings,
  PlusCircle,
  Package,
  MapPin,
  LogOut,
  Radio
} from 'lucide-react';

export default function Sidebar() {
  const { user, donorProfile, hospitalProfile, logout, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'DN';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside className="w-[248px] bg-white border-r border-[#E0DACF] p-[20px_8px_16px] flex flex-col gap-1 flex-shrink-0 min-h-screen">
      <div className="px-3 pb-5">
        <Logo linkTo="/" />
      </div>

      <div className="flex-1 flex flex-col gap-1">
        {/* Donor Nav */}
        {role === 'donor' && (
          <>
            <NavLink
              to="/donor/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <LayoutDashboard className="w-[18px] h-[18px]" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/donor/matches"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <ClipboardList className="w-[18px] h-[18px]" />
              <span>Matched requests</span>
            </NavLink>

            <NavLink
              to="/donor/history"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <History className="w-[18px] h-[18px]" />
              <span>Donation history</span>
            </NavLink>

            <NavLink
              to="/donor/badges"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <Award className="w-[18px] h-[18px]" />
              <span>Badges</span>
            </NavLink>

            <NavLink
              to="/donor/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <User className="w-[18px] h-[18px]" />
              <span>Profile</span>
            </NavLink>
          </>
        )}

        {/* Hospital Nav */}
        {role === 'hospital' && (
          <>
            <NavLink
              to="/hospital/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <LayoutDashboard className="w-[18px] h-[18px]" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/hospital/requests"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <ClipboardList className="w-[18px] h-[18px]" />
              <span>Blood requests</span>
            </NavLink>

            <NavLink
              to="/hospital/requests/new"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <PlusCircle className="w-[18px] h-[18px]" />
              <span>New request</span>
            </NavLink>

            <NavLink
              to="/hospital/inventory"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <Package className="w-[18px] h-[18px]" />
              <span>Inventory</span>
            </NavLink>

            <NavLink
              to="/hospital/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <Building2 className="w-[18px] h-[18px]" />
              <span>Hospital profile</span>
            </NavLink>
          </>
        )}

        {/* Admin Nav */}
        {role === 'admin' && (
          <>
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <LayoutDashboard className="w-[18px] h-[18px]" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/admin/verification"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <ShieldCheck className="w-[18px] h-[18px]" />
              <span>Verification</span>
            </NavLink>

            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <Users className="w-[18px] h-[18px]" />
              <span>Users</span>
            </NavLink>

            <NavLink
              to="/admin/requests"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <ClipboardList className="w-[18px] h-[18px]" />
              <span>All requests</span>
            </NavLink>

            <NavLink
              to="/admin/audit"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <FileText className="w-[18px] h-[18px]" />
              <span>Audit log</span>
            </NavLink>

            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <Settings className="w-[18px] h-[18px]" />
              <span>Settings</span>
            </NavLink>

            <NavLink
              to="/admin/cities"
              className={({ isActive }) =>
                `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                    : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
                }`
              }
            >
              <MapPin className="w-[18px] h-[18px]" />
              <span>Cities & provinces</span>
            </NavLink>
          </>
        )}

        {/* Public Emergencies board link */}
        <div className="pt-2 border-t border-[#E0DACF] mt-2">
          <NavLink
            to="/emergencies"
            className={({ isActive }) =>
              `flex items-center gap-3 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#FBE8E5] text-[#7A141B] font-semibold'
                  : 'text-[#524E47] hover:bg-[#F6F3EE] hover:text-[#1B1A18]'
              }`
            }
          >
            <Radio className="w-[18px] h-[18px] text-[#B3202A]" />
            <span>Public board</span>
          </NavLink>
        </div>
      </div>

      {/* User profile footer */}
      {user && (
        <div className="me mt-auto pt-3 border-t border-[#E0DACF] flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="av">
              {getInitials(user.name)}
            </span>
            <div className="min-w-0">
              <b className="truncate block text-xs font-semibold text-[#1B1A18]">
                {user.name}
              </b>
              <small className="truncate block text-[11px] text-[#6F6A61]">
                {role === 'donor'
                  ? `Donor · ${donorProfile?.blood_group || ''}`
                  : role === 'hospital'
                  ? 'Hospital'
                  : 'Platform admin'}
              </small>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-[#6F6A61] hover:text-[#B3202A] p-1.5 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
