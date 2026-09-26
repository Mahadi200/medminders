import { useState, useEffect } from 'react';
import { 
  FaUserMd, FaUserInjured, FaHospital, FaSearch, 
  FaCalendarAlt, FaFileInvoiceDollar, FaFileMedical,
  FaChartLine, FaProcedures, FaRegCalendarCheck
} from 'react-icons/fa';
import { MdPayment, MdPeople, MdLocalPharmacy } from 'react-icons/md';
import { GiMedicines } from 'react-icons/gi';
import { motion } from 'framer-motion';
import Navbar from '../Navbar'
import Footer from '../Footer'



const MedMindersHospitalDashboard = () => {
  // State for search functionality
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  
  // Mock data
  const [patients, setPatients] = useState([
    { id: 1, name: 'Mohammad Rahman', age: 42, gender: 'Male', lastVisit: '2023-06-15', status: 'Active' },
    { id: 2, name: 'Fatima Begum', age: 35, gender: 'Female', lastVisit: '2023-06-14', status: 'Active' },
    { id: 3, name: 'Abdul Kalam', age: 68, gender: 'Male', lastVisit: '2023-06-10', status: 'Discharged' }
  ]);

  const [doctors, setDoctors] = useState([
    { id: 1, name: 'Dr. Sakib Rahman', specialty: 'Cardiology', available: true, appointments: 12 },
    { id: 2, name: 'Dr. Nusrat Jahan', specialty: 'Pediatrics', available: true, appointments: 8 },
    { id: 3, name: 'Dr. Abdullah Khan', specialty: 'Neurology', available: false, appointments: 5 }
  ]);

  const [appointments, setAppointments] = useState([
    { id: 1, patient: 'Mohammad Rahman', doctor: 'Dr. Sakib Rahman', date: '2023-06-16', time: '10:30 AM', status: 'Confirmed' },
    { id: 2, patient: 'Fatima Begum', doctor: 'Dr. Nusrat Jahan', date: '2023-06-16', time: '11:45 AM', status: 'Pending' },
    { id: 3, patient: 'Ayesha Siddiqua', doctor: 'Dr. Abdullah Khan', date: '2023-06-17', time: '09:15 AM', status: 'Confirmed' }
  ]);

  const [revenueData, setRevenueData] = useState({
    today: 125000,
    monthly: 2850000,
    outstanding: 420000
  });

  // Filter patients and doctors based on search
  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(patientSearch.toLowerCase())
  );
  
  const filteredDoctors = doctors.filter(doctor => 
    doctor.name.toLowerCase().includes(doctorSearch.toLowerCase()) || 
    doctor.specialty.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-gray-100">
        <Navbar/>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-teal-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FaHospital className="text-3xl" />
            <h1 className="text-2xl font-bold">MedMinders Hospital ERP</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Quick search..."
                className="bg-white bg-opacity-20 px-4 py-2 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <FaSearch className="absolute right-3 top-3 text-blue-100" />
            </div>
            <div className="flex items-center space-x-2">
              <img 
                src="https://randomuser.me/api/portraits/men/75.jpg" 
                alt="Admin" 
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <span className="font-medium">Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Access */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Stats */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaChartLine className="mr-2 text-blue-600" />
              Quick Stats
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <FaUserInjured className="text-blue-500 mr-2" />
                  <span>Patients Today</span>
                </div>
                <span className="font-bold">42</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <FaUserMd className="text-green-500 mr-2" />
                  <span>Doctors On Duty</span>
                </div>
                <span className="font-bold">8</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <FaRegCalendarCheck className="text-purple-500 mr-2" />
                  <span>Appointments</span>
                </div>
                <span className="font-bold">27</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <FaProcedures className="text-red-500 mr-2" />
                  <span>Admissions</span>
                </div>
                <span className="font-bold">5</span>
              </div>
            </div>
          </motion.div>

          {/* Revenue Summary */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaFileInvoiceDollar className="mr-2 text-green-600" />
              Revenue Summary
            </h2>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <p className="text-xl font-bold">৳{revenueData.today.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-xl font-bold">৳{revenueData.monthly.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-xl font-bold">৳{revenueData.outstanding.toLocaleString()}</p>
              </div>
            </div>
            <button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
              View Full Report
            </button>
          </motion.div>
        </div>

        {/* Main Dashboard Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Patient Management Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center">
                <FaUserInjured className="mr-2" />
                Patient Management
              </h2>
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search patients..."
                  className="w-full bg-white bg-opacity-20 px-4 py-2 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                <FaSearch className="absolute right-3 top-3 text-blue-100" />
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <button className="bg-blue-100 text-blue-800 p-3 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors">
                  <FaUserInjured className="mr-2" />
                  New Registration
                </button>
                <button className="bg-green-100 text-green-800 p-3 rounded-lg flex items-center justify-center hover:bg-green-200 transition-colors">
                  <FaFileMedical className="mr-2" />
                  Generate Report
                </button>
                <button className="bg-purple-100 text-purple-800 p-3 rounded-lg flex items-center justify-center hover:bg-purple-200 transition-colors">
                  <MdPayment className="mr-2" />
                  Billing System
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age/Gender</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPatients.map(patient => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">#{patient.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{patient.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{patient.age} yrs, {patient.gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{patient.lastVisit}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            patient.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {patient.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                          <button className="text-green-600 hover:text-green-900">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Doctor & Appointment Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doctor Management */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white">
                <h2 className="text-xl font-bold flex items-center">
                  <FaUserMd className="mr-2" />
                  Doctor Directory
                </h2>
                <div className="relative mt-2">
                  <input
                    type="text"
                    placeholder="Search doctors..."
                    className="w-full bg-white bg-opacity-20 px-4 py-2 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white"
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                  />
                  <FaSearch className="absolute right-3 top-3 text-blue-100" />
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {filteredDoctors.map(doctor => (
                    <div key={doctor.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <FaUserMd className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{doctor.name}</h3>
                        <p className="text-sm text-gray-600">{doctor.specialty}</p>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        doctor.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {doctor.available ? 'Available' : 'Unavailable'}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 bg-blue-100 text-blue-800 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors">
                  View All Doctors
                </button>
              </div>
            </motion.div>

            {/* Appointment System */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center">
                  <FaCalendarAlt className="mr-2" />
                  Appointment System
                </h2>
                <span className="bg-amber-200 text-black bg-opacity-20 px-3 py-1 rounded-full text-sm">
                  {appointments.length} today
                </span>
              </div>
              <div className="p-4">
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button className="bg-blue-100 text-blue-800 p-2 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors">
                    <FaRegCalendarCheck className="mr-2" />
                    New Appointment
                  </button>
                  <button className="bg-purple-100 text-purple-800 p-2 rounded-lg flex items-center justify-center hover:bg-purple-200 transition-colors">
                    <MdPeople className="mr-2" />
                    Waiting List
                  </button>
                </div>
                
                <div className="space-y-3">
                  {appointments.map(appointment => (
                    <div key={appointment.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{appointment.patient}</h3>
                          <p className="text-sm text-gray-600">With {appointment.doctor}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div className="flex justify-between mt-2 text-sm">
                        <span className="text-gray-600">{appointment.date}</span>
                        <span className="font-medium">{appointment.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Report & Pharmacy Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report Delivery System */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 1.0 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center">
                  <FaFileMedical className="mr-2" />
                  Report Delivery
                </h2>
                <span className="bg-amber-200 text-black bg-opacity-20 px-3 py-1 rounded-full text-sm">
                  15 pending
                </span>
              </div>
              <div className="p-4">
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 p-2 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="font-bold">15</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="font-bold">42</p>
                  </div>
                  <div className="bg-red-50 p-2 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Delayed</p>
                    <p className="font-bold">3</p>
                  </div>
                </div>
                <button className="w-full bg-blue-100 text-blue-800 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors">
                  View All Reports
                </button>
              </div>
            </motion.div>

            {/* Pharmacy Management */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 1.2 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center">
                  <MdLocalPharmacy className="mr-2" />
                  Pharmacy System
                </h2>
                <span className="bg-amber-200 text-black bg-opacity-20 px-3 py-1 rounded-full text-sm">
                  8 orders
                </span>
              </div>
              <div className="p-4">
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button className="bg-green-100 text-green-800 p-2 rounded-lg flex items-center justify-center hover:bg-green-200 transition-colors">
                    <GiMedicines className="mr-2" />
                    New Prescription
                  </button>
                  <button className="bg-purple-100 text-purple-800 p-2 rounded-lg flex items-center justify-center hover:bg-purple-200 transition-colors">
                    <FaSearch className="mr-2" />
                    Medicine Search
                  </button>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-500">
                  <p className="text-sm font-medium">Low Stock Alert</p>
                  <p className="text-xs text-gray-600">5 medicines below threshold</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer/>
    </div>
  );
};

export default MedMindersHospitalDashboard;