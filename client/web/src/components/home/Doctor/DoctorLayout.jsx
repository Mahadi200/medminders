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
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-64 bg-gradient-to-b from-blue-800 to-blue-600 text-white shadow-lg"
          >
            <div className="p-4 flex items-center justify-between border-b border-blue-700">
              <div className="flex items-center space-x-2">
                <FaUserMd className="text-2xl" />
                <h1 className="text-xl font-bold">Dr. Dashboard</h1>
              </div>
              <button 
                onClick={toggleSidebar}
                className="p-1 rounded-full hover:bg-blue-700 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            <nav className="p-4 space-y-2">
              {sidebarItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </motion.button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <FaBars className="text-xl" />
            </button>
            
            <div className="flex items-center space-x-4">
              <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                <MdNotifications className="text-xl text-gray-600" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
              </button>
              
              <div className="flex items-center space-x-2">
                <img 
                  src="https://randomuser.me/api/portraits/women/44.jpg" 
                  alt="Doctor" 
                  className="w-8 h-8 rounded-full border-2 border-blue-500"
                />
                <span className="font-medium">Dr. Sarah</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <AnimatePresence mode='wait'>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children || <DashboardContent activeTab={activeTab} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;