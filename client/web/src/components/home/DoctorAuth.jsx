import { useState } from 'react';
import { FaUserMd, FaLock, FaEnvelope, FaIdCard, FaHospital, FaPhone, FaClinicMedical } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Navbar from "../home/Navbar";
import Footer from "../home/Footer";
import DocLayout from './Doctor/DocLayout';

const DoctorAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Show success modal after form submission
    setModalContent({
      title: isLogin ? 'Login Successful!' : 'Registration Complete!',
      message: isLogin 
        ? 'You have successfully logged in to your doctor dashboard.' 
        : 'Your doctor account has been created. Please verify your email.',
      icon: <FaUserMd className="text-4xl text-green-500 mb-4" />
    });
    setShowModal(true);
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center p-4">
        {/* Auth Form Container */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Form Header */}
          <div className="bg-gradient-to-r from-red-600 via-red-500 to-green-600 p-6 text-white text-center">
            <FaUserMd className="text-4xl mx-auto mb-2" />
            <h2 className="text-2xl font-bold">{isLogin ? 'Doctor Login' : 'Doctor Registration'}</h2>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={`flex-1 py-4 font-medium ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`flex-1 py-4 font-medium ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="flex items-center text-gray-700">
                    <FaUserMd className="mr-2" /> Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Dr. John Smith"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex items-center text-gray-700">
                    <FaIdCard className="mr-2" /> Medical License Number
                  </label>
                  <input
                    type="text"
                    placeholder="MED12345678"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex items-center text-gray-700">
                    <FaHospital className="mr-2" /> Hospital/Clinic
                  </label>
                  <input
                    type="text"
                    placeholder="City General Hospital"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex items-center text-gray-700">
                    <FaClinicMedical className="mr-2" /> Specialization
                  </label>
                  <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required>
                    <option value="">Select your specialization</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Neurology">Neurology</option>
                    <option value="General">General Practitioner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center text-gray-700">
                    <FaPhone className="mr-2" /> Contact Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="flex items-center text-gray-700">
                <FaEnvelope className="mr-2" /> Email
              </label>
              <input
                type="email"
                placeholder="doctor@example.com"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center text-gray-700">
                <FaLock className="mr-2" /> Password
              </label>
              <input
                type="password"
                placeholder={isLogin ? "Enter your password" : "Create a password (min 8 characters)"}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                minLength="8"
                required
              />
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="flex items-center text-gray-700">
                  <FaLock className="mr-2" /> Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  minLength="8"
                  required
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-blue-600 mr-2" />
                  <span className="text-gray-700">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:underline">Forgot password?</a>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 via-red-500 to-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-md"
            >
              {isLogin ? 'Login' : 'Register'}
            </button>

            <p className="text-center text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:underline font-medium"
              >
                {isLogin ? 'Register here' : 'Login here'}
              </button>
            </p>
          </form>
        </motion.div>

        {/* Success Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center"
            >
              {modalContent.icon}
              <h3 className="text-2xl font-bold mb-2">{modalContent.title}</h3>
              <p className="text-gray-600 mb-6">{modalContent.message}</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    // Redirect to doctor dashboard after modal close
                    if (isLogin) {
                      // Replace with your actual navigation logic
                      window.location.href = '/doctor-layout';
                    }
                  }}
                  className="bg-gradient-to-r from-red-600 via-red-500 to-green-600 text-white py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Continue
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-200 text-gray-800 py-2 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DoctorAuth;