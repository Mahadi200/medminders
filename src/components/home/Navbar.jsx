import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser, FaBars, FaTimes, FaHeartbeat,
  FaMicroscope, FaDna, FaFlask, FaUserMd,
  FaUserInjured, FaHospital, FaPills
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import logo from '/public/image/logo.png';

const MedicalPortalModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleOptionClick = (option) => {
    switch(option) {
      case 'Doctor': navigate('/DoctorAuth'); break;
      case 'Patient': navigate('/patient-login'); break;
      case 'Hospital': navigate('/hospital-login'); break;
      case 'Pharmacy': navigate('/pharmacy-login'); break;
      default: break;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Select Your Role
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[{
                icon: <FaUserMd className="text-blue-600 text-3xl mb-2" />, 
                label: 'As Doctor', 
                color: 'blue', 
                role: 'Doctor'
              }, {
                icon: <FaUserInjured className="text-green-600 text-3xl mb-2" />, 
                label: 'As Patient', 
                color: 'green', 
                role: 'Patient'
              }, {
                icon: <FaHospital className="text-purple-600 text-3xl mb-2" />, 
                label: 'As Hospital', 
                color: 'purple', 
                role: 'Hospital'
              }, {
                icon: <FaPills className="text-orange-600 text-3xl mb-2" />, 
                label: 'Pharmacy', 
                color: 'orange', 
                role: 'Pharmacy'
              }].map((item) => (
                <motion.button
                  key={item.role}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center justify-center p-4 bg-${item.color}-50 rounded-lg border border-${item.color}-100 hover:bg-${item.color}-100 transition-all`}
                  onClick={() => handleOptionClick(item.role)}
                >
                  {item.icon}
                  <span className={`text-${item.color}-800 font-medium`}>{item.label}</span>
                </motion.button>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const MobileMenu = ({ isOpen, onClose, openPortal }) => {
  const navItems = [
    { name: 'Home', path: '/', icon: <FaHeartbeat className="text-xl" /> },
    { name: 'About', path: '/about', icon: <FaMicroscope className="text-xl" /> },
    { name: 'Services', path: '/service', icon: <FaDna className="text-xl" /> },
    { name: 'Contact', path: '/contact', icon: <FaFlask className="text-xl" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-40 bg-white"
        >
          <div className="flex flex-col h-full p-6">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center">
                <img src={logo} alt="Logo" className="h-10 mr-3" />
                <span className="text-xl font-bold">MedMinders</span>
              </div>
              <button onClick={onClose} className="p-2">
                <FaTimes className="text-gray-500 text-xl" />
              </button>
            </div>

            <nav className="flex-1 space-y-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="flex items-center p-3 text-lg font-medium text-gray-800 hover:bg-gray-100 rounded-lg"
                  onClick={onClose}
                >
                  <span className="mr-4">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
              
              <button
                onClick={() => {
                  onClose();
                  openPortal();
                }}
                className="w-full flex items-center p-3 text-lg font-medium text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                <span className="mr-4"><FaUser className="text-xl" /></span>
                Portal Access
              </button>
            </nav>

            <div className="mt-auto pt-6 border-t border-gray-200">
              <p className="text-gray-500 text-sm text-center">
                © {new Date().getFullYear()} MedMinders
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Navbar = () => {
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Home', path: '/', icon: <FaHeartbeat className="mr-2" /> },
    { name: 'About', path: '/about', icon: <FaMicroscope className="mr-2" /> },
    { name: 'Services', path: '/service', icon: <FaDna className="mr-2" /> },
    { name: 'Contact', path: '/contact', icon: <FaFlask className="mr-2" /> },
  ];

  return (
    <>
      <nav className="bg-gradient-to-r from-blue-50 via-red-50 to-white h-[10vh] shadow-lg sticky top-0 z-30 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            <Link to="/" className="flex items-center h-full">
              <img 
                src={logo} 
                alt="MediMinders Logo" 
                className="h-12 w-auto mr-3 rounded-xl"
              />
              <span className="text-2xl font-bold text-gray-800">
                Med<span className="text-blue-600">Minders</span>
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6 h-full">
              {navItems.map((item) => (
                <Link 
                  key={item.name} 
                  to={item.path} 
                  className="text-gray-800 hover:text-blue-600 flex items-center text-lg font-semibold transition-colors"
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
              
              <motion.button 
                onClick={() => setIsPortalOpen(true)} 
                whileHover={{ scale: 1.05 }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center text-lg font-semibold"
              >
                <FaUser className="mr-2" /> 
                Portal
              </motion.button>
            </div>

            <div className="flex md:hidden items-center space-x-4">
              <button 
                onClick={() => setIsPortalOpen(true)}
                className="p-2 text-gray-800 hover:text-blue-600"
              >
                <FaUser className="h-6 w-6" />
              </button>
              
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-gray-800 hover:text-blue-600 focus:outline-none"
              >
                <FaBars className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        openPortal={() => setIsPortalOpen(true)}
      />
      
      <MedicalPortalModal 
        isOpen={isPortalOpen} 
        onClose={() => setIsPortalOpen(false)} 
      />
    </>
  );
};

export default Navbar;