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
    <div className="min-h-screen bg-[#F4F8FA]">
      <Navbar />

      {/* Synthetic Demo Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 text-center font-medium flex items-center justify-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span>
          ⚠️ ডেমো সিমুলেশন (DEMO SIMULATION) — সমস্ত রোগীর নাম, শয্যা পরিসংখ্যান, আর্থিক তথ্য এবং চিকিৎসকের উপস্থিতি অফলাইন টেস্ট ডেটা। এটি কোনো লাইভ হাসপাতাল টেলিফোনি বা রিয়েল-টাইম ডাটা ফিড নয়।
        </span>
      </div>

      {/* Header */}
      <header className="bg-[#0A2342] text-white p-4 shadow-md border-b border-[#0F3A66]">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#028090] flex items-center justify-center text-white">
              <FaHospital className="text-2xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">MedMinders Hospital Clinical ERP</h1>
              <p className="text-xs text-slate-300">Departmental Ward & Antibiotic Stewardship Console (সিমুলেটেড ডেমো / Demo Mode)</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search patient / doctor..."
                className="bg-[#0F3A66] border border-[#028090]/40 px-4 py-1.5 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A896]"
              />
              <FaSearch className="absolute right-3 top-2.5 text-slate-400 text-xs" />
            </div>
            <div className="flex items-center space-x-2 bg-[#0F3A66] px-3 py-1.5 rounded-lg border border-[#028090]/30">
              <div className="w-7 h-7 rounded-full bg-[#028090] flex items-center justify-center text-xs font-bold">
                HA
              </div>
              <span className="text-xs font-medium text-slate-200">Hospital Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Access */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-xs border border-[#D1E3EB] p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold flex items-center text-[#0A2342]">
                <FaChartLine className="mr-2 text-[#028090]" />
                Quick Stats
              </h2>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                DEMO SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              *অফলাইন সিমুলেশন ডেটা — লাইভ টেলিফোনি বা এন্টারপ্রাইজ ফিড নয় (Not Live Telephonic Data)
            </p>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-slate-700">
                  <FaUserInjured className="text-[#028090] mr-2" />
                  <span>Patients Today (Demo)</span>
                </div>
                <span className="font-bold text-[#0A2342]">42</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-slate-700">
                  <FaUserMd className="text-[#00A896] mr-2" />
                  <span>Doctors On Duty (Simulated)</span>
                </div>
                <span className="font-bold text-[#0A2342]">8</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-slate-700">
                  <FaRegCalendarCheck className="text-purple-600 mr-2" />
                  <span>Appointments (Demo)</span>
                </div>
                <span className="font-bold text-[#0A2342]">27</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-slate-700">
                  <FaProcedures className="text-rose-600 mr-2" />
                  <span>Admissions (Demo)</span>
                </div>
                <span className="font-bold text-[#0A2342]">5</span>
              </div>
            </div>
          </div>

          {/* Revenue Summary */}
          <div className="bg-white rounded-xl shadow-xs border border-[#D1E3EB] p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold flex items-center text-[#0A2342]">
                <FaFileInvoiceDollar className="mr-2 text-[#00A896]" />
                Revenue Summary
              </h2>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                DEMO SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              *সিমুলেটেড আর্থিক পরিসংখ্যান (Simulated figures for demonstration only)
            </p>
            <div className="space-y-3">
              <div className="bg-[#F4F8FA] p-3 rounded-lg border border-[#D1E3EB]">
                <p className="text-xs text-slate-600">Today's Revenue (Simulated)</p>
                <p className="text-lg font-bold text-[#0A2342]">৳{revenueData.today.toLocaleString()}</p>
              </div>
              <div className="bg-[#ECFDF5] p-3 rounded-lg border border-[#A7F3D0]">
                <p className="text-xs text-emerald-700">Monthly Revenue (Simulated)</p>
                <p className="text-lg font-bold text-emerald-900">৳{revenueData.monthly.toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800">Outstanding (Simulated)</p>
                <p className="text-lg font-bold text-amber-900">৳{revenueData.outstanding.toLocaleString()}</p>
              </div>
            </div>
            <button className="w-full mt-4 bg-[#028090] text-white py-2 rounded-lg font-medium hover:bg-[#00A896] transition-colors text-sm">
              View Full Report (Demo)
            </button>
          </div>
        </div>


        {/* Main Dashboard Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Patient Management Section */}
          <div className="bg-white rounded-xl shadow-xs border border-[#D1E3EB] overflow-hidden">
            <div className="bg-[#0F3A66] p-4 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center">
                <FaUserInjured className="mr-2 text-[#00A896]" />
                Patient Management
              </h2>
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search patients..."
                  className="w-full bg-[#0A2342] border border-[#028090]/40 px-4 py-1.5 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A896]"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                <FaSearch className="absolute right-3 top-2.5 text-slate-400 text-xs" />
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <button className="bg-[#F4F8FA] border border-[#D1E3EB] text-[#0A2342] p-3 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors text-sm font-semibold">
                  <FaUserInjured className="mr-2 text-[#028090]" />
                  New Registration
                </button>
                <button className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] p-3 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors text-sm font-semibold">
                  <FaFileMedical className="mr-2 text-[#00A896]" />
                  Generate Report
                </button>
                <button className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-3 rounded-lg flex items-center justify-center hover:bg-indigo-100 transition-colors text-sm font-semibold">
                  <MdPayment className="mr-2 text-indigo-600" />
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
          </div>

          {/* Doctor & Appointment Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doctor Management */}
            <div className="bg-white rounded-xl shadow-xs border border-[#D1E3EB] overflow-hidden">
              <div className="bg-[#0F3A66] p-4 text-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold flex items-center">
                    <FaUserMd className="mr-2 text-[#00A896]" />
                    Doctor Directory
                  </h2>
                  <span className="text-[10px] font-bold bg-[#028090]/40 text-teal-200 border border-teal-400/40 px-2 py-0.5 rounded-full">
                    সিমুলেটেড রোস্টার (Simulated)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  *টেলিফোনিক বা লাইভ শিডিউল নয় — অফলাইন নমুনা উপস্থিতি
                </p>
                <div className="relative mt-2">
                  <input
                    type="text"
                    placeholder="Search doctors..."
                    className="w-full bg-[#0A2342] border border-[#028090]/40 px-4 py-1.5 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A896]"
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                  />
                  <FaSearch className="absolute right-3 top-2.5 text-slate-400 text-xs" />
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {filteredDoctors.map(doctor => (
                    <div key={doctor.id} className="flex items-center p-3 border border-[#D1E3EB] rounded-lg hover:bg-[#F4F8FA] transition-colors">
                      <div className="bg-[#E0F2F1] text-[#028090] p-2 rounded-full mr-3">
                        <FaUserMd />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm text-[#0A2342]">{doctor.name}</h3>
                        <p className="text-xs text-slate-500">{doctor.specialty} (নমুনা প্রোফাইল)</p>
                      </div>
                      <div className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${
                        doctor.available ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {doctor.available ? 'Available (Simulated)' : 'Unavailable (Simulated)'}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 bg-[#F4F8FA] border border-[#D1E3EB] text-[#0A2342] py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm">
                  View All Doctors (Demo)
                </button>
              </div>
            </div>

            {/* Appointment System */}
            <div className="bg-white rounded-xl shadow-xs border border-[#D1E3EB] overflow-hidden">
              <div className="bg-[#0F3A66] p-4 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold flex items-center">
                    <FaCalendarAlt className="mr-2 text-[#00A896]" />
                    Appointment System
                  </h2>
                  <p className="text-[10px] text-slate-300">DEMO SIMULATION</p>
                </div>
                <span className="bg-[#028090] text-white px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {appointments.length} simulated today
                </span>
              </div>
              <div className="p-4">
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button className="bg-[#F4F8FA] border border-[#D1E3EB] text-[#0A2342] p-2 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors text-xs font-semibold">
                    <FaRegCalendarCheck className="mr-1.5 text-[#028090]" />
                    New Appointment (Demo)
                  </button>
                  <button className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-2 rounded-lg flex items-center justify-center hover:bg-indigo-100 transition-colors text-xs font-semibold">
                    <MdPeople className="mr-1.5 text-indigo-600" />
                    Waiting List (Demo)
                  </button>
                </div>
                
                <div className="space-y-3">
                  {appointments.map(appointment => (
                    <div key={appointment.id} className="p-3 border border-[#D1E3EB] rounded-lg hover:bg-[#F4F8FA] transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm text-[#0A2342]">{appointment.patient}</h3>
                          <p className="text-xs text-slate-500">With {appointment.doctor}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${
                          appointment.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {appointment.status} (Demo)
                        </span>
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-slate-500">
                        <span>{appointment.date}</span>
                        <span className="font-semibold text-[#0A2342]">{appointment.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>


          {/* Report & Pharmacy Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report Delivery System */}
            <div className="bg-white rounded-xl shadow-xs border border-[#D1E3EB] overflow-hidden">
              <div className="bg-[#0F3A66] p-4 text-white flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center">
                  <FaFileMedical className="mr-2 text-[#00A896]" />
                  Report Delivery
                </h2>
                <span className="bg-[#028090] text-white px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  15 pending
                </span>
              </div>
              <div className="p-4">
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="bg-[#F4F8FA] border border-[#D1E3EB] p-2.5 rounded-lg text-center">
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className="font-bold text-[#0A2342] text-lg">15</p>
                  </div>
                  <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-2.5 rounded-lg text-center">
                    <p className="text-xs text-emerald-700">Completed</p>
                    <p className="font-bold text-emerald-900 text-lg">42</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-center">
                    <p className="text-xs text-amber-800">Delayed</p>
                    <p className="font-bold text-amber-900 text-lg">3</p>
                  </div>
                </div>
                <button className="w-full bg-[#F4F8FA] border border-[#D1E3EB] text-[#0A2342] py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm">
                  View All Reports
                </button>
              </div>
            </div>

            {/* Pharmacy Management */}
            <div className="bg-white rounded-xl shadow-xs border border-[#D1E3EB] overflow-hidden">
              <div className="bg-[#0F3A66] p-4 text-white flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center">
                  <MdLocalPharmacy className="mr-2 text-[#00A896]" />
                  Pharmacy System
                </h2>
                <span className="bg-[#028090] text-white px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  8 orders
                </span>
              </div>
              <div className="p-4">
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] p-2 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors text-xs font-semibold">
                    <GiMedicines className="mr-1.5 text-[#00A896]" />
                    New Prescription
                  </button>
                  <button className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-2 rounded-lg flex items-center justify-center hover:bg-indigo-100 transition-colors text-xs font-semibold">
                    <FaSearch className="mr-1.5 text-indigo-600" />
                    Medicine Search
                  </button>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border-l-4 border-amber-500">
                  <p className="text-xs font-bold text-amber-900">Low Stock Alert</p>
                  <p className="text-xs text-amber-700">5 medicines below threshold</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer/>
    </div>
  );
};

export default MedMindersHospitalDashboard;