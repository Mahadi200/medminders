import { FaMicroscope, FaPills, FaHeartbeat, FaFlask, FaUserMd } from "react-icons/fa";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import Navbar from "../components/home/Navbar";
import Footer from "../components/home/Footer";

const AboutPage = () => {
  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    });
  }, [controls]);

  const particlesInit = async (engine) => {
    await loadFull(engine);
  };

  return (
    <div className="min-h-screen flex flex-col ">
      <Navbar />
      <main className="flex-grow bg-gradient-to-br from-blue-50 to-purple-50 ">
        {/* Floating Antibiotic Particles */}
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            particles: {
              number: { value: 30, density: { enable: true, value_area: 800 } },
              color: { value: ["#3b82f6", "#8b5cf6", "#ec4899"] },
              shape: { type: "circle" },
              opacity: { value: 0.5, random: true },
              size: { value: 3, random: true },
              move: {
                enable: true,
                speed: 2,
                direction: "none",
                random: true,
                straight: false,
                out_mode: "out",
                bounce: false,
              },
            },
            interactivity: {
              detect_on: "canvas",
              events: {
                onhover: { enable: true, mode: "repulse" },
                onclick: { enable: true, mode: "push" },
              },
            },
          }}
        />

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-16 relative z-10">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={controls}
            className="text-center mb-16"
          >
            <motion.h1
              className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4"
              whileHover={{ scale: 1.02 }}
            >
              <FaPills className="inline-block mr-3" />
              Antibiotics Awareness
            </motion.h1>
            <motion.p
              className="text-xl text-gray-700 max-w-3xl mx-auto"
              whileHover={{ scale: 1.01 }}
            >
              Empowering everyone to use antibiotics responsibly for a healthier future.
            </motion.p>
          </motion.div>

          {/* Mission Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white bg-opacity-80 backdrop-blur-sm rounded-xl p-8 shadow-lg mb-12"
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.02 }}
              >
                <h2 className="text-3xl font-bold text-blue-800 mb-4 flex items-center">
                  <FaHeartbeat className="mr-3 text-pink-500" />
                  Our Mission
                </h2>
                <p className="text-gray-700 mb-4">
                  At <span className="font-bold text-purple-600">Mediminders</span>, we are dedicated to educating people about the <span className="font-semibold text-blue-600">proper use of antibiotics</span>. Our goal is to ensure that everyone completes their prescribed antibiotic course, preventing resistance and promoting long-term health.
                </p>
                <p className="text-gray-700">
                  We believe that awareness can save lives. By spreading knowledge, we help individuals, families, and communities make informed decisions about antibiotics.
                </p>
              </motion.div>
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                  alt="Antibiotic Awareness"
                  className="rounded-xl shadow-md border-4 border-white"
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Benefits vs Risks Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12"
          >
            {/* Benefits */}
            <motion.div
              className="bg-gradient-to-br from-blue-100 to-indigo-100 p-6 rounded-xl shadow-lg border-l-4 border-blue-500"
              whileHover={{ y: -5 }}
            >
              <h3 className="text-2xl font-bold text-blue-800 mb-4 flex items-center">
                <FaFlask className="mr-2 text-blue-600" />
                Benefits of Antibiotics
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full p-1 mr-2">✓</span>
                  <span className="text-gray-800">Treat bacterial infections effectively</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full p-1 mr-2">✓</span>
                  <span className="text-gray-800">Prevent severe complications like sepsis</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full p-1 mr-2">✓</span>
                  <span className="text-gray-800">Save lives when used correctly</span>
                </li>
              </ul>
            </motion.div>

            {/* Risks */}
            <motion.div
              className="bg-gradient-to-br from-pink-100 to-red-100 p-6 rounded-xl shadow-lg border-l-4 border-red-500"
              whileHover={{ y: -5 }}
            >
              <h3 className="text-2xl font-bold text-red-800 mb-4 flex items-center">
                <FaUserMd className="mr-2 text-red-600" />
                Risks of Misuse
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="bg-red-500 text-white rounded-full p-1 mr-2">⚠️</span>
                  <span className="text-gray-800">Antibiotic resistance makes infections harder to treat</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-red-500 text-white rounded-full p-1 mr-2">⚠️</span>
                  <span className="text-gray-800">Increased healthcare costs and longer hospital stays</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-red-500 text-white rounded-full p-1 mr-2">⚠️</span>
                  <span className="text-gray-800">Ineffective treatments for future generations</span>
                </li>
              </ul>
            </motion.div>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-xl shadow-2xl"
          >
            <h2 className="text-3xl font-bold mb-4 flex justify-center items-center">
              <FaMicroscope className="mr-3" />
              Join the Movement
            </h2>
            <p className="text-xl mb-6 max-w-2xl mx-auto">
              Together, we can fight antibiotic resistance by spreading awareness and promoting responsible use.
            </p>
            <motion.button
              className="bg-white text-blue-600 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-50 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Learn How You Can Help
            </motion.button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;