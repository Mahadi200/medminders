import React, { useState } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import { motion , AnimatePresence } from "framer-motion";
import { FaTimes, FaCalendarAlt, FaClock, FaUser, FaPhone, FaMapMarkerAlt, FaStethoscope, FaHospital } from "react-icons/fa";

// image link

import H1 from '../home/image/h1.png';
import H2 from '../home/image/h2.png';
import H3 from '../home/image/h3.png';
import H4 from '../home/image/h1.png';







const Hero = () => {
  const [sliderRef] = useKeenSlider(
    {
      loop: true,
    },
    [
      (slider) => {
        let timeout;
        let mouseOver = false;
        function clearNextTimeout() {
          clearTimeout(timeout);
        }
        function nextTimeout() {
          clearTimeout(timeout);
          if (mouseOver) return;
          timeout = setTimeout(() => {
            slider.next();
          }, 3000);
        }
        slider.on("created", () => {
          slider.container.addEventListener("mouseover", () => {
            mouseOver = true;
            clearNextTimeout();
          });
          slider.container.addEventListener("mouseout", () => {
            mouseOver = false;
            nextTimeout();
          });
          nextTimeout();
        });
        slider.on("dragStarted", clearNextTimeout);
        slider.on("animationEnded", nextTimeout);
        slider.on("updated", nextTimeout);
      },
    ]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    hospital: "",
    doctor: "",
    specialist: "",
    date: "",
    time: "",
    patientName: "",
    contactNumber: "",
    district: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Appointment Booked:", formData);
    setIsModalOpen(false);
    // Add your form submission logic here
  };

  const slides = [
    {
      id: 1,
      image: H1 ,
      title: "Advanced Medical Care",
      subtitle: "Your health is our priority",
    },
    {
      id: 2,
      image: H2,
      title: "Expert Doctors",
      subtitle: "Qualified professionals at your service"
    },
    {
      id: 3,
      image: H3,
      title: "Modern Facilities",
      subtitle: "State-of-the-art medical equipment"
    },
    {
      id: 4,
      image: H4,
      title: "24/7 Emergency",
      subtitle: "We're here when you need us most"
    }
  ];

  return (
    <>
      <section className="relative w-full h-screen max-h-[70vh] overflow-hidden">
        <div ref={sliderRef} className="keen-slider h-full">
          {slides.map((slide) => (
            <div key={slide.id} className="keen-slider__slide relative">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="absolute inset-0 bg-opacity-40"></div>
              </div>
              
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 text-black">
                <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fadeIn">
                  {slide.title}
                </h1>
                <p className="text-xl md:text-2xl mb-8 max-w-2xl animate-fadeIn delay-100">
                  {slide.subtitle}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-red-600 via-red-500 to-green-600 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-3 px-6 rounded-full text-lg animate-fadeIn delay-200 transition-all shadow-lg"
                >
                  Book an Appointment
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Appointment Booking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Book Appointment
                </h2>
                <motion.button
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="text-xl" />
                </motion.button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Hospital Name */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaHospital className="text-blue-500" />
                  </div>
                  <input
                    type="text"
                    name="hospital"
                    value={formData.hospital}
                    onChange={handleChange}
                    placeholder="Hospital Name"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </motion.div>

                {/* Doctor Name */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-green-500" />
                  </div>
                  <input
                    type="text"
                    name="doctor"
                    value={formData.doctor}
                    onChange={handleChange}
                    placeholder="Doctor Name"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </motion.div>

                {/* Specialist */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaStethoscope className="text-purple-500" />
                  </div>
                  <select
                    name="specialist"
                    value={formData.specialist}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none"
                    required
                  >
                    <option value="">Select Specialist</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Dermatology">Dermatology</option>
                  </select>
                </motion.div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="relative"
                  >
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className="text-red-500" />
                    </div>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </motion.div>

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="relative"
                  >
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaClock className="text-yellow-500" />
                    </div>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      required
                    />
                  </motion.div>
                </div>

                {/* Patient Name */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-teal-500" />
                  </div>
                  <input
                    type="text"
                    name="patientName"
                    value={formData.patientName}
                    onChange={handleChange}
                    placeholder="Patient Name"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                </motion.div>

                {/* Contact Number */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPhone className="text-indigo-500" />
                  </div>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    placeholder="Contact Number"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </motion.div>

                {/* District */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaMapMarkerAlt className="text-orange-500" />
                  </div>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder="District"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md"
                >
                  Confirm Appointment
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .keen-slider__slide {
          min-width: 100%;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .delay-100 {
          animation-delay: 0.2s;
        }
        .delay-200 {
          animation-delay: 0.4s;
        }
      `}</style>
    </>
  );
};

export default Hero;