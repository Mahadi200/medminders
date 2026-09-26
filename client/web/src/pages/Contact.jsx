import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaFlask, FaMicroscope, FaDna, FaClinicMedical } from 'react-icons/fa';
import { MdScience, MdHealthAndSafety } from 'react-icons/md';
import Navbar from "../components/home/Navbar";
import Footer from "../components/home/Footer";

// 3D DNA Model Component
function DnaModel() {
  const dnaRef = useRef();
  useFrame((state, delta) => {
    dnaRef.current.rotation.y += delta * 0.2;
  });
  
  return (
    <mesh ref={dnaRef} position={[0, 0, 0]}>
      <torusKnotGeometry args={[1, 0.3, 100, 16]} />
      <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
    </mesh>
  );
}

// 3D Microscope Model
function MicroscopeModel() {
  const { scene } = useGLTF('/microscope.glb');
  const microscopeRef = useRef();
  
  useFrame((state, delta) => {
    microscopeRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.2;
  });
  
  return <primitive object={scene} ref={microscopeRef} position={[0, -1, 0]} scale={1.5} />;
}

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
    }, 2000);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const cardHover = {
    scale: 1.03,
    boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
    transition: { type: "spring", stiffness: 300 }
  };

  return (
  <div className="min-h-screen flex flex-col ">
      <Navbar />
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-teal-50 min-h-screen">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-blue-200"
            style={{
              fontSize: `${Math.random() * 3 + 1}rem`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * 50 - 25],
              x: [0, Math.random() * 30 - 15],
              rotate: [0, Math.random() * 360],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 10 + Math.random() * 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {[<FaFlask />, <FaMicroscope />, <FaDna />, <MdScience />, <MdHealthAndSafety />][i % 5]}
          </motion.div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        >
          {/* Left Column - Contact Form */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8">
              <motion.h2 
                className="text-3xl font-bold text-gray-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Contact Our Scientific Team
              </motion.h2>
              
              <motion.p 
                className="text-gray-600 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Reach out to our medical and scientific experts for inquiries, collaborations, or support.
              </motion.p>
              
              <form onSubmit={handleSubmit}>
                <motion.div 
                  className="mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </motion.div>
                
                <motion.div 
                  className="mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </motion.div>
                
                <motion.div 
                  className="mb-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  ></textarea>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-all ${isSubmitting ? 'bg-blue-400' : 'bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600'}`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                  
                  {submitSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm"
                    >
                      Your message has been sent successfully! Our team will respond shortly.
                    </motion.div>
                  )}
                </motion.div>
              </form>
            </div>
          </motion.div>

          {/* Right Column - Contact Info & 3D Model */}
          <div className="space-y-8">
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FaClinicMedical className="text-blue-500 mr-3" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
                    Headquarters & Laboratory
                  </span>
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg text-blue-600">
                      <FaMapMarkerAlt className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">Location</h4>
                      <p className="mt-1 text-gray-600">
                        Biomedical Research Complex<br />
                        Plot 15, Tech Innovation Zone<br />
                        Dhaka 1212, Bangladesh
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg text-blue-600">
                      <FaPhone className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">Direct Transmission</h4>
                      <p className="mt-1 text-gray-600">
                        +880 1754 002201<br />
                        (Available 9:00 AM - 6:00 PM, Sunday-Thursday)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg text-blue-600">
                      <FaEnvelope className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">Electronic Transmission</h4>
                      <p className="mt-1 text-gray-600">
                        mahadihassan100life@gmail.com<br />
                        For urgent matters, please include "[URGENT]" in subject
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3D Model Section */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              className="bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl shadow-xl overflow-hidden h-96"
            >
              <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <DnaModel />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
              </Canvas>
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                <p className="text-white text-sm text-center">
                  Interactive 3D Molecular Visualization
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Ecosystem Signature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm">
            <FaFlask className="text-blue-500 mr-2" />
            <span className="text-gray-700 font-medium">
              Medminders Scientific Ecosystem v3.2 • Certified ISO 13485:2016
            </span>
          </div>
        </motion.div>
      </div>
    </div>
     <Footer />
    </div>
  );
};

export default Contact;