import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaBars, FaUserMd, FaCalendarAlt, FaUserInjured, FaBookMedical, FaHistory, FaCheckCircle, FaClock, FaCog } from 'react-icons/fa';
import { MdDashboard, MdPeople, MdNotifications } from 'react-icons/md';
import DashboardContent from './DashboardContent';

const DoctorLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const sidebarItems = [
    { id: 'dashboard', icon: <MdDashboard />, label: 'Dashboard' },
    { id: 'new-patient', icon: <FaUserInjured />, label: 'New Patient' },
    { id: 'old-patient', icon: <FaHistory />, label: 'Old Patients' },
    { id: 'booking-list', icon: <FaCalendarAlt />, label: 'Bookings' },
    { id: 'confirmed', icon: <FaCheckCircle />, label: 'Confirmed' },
    { id: 'pending', icon: <FaClock />, label: 'Pending' },
    { id: 'patients', icon: <MdPeople />, label: 'All Patients' },
    { id: 'settings', icon: <FaCog />, label: 'Settings' }
  ];

  return (
    <div className="flex h-screen bg-[#F4F8FA] overflow-hidden">
      {/* Sidebar */}
      {isSidebarOpen && (
        <aside className="w-64 bg-[#0A2342] text-white shadow-lg border-r border-[#0F3A66] flex flex-col shrink-0">
          <div className="p-4 flex items-center justify-between border-b border-[#0F3A66]">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-[#028090] flex items-center justify-center text-white">
                <FaUserMd className="text-lg" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">Prescriber Portal</h1>
                <span className="text-[10px] text-[#00A896] block font-mono">BMDC REG: VERIFIED</span>
              </div>
            </div>
            <button 
              onClick={toggleSidebar}
              className="p-1 rounded-full hover:bg-[#0F3A66] text-slate-300 transition-colors"
              aria-label="Close sidebar"
            >
              <FaTimes />
            </button>
          </div>
          
          <nav className="p-4 space-y-1.5 flex-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id ? 'bg-[#028090] text-white shadow-sm' : 'text-slate-300 hover:bg-[#0F3A66] hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white border-b border-slate-200 shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-3">
              <button 
                onClick={toggleSidebar}
                className="p-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Toggle sidebar"
              >
                <FaBars className="text-lg" />
              </button>
              <div className="hidden sm:flex items-center space-x-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>DEMO ENVIRONMENT — Synthetic Prescriber Data</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                aria-label="Notifications"
              >
                <MdNotifications className="text-xl" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#00A896]"></span>
              </button>
              
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-[#0F3A66] text-white flex items-center justify-center font-bold text-xs border border-[#028090]">
                  DR
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-[#0A2342] block">Dr. Sarah Johnson</span>
                  <span className="text-[10px] text-slate-500 block">BMDC #A-58291</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F4F8FA]">
          {children || <DashboardContent activeTab={activeTab} />}
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;