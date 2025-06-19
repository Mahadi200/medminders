import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser, FaBars, FaTimes, FaClinicMedical,
  FaFlask, FaHeartbeat, FaStethoscope,
  FaUserMd, FaUserInjured, FaHospital, FaPills,
  FaSearch, FaBell, FaCog
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';

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
                icon: <FaUserMd className="text-blue-600 text-3xl mb-2" />, label: 'As Doctor', color: 'blue', role: 'Doctor'
              }, {
                icon: <FaUserInjured className="text-green-600 text-3xl mb-2" />, label: 'As Patient', color: 'green', role: 'Patient'
              }, {
                icon: <FaHospital className="text-purple-600 text-3xl mb-2" />, label: 'As Hospital', color: 'purple', role: 'Hospital'
              }, {
                icon: <FaPills className="text-orange-600 text-3xl mb-2" />, label: 'Pharmacy', color: 'orange', role: 'Pharmacy'
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

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const navItems = [
    { name: 'Home', path: '/', icon: <FaHeartbeat className="mr-1" /> },
    { name: 'About', path: '/about', icon: <FaFlask className="mr-1" /> },
    { name: 'Services', path: '/service', icon: <FaStethoscope className="mr-1" /> },
    { name: 'Contact', path: '/contact', icon: <FaClinicMedical className="mr-1" /> },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleSearch = () => setSearchOpen(!searchOpen);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`bg-[radial-gradient(circle_at_top_left,_#A3CCE8,_#F0F6FF)] shadow-xl sticky top-0 z-50 w-full transition-all duration-500 ${scrolled ? 'py-2' : 'py-4'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <FaClinicMedical className="h-8 w-8 text-black" />
              <span className="ml-3 text-xl font-bold text-black">Medi<span className="font-extrabold">Minders</span></span>
            </Link>
            <div className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <Link key={item.name} to={item.path} className="text-black hover:underline flex items-center">
                  {item.icon}<span>{item.name}</span>
                </Link>
              ))}
              <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ scale: 1.05 }} className="text-black border border-black px-3 py-1 rounded">
                <FaUser className="inline mr-1" /> Portal
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>
      <MedicalPortalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default Navbar;
