import { FaMicroscope, FaPills, FaHeartbeat, FaFlask, FaUserMd, FaPrescriptionBottleAlt } from "react-icons/fa";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef,useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Particles } from "react-tsparticles";
import { loadFull } from "tsparticles";
import Navbar from "../components/home/Navbar";
import Footer from "../components/home/Footer";

// 3D Antibiotic Molecule Component
const AntibioticMolecule = () => {
  const moleculeRef = useRef();
  
  useFrame(() => {
    moleculeRef.current.rotation.y += 0.005;
  });

  return (
    <group ref={moleculeRef}>
      {/* Central Carbon Atom */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Bonded Atoms */}
      {[
        [1, 0, 0, "#8b5cf6"], 
        [-1, 0, 0, "#ec4899"],
        [0, 1, 0, "#10b981"],
        [0, -1, 0, "#f59e0b"],
        [0, 0, 1, "#ef4444"],
        [0, 0, -1, "#6366f1"]
      ].map(([x, y, z, color], i) => (
        <group key={i}>
          <mesh position={[x, y, z]}>
            <sphereGeometry args={[0.2, 32, 32]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <line>
            <bufferGeometry attach="geometry">
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([0, 0, 0, x, y, z])}
                itemSize={3}
                count={2}
              />
            </bufferGeometry>
            <lineBasicMaterial color="white" />
          </line>
        </group>
      ))}
    </group>
  );
};

// 3D Floating Pills
const FloatingPills = () => {
  const pills = useRef([]);
  
  useFrame((state) => {
    pills.current.forEach((pill, i) => {
      if (pill) {
        pill.position.y = Math.sin(state.clock.elapsedTime + i) * 0.5;
        pill.rotation.z += 0.01;
      }
    });
  });

  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <group
          key={i}
          ref={el => pills.current[i] = el}
          position={[
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 10
          ]}
        >
          <mesh>
            <capsuleGeometry args={[0.3, 1, 4, 8]} />
            <meshStandardMaterial 
              color={i % 2 === 0 ? "#3b82f6" : "#ec4899"} 
              transparent 
              opacity={0.8}
            />
          </mesh>
        </group>
      ))}
    </>
  );
};

const AboutPage = () => {
  const controls = useAnimation();
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  useEffect(() => {
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    });
  }, [controls]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 relative">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 h-screen w-full overflow-hidden">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <AntibioticMolecule />
          <FloatingPills />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Particles Background */}
      <div className="fixed inset-0 -z-10">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            particles: {
              number: { value: 30, density: { enable: true, area: 800 } },
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
              detect_on: "window",
              events: {
                onhover: { enable: true, mode: "repulse" },
                onclick: { enable: true, mode: "push" },
              },
            },
          }}
        />
      </div>

      <Navbar />
      
      <main className="flex-grow">
        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-16 relative z-10">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={controls}
            className="text-center mb-16 bg-white bg-opacity-80 backdrop-blur-sm p-8 rounded-xl shadow-xl"
          >
            <motion.h1
              className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4"
              whileHover={{ scale: 1.02 }}
            >
              <FaPills className="inline-block mr-3" />
              Antibiotic Stewardship
            </motion.h1>
            <motion.p
              className="text-xl text-gray-700 max-w-3xl mx-auto"
              whileHover={{ scale: 1.01 }}
            >
              Revolutionizing antibiotic awareness through digital healthcare innovation
            </motion.p>
          </motion.div>

          {/* Scientific Facts Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white bg-opacity-90 backdrop-blur-sm rounded-xl p-8 shadow-lg mb-12 border-t-4 border-blue-500"
          >
            <h2 className="text-3xl font-bold text-blue-800 mb-6 flex items-center">
              <FaFlask className="mr-3 text-blue-600" />
              Scientific Foundation
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Mechanism of Action</h3>
                <p className="text-gray-700 mb-4">
                  Antibiotics work by targeting specific bacterial structures:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2">β-lactams</span>
                    <span>Inhibit cell wall synthesis</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full p-1 mr-2">Macrolides</span>
                    <span>Disrupt protein synthesis</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 rounded-full p-1 mr-2">Quinolones</span>
                    <span>Interfere with DNA replication</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Resistance Development</h3>
                <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-lg border-l-4 border-red-500">
                  <p className="text-gray-700">
                    <strong>Mutation Rate:</strong> 1 in 10<sup>6</sup> to 10<sup>9</sup> bacterial divisions
                  </p>
                  <p className="text-gray-700 mt-2">
                    <strong>Transfer Mechanisms:</strong> Conjugation, Transformation, Transduction
                  </p>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Source: CDC Antibiotic Resistance Report 2023
                </p>
              </div>
            </div>
          </motion.div>

          {/* Digital Healthcare Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 shadow-lg mb-12 border border-gray-200"
          >
            <h2 className="text-3xl font-bold text-blue-800 mb-6 flex items-center">
              <FaPrescriptionBottleAlt className="mr-3 text-purple-600" />
              Mediminders Digital Solutions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <FaMicroscope className="text-4xl mb-3 text-blue-600" />,
                  title: "AI-Powered Diagnostics",
                  desc: "Machine learning algorithms analyze symptoms to recommend appropriate antibiotic use"
                },
                {
                  icon: <FaHeartbeat className="text-4xl mb-3 text-pink-600" />,
                  title: "Smart Reminders",
                  desc: "IoT-enabled pill boxes with dose tracking and compliance analytics"
                },
                {
                  icon: <FaUserMd className="text-4xl mb-3 text-green-600" />,
                  title: "Telemedicine Integration",
                  desc: "Secure video consultations with antibiotic stewardship-trained physicians"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"
                  whileHover={{ y: -5 }}
                >
                  <div className="text-center">
                    {item.icon}
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-700">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-xl shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <Canvas>
                <ambientLight intensity={0.5} />
                {Array.from({ length: 15 }).map((_, i) => (
                  <group
                    key={i}
                    position={[
                      (Math.random() - 0.5) * 20,
                      (Math.random() - 0.5) * 10,
                      -10
                    ]}
                  >
                    <mesh>
                      <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
                      <meshStandardMaterial color="white" transparent opacity={0.6} />
                    </mesh>
                  </group>
                ))}
              </Canvas>
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4 flex justify-center items-center">
                <FaMicroscope className="mr-3" />
                Join Our Antibiotic Stewardship Program
              </h2>
              <p className="text-xl mb-6 max-w-2xl mx-auto">
                Together we can reduce antibiotic resistance by 50% in Bangladesh by 2030
              </p>
              <motion.button
                className="bg-white text-blue-600 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-50 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.button>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;