import { motion, AnimatePresence } from "framer-motion";
import { FaClock, FaMapMarkerAlt, FaStethoscope, FaCalendarAlt, FaUser, FaPhone, FaTimes } from "react-icons/fa";
import { useState } from "react";


// image link import
import D1 from './image/d1.jpg';
import D2 from './image/d2.jpg';
import D3 from './image/d3.JPG';
import D4 from './image/d4.JPG';
import D5 from './image/d5.jpg';
import D6 from './image/d6.JPG';

const doctors = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    designation: "Senior Consultant",
    specialist: "Cardiology",
    available: {
      days: "Mon, Wed, Fri",
      time: "9:00 AM - 4:00 PM"
    },
    chamber: "MedLife Hospital, Floor 5, Room 502",
    image: D1,
    bio: "Dr. Johnson has over 15 years of experience in cardiology with special expertise in interventional procedures. She completed her fellowship at Johns Hopkins Hospital."
  },
  {
    id: 2,
    name: "Dr. Michael Chen",
    designation: "Neurologist",
    specialist: "Neurology",
    available: {
      days: "Tue, Thu, Sat",
      time: "10:00 AM - 6:00 PM"
    },
    chamber: "NeuroCare Center, Main Building, Room 210",
    image:D2,
    bio: "Dr. Chen specializes in movement disorders and neurodegenerative diseases. He has published over 50 research papers in neurology journals."
  },
  {
    id: 3,
    name: "Dr. Emily Rodriguez",
    designation: "Pediatrician",
    specialist: "Pediatrics",
    available: {
      days: "Mon-Fri",
      time: "8:00 AM - 3:00 PM"
    },
    chamber: "Children's Health Center, Wing B, Room 105",
    image: D3,
    bio: "With a gentle approach to child care, Dr. Rodriguez focuses on preventive medicine and childhood development. She's board certified in pediatric medicine."
  },
  {
    id: 4,
    name: "Dr. James Wilson",
    designation: "Orthopedic Surgeon",
    specialist: "Orthopedics",
    available: {
      days: "Wed, Thu, Sun",
      time: "11:00 AM - 7:00 PM"
    },
    chamber: "Bone & Joint Institute, Floor 3, Room 310",
    image: D4,
    bio: "Specializing in sports medicine and joint replacements, Dr. Wilson has helped numerous athletes recover from injuries and return to peak performance."
  },
  {
    id: 5,
    name: "Dr. Akash Khan",
    designation: "Dermatologist",
    specialist: "Dermatology",
    available: {
      days: "Mon, Tue, Fri, Sat",
      time: "9:30 AM - 5:30 PM"
    },
    chamber: "SkinCare Clinic, Main Wing, Room 15",
    image: D5,
    bio: "Dr. Khan is an expert in cosmetic dermatology and skin cancer prevention. She offers both medical and aesthetic treatments for all skin types."
  },
  {
    id: 6,
    name: "Dr. Robert Kim",
    designation: "Ophthalmologist",
    specialist: "Ophthalmology",
    available: {
      days: "Tue, Thu, Sat",
      time: "8:30 AM - 5:00 PM"
    },
    chamber: "Vision Center, Suite 400",
    image: D6,
    bio: "Specializing in cataract surgery and laser vision correction, Dr. Kim has performed over 5,000 successful eye surgeries in his career."
  }
];

const DoctorsSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [viewDetailsId, setViewDetailsId] = useState(null);
  const [formData, setFormData] = useState({
    doctor: "",
    specialist: "",
    date: "",
    time: "",
    patientName: "",
    contactNumber: "",
    district: ""
  });

  const handleAppointmentClick = (doctor) => {
    setSelectedDoctor(doctor);
    setFormData({
      ...formData,
      doctor: doctor.name,
      specialist: doctor.specialist
    });
    setIsModalOpen(true);
  };

  const handleViewDetails = (id) => {
    setViewDetailsId(viewDetailsId === id ? null : id);
  };

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

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Our Potential Doctors</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Meet our team of highly qualified and experienced medical professionals dedicated to your health and well-being.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {doctors.map((doctor) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative h-48 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <div className="w-20 h-20 rounded-full border-4 border-white bg-white overflow-hidden shadow-md">
                    <img 
                      src={doctor.image} 
                      alt={doctor.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 pt-12">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{doctor.name}</h3>
                    <p className="text-sm text-blue-600">{doctor.designation}</p>
                  </div>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white text-xs font-semibold rounded-full">
                    {doctor.specialist}
                  </span>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <FaClock className="text-blue-500 mr-2" />
                    <span>{doctor.available.days} | {doctor.available.time}</span>
                  </div>
                  <div className="flex items-start text-sm text-gray-600">
                    <FaMapMarkerAlt className="text-green-500 mr-2 mt-0.5" />
                    <span>{doctor.chamber}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {viewDetailsId === doctor.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 overflow-hidden"
                    >
                      <p className="text-sm text-gray-600">{doctor.bio}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between mt-6 space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAppointmentClick(doctor)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-medium py-2 px-4 rounded-lg transition-all"
                  >
                    Appointment
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleViewDetails(doctor.id)}
                    className="flex-1 bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 font-medium py-2 px-4 rounded-lg transition-all"
                  >
                    {viewDetailsId === doctor.id ? 'Hide Details' : 'View Details'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Appointment Modal */}
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

              {selectedDoctor && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
                      <img 
                        src={selectedDoctor.image} 
                        alt={selectedDoctor.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{selectedDoctor.name}</h3>
                      <p className="text-sm text-blue-600">{selectedDoctor.specialist}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
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
                    readOnly
                  />
                </motion.div>

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaStethoscope className="text-purple-500" />
                  </div>
                  <input
                    type="text"
                    name="specialist"
                    value={formData.specialist}
                    onChange={handleChange}
                    placeholder="Specialist"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                    readOnly
                  />
                </motion.div>

                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
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
                    transition={{ delay: 0.4 }}
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

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
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

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
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
    </section>
  );
};

export default DoctorsSection;