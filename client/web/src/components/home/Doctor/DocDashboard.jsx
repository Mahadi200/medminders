import { useState, useEffect } from 'react';

import { 
  FaBell, 
  FaCalendarAlt, 
  FaUserInjured, 
  FaStethoscope, 
  FaClinicMedical, 
  FaChartLine, 
  FaProcedures, 
  FaNotesMedical, 
  FaEnvelope, 
  FaPhone 
} from 'react-icons/fa';
import { MdBloodtype, MdVaccines } from 'react-icons/md';
import { GiHealing, GiHealthNormal } from 'react-icons/gi';

const DocDashboard = () => {
  // Mock data for doctor information
 const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Sarah Johnson",
    specialization: "Cardiologist",
    hospital: "City General Hospital",
    experience: "12 years",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
    contact: "+1 (555) 123-4567",
    email: "sarah.johnson@medical.com"
  });

  // Mock data for patient bookings
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      patientName: "Michael Brown",
      photo: "https://randomuser.me/api/portraits/men/32.jpg",
      age: 45,
      gender: "Male",
      time: "09:30 AM",
      date: "2023-06-15",
      status: "Confirmed",
      reason: "Chest pain evaluation",
      height: "5'11\"",
      weight: "185 lbs",
      bloodPressure: "120/80",
      temperature: "98.6°F"
    },
    {
      id: 2,
      patientName: "Emily Davis",
      photo: "https://randomuser.me/api/portraits/women/63.jpg",
      age: 32,
      gender: "Female",
      time: "11:15 AM",
      date: "2023-06-15",
      status: "Confirmed",
      reason: "Annual checkup",
      height: "5'4\"",
      weight: "132 lbs",
      bloodPressure: "118/76",
      temperature: "98.2°F"
    },
    {
      id: 3,
      patientName: "Robert Wilson",
      photo: "https://randomuser.me/api/portraits/men/75.jpg",
      age: 58,
      gender: "Male",
      time: "02:00 PM",
      date: "2023-06-15",
      status: "Pending",
      reason: "ECG follow-up",
      height: "6'1\"",
      weight: "210 lbs",
      bloodPressure: "135/85",
      temperature: "98.9°F"
    }
  ]);

  // Mock notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "New appointment request from James Smith",
      time: "10 mins ago",
      read: false
    },
    {
      id: 2,
      message: "Your article was featured in Medical Journal",
      time: "2 hours ago",
      read: false
    },
    {
      id: 3,
      message: "Hospital staff meeting at 3:00 PM",
      time: "Yesterday",
      read: true
    }
  ]);

  // Stats data
  const [stats, setStats] = useState([
    { title: "Today's Appointments", value: 5, icon: <FaCalendarAlt />, color: "bg-blue-100 text-blue-600" },
    { title: "Pending Approvals", value: 2, icon: <FaUserInjured />, color: "bg-yellow-100 text-yellow-600" },
    { title: "Total Patients", value: 1243, icon: <FaStethoscope />, color: "bg-green-100 text-green-600" },
    { title: "Monthly Revenue", value: "$28,750", icon: <FaChartLine />, color: "bg-purple-100 text-purple-600" }
  ]);

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? {...notification, read: true} : notification
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-teal-500 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <GiHealthNormal className="text-3xl" />
            <h1 className="text-2xl font-bold">MedMinders Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <FaBell className="text-2xl cursor-pointer" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <img 
                src={doctorInfo.photo} 
                alt="Doctor" 
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <span className="font-medium">{doctorInfo.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Doctor Profile Card */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-6 text-center text-white">
            <img 
              src={doctorInfo.photo} 
              alt="Doctor" 
              className="w-24 h-24 rounded-full border-4 border-white mx-auto mb-4"
            />
            <h2 className="text-xl font-bold">{doctorInfo.name}</h2>
            <p className="text-blue-100">{doctorInfo.specialization}</p>
          </div>
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Information</h3>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center">
                  <FaClinicMedical className="text-blue-500 mr-2" />
                  <span>{doctorInfo.hospital}</span>
                </li>
                <li className="flex items-center">
                  <FaStethoscope className="text-blue-500 mr-2" />
                  <span>{doctorInfo.experience} experience</span>
                </li>
                <li className="flex items-center">
                  <FaEnvelope className="text-blue-500 mr-2" />
                  <span>{doctorInfo.email}</span>
                </li>
                <li className="flex items-center">
                  <FaPhone className="text-blue-500 mr-2" />
                  <span>{doctorInfo.contact}</span>
                </li>
              </ul>
            </div>
            <button className="w-full bg-gradient-to-r from-blue-500 to-teal-400 text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
              Edit Profile
            </button>
          </div>
        </div>

        {/* Main Dashboard Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className={`${stat.color} p-4 rounded-xl shadow-sm`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className="text-3xl p-2 rounded-full bg-white bg-opacity-30">
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Appointments */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center">
                <FaCalendarAlt className="mr-2" />
                Today's Appointments
              </h2>
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                {appointments.length} appointments
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {appointments.map(appointment => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img className="h-10 w-10 rounded-full" src={appointment.photo} alt={appointment.patientName} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                            <div className="text-sm text-gray-500">{appointment.age} yrs, {appointment.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{appointment.time}</div>
                        <div className="text-sm text-gray-500">{appointment.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.reason}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                        <button className="text-green-600 hover:text-green-900">Start</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notifications and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white">
                <h2 className="text-xl font-bold flex items-center">
                  <FaBell className="mr-2" />
                  Notifications
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex justify-between">
                      <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white">
                <h2 className="text-xl font-bold flex items-center">
                  <FaProcedures className="mr-2" />
                  Quick Actions
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4">
                <button className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-4 rounded-lg flex flex-col items-center justify-center transition-colors">
                  <FaNotesMedical className="text-2xl mb-2" />
                  <span className="text-sm font-medium">New Prescription</span>
                </button>
                <button className="bg-green-50 hover:bg-green-100 text-green-600 p-4 rounded-lg flex flex-col items-center justify-center transition-colors">
                  <MdBloodtype className="text-2xl mb-2" />
                  <span className="text-sm font-medium">Lab Reports</span>
                </button>
                <button className="bg-purple-50 hover:bg-purple-100 text-purple-600 p-4 rounded-lg flex flex-col items-center justify-center transition-colors">
                  <GiHealing className="text-2xl mb-2" />
                  <span className="text-sm font-medium">Patient Records</span>
                </button>
                <button className="bg-yellow-50 hover:bg-yellow-100 text-yellow-600 p-4 rounded-lg flex flex-col items-center justify-center transition-colors">
                  <MdVaccines className="text-2xl mb-2" />
                  <span className="text-sm font-medium">Vaccination</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocDashboard;