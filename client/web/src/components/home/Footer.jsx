import { FaHeartbeat, FaFlask, FaStethoscope, FaClinicMedical, FaGithub, FaLinkedin, FaFacebook, FaEnvelope, FaHospital, FaPills, FaSyringe, FaMicroscope } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Home from '../../pages/Home';
import AboutPage from '../../pages/AboutPage';

const Footer = () => {
  const navItems = [
    { name: 'Home', path: '/', element: <Home/>, icon: <FaHeartbeat className="mr-1" /> },
    { name: 'About', path: '/about', element: <AboutPage/>, icon: <FaFlask className="mr-1" /> },
    { name: 'Services', path: '/service', icon: <FaStethoscope className="mr-1" /> },
    { name: 'Contact', path: '/contact', icon: <FaClinicMedical className="mr-1" /> },
  ];

  const teamMembers = [
    { name: 'Tama Dutta', role: 'Team Lead & BGE' },
    { name: 'Argho Mukherjee', role: 'Pharmacist' },
    { name: 'Md. Sinha Ibne Azad', role: 'Pharmacist' },
    { name: 'Nazmul Arefin Labib', role: 'Animal Nutritionist' },
    { name: 'Mahadi Hassan Shurov', role: 'Software Engineer' }
  ];

  const socialLinks = [
    { icon: <FaGithub />, url: 'https://github.com/Mahadi200' },
    { icon: <FaLinkedin />, url: 'www.linkedin.com/in/mahadi-hassan-shurov' },
    { icon: <FaFacebook />, url: 'https://www.facebook.com/mhs.shurov' },
    { icon: <FaEnvelope />, url: 'mailto:mahadi.official25@gmail.com' }
  ];

  // Medical icons for watermark background
  const medicalIcons = [
    { icon: <FaHeartbeat />, size: 'text-4xl' },
    { icon: <FaHospital />, size: 'text-5xl' },
    { icon: <FaPills />, size: 'text-3xl' },
    { icon: <FaSyringe />, size: 'text-4xl' },
    { icon: <FaMicroscope />, size: 'text-5xl' },
    { icon: <FaStethoscope />, size: 'text-4xl' }
  ];

  // Animation variants
  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const floatAnimation = {
    y: [0, -15, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const rotateAnimation = {
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  return (
    <footer className="bg-gradient-to-r from-blue-700 to-teal-600 text-white pt-16 pb-8 px-4 md:px-8 relative overflow-hidden">
      {/* Medical watermark background */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        {medicalIcons.map((item, index) => {
          const left = `${Math.random() * 90 + 5}%`;
          const top = `${Math.random() * 90 + 5}%`;
          const delay = Math.random() * 5;
          
          return (
            <motion.div
              key={index}
              className={`absolute ${item.size} text-blue-300`}
              style={{ left, top }}
              animate={{
                y: [0, -10, 0],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {item.icon}
            </motion.div>
          );
        })}
      </div>

      {/* Animated medical elements */}
      <motion.div 
        className="absolute top-10 left-20 w-10 h-10 bg-red-400 rounded-full opacity-20 blur-sm"
        animate={pulseAnimation}
      />
      <motion.div 
        className="absolute bottom-20 right-1/4 w-8 h-8 bg-blue-400 rounded-full opacity-20 blur-sm"
        animate={{
          ...floatAnimation,
          transition: { ...floatAnimation.transition, delay: 0.5 }
        }}
      />
      <motion.div 
        className="absolute top-1/3 right-40 w-12 h-12 bg-green-400 rounded-full opacity-20 blur-sm"
        animate={{
          ...pulseAnimation,
          transition: { ...pulseAnimation.transition, delay: 1 }
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Navigation */}
          <div>
            <motion.h3 
              className="text-2xl font-bold mb-6 flex items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <FaHeartbeat className="mr-3 text-pink-300 animate-pulse" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-blue-300">
                Medminders
              </span>
            </motion.h3>
            <ul className="space-y-3">
              {navItems.map((item, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  whileHover={{ 
                    x: 5,
                    color: '#7dd3fc' // light blue-300
                  }}
                >
                  <a 
                    href={item.path} 
                    className="flex items-center transition-colors group"
                  >
                    <span className="group-hover:text-cyan-300 transition-colors mr-2">
                      {item.icon}
                    </span>
                    <span className="group-hover:text-cyan-300 transition-colors">
                      {item.name}
                    </span>
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Team Members */}
           {/* Team Members */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-center">Our Team</h3>
            <div className="grid grid-cols-2 gap-4">
              {teamMembers.map((member, index) => (
                <motion.div 
                  key={index}
                  className=" bg-opacity-10 p-3 rounded-lg backdrop-blur-sm  hover:bg-gradient-to-r hover:from-red-400/40 hover:to-green-400/40"
                  whileHover={{ scale: 1.03 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <h4 className="font-semibold text-cyan-200">{member.name}</h4>
                  <p className="text-sm text-gray-300">{member.role}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="text-xl font-bold mb-4">Connect With Us</h3>
            <div className="flex space-x-4 mb-4">
              {socialLinks.map((link, index) => (
                <motion.a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-opacity-20 rounded-full flex items-center justify-center text-xl hover:bg-opacity-30 transition-all  hover:bg-gradient-to-r hover:from-red-400/40 hover:to-green-400/40"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {link.icon}
                </motion.a>
              ))}
            </div>
            <p className="text-sm text-gray-300 mb-2  hover:bg-gradient-to-r hover:from-red-400/40 hover:to-green-400/40">
              Email: mahadi.official25@gmail.com
            </p>
            <p className="text-sm text-gray-300">
              Bringing medical innovation to your doorstep
            </p>
          </div>
        </div>

        {/* Copyright */}
        <motion.div 
          className="border-t border-white border-opacity-20 mt-10 pt-6 text-center text-sm text-gray-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <p>© {new Date().getFullYear()} Medminders. All rights reserved.</p>
          <p className="mt-1 text-xs opacity-70">Committed to excellence in medical care and innovation</p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;