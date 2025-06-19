import { FaHeartbeat, FaFlask, FaStethoscope, FaClinicMedical, FaGithub, FaLinkedin, FaFacebook, FaEnvelope } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Home from '../../pages/Home';
import AboutPage from '../../pages/AboutPage';

const Footer = () => {
  const navItems = [
    { name: 'Home', path: '/',element: <Home/>,icon: <FaHeartbeat className="mr-1" /> },
    { name: 'About', path: '/about', element: <AboutPage/>,icon: <FaFlask className="mr-1" /> },
    { name: 'Services', path: '/service', icon: <FaStethoscope className="mr-1" /> },
    { name: 'Contact', path: '/contact', icon: <FaClinicMedical className="mr-1" /> },
  ];

  const teamMembers = [
    { name: 'Tama Dutta', role: 'Team Lead & BGE' },
    { name: 'Argho Mukherjee ', role: 'Pharmacist' },
    { name: 'Md. Sinha Ibne Azad', role: 'Pharmacist' },
    { name: 'Nazmul Arefin Labib ', role: 'Animal Nutritionist' },
    { name: 'Mahadi Hassan Shurov ', role: 'Software Engineer' }
  ];

  const socialLinks = [
    { icon: <FaGithub />, url: 'https://github.com/Mahadi200' },
    { icon: <FaLinkedin />, url: 'www.linkedin.com/in/mahadi-hassan-shurov' },
    { icon: <FaFacebook />, url: 'https://www.facebook.com/mhs.shurov' },
    { icon: <FaEnvelope />, url: 'mailto:mahadi.official25@gmail.com' }
  ];

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const floatAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  return (
    <footer className="bg-gradient-to-r from-red-600 via-red-500 to-green-600 text-white pt-12 pb-6 px-4 md:px-8 relative overflow-hidden">
      {/* Animated medical elements */}
      <motion.div 
        className="absolute top-10 left-20 w-8 h-8 bg-red-400 rounded-full opacity-30"
        animate={pulseAnimation}
      />
      <motion.div 
        className="absolute bottom-20 right-1/4 w-6 h-6 bg-blue-400 rounded-full opacity-30"
        animate={floatAnimation}
      />
      <motion.div 
        className="absolute top-1/3 right-40 w-10 h-10 bg-green-400 rounded-full opacity-30"
        animate={{
          ...pulseAnimation,
          transition: { ...pulseAnimation.transition, delay: 0.5 }
        }}
      />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Navigation */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <FaClinicMedical className="mr-2 text-pink-400" />
              Mediminders
            </h3>
            <ul className="space-y-2">
              {navItems.map((item, index) => (
                <motion.li 
                  key={index}
                  whileHover={{ x: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <a href={item.path} className="flex items-center hover:text-cyan-300 transition-colors">
                    {item.icon}
                    {item.name}
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>

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
        <div className="border-t border-white border-opacity-20 mt-8 pt-6 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Mediminders. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;