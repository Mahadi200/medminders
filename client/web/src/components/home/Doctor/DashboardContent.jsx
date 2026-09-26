import { motion } from 'framer-motion';
import { FaUserInjured, FaCalendarCheck, FaProcedures, FaFileMedical } from 'react-icons/fa';

const DashboardContent = ({ activeTab }) => {
  // Sample patient data
  const patients = [
    { id: 1, name: 'John Doe', age: 35, gender: 'Male', status: 'new', lastVisit: 'Never' },
    { id: 2, name: 'Jane Smith', age: 28, gender: 'Female', status: 'confirmed', lastVisit: '2023-05-15' },
    { id: 3, name: 'Robert Johnson', age: 45, gender: 'Male', status: 'pending', lastVisit: '2022-11-20' },
  ];

  const stats = [
    { title: 'New Patients', value: 12, icon: <FaUserInjured />, color: 'bg-blue-100 text-blue-600' },
    { title: 'Appointments', value: 8, icon: <FaCalendarCheck />, color: 'bg-green-100 text-green-600' },
    { title: 'Procedures', value: 5, icon: <FaProcedures />, color: 'bg-purple-100 text-purple-600' },
    { title: 'Documents', value: 23, icon: <FaFileMedical />, color: 'bg-yellow-100 text-yellow-600' },
  ];

  return (
    <div>
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Doctor Dashboard</h1>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                whileHover={{ y: -5 }}
                className={`${stat.color} p-4 rounded-xl shadow-sm`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className="text-3xl p-2 rounded-full bg-white bg-opacity-30">
                    {stat.icon}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Recent Patients */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Recent Patients</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {patients.map(patient => (
                <motion.div 
                  key={patient.id}
                  whileHover={{ backgroundColor: '#f8fafc' }}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FaUserInjured className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{patient.name}</h3>
                      <p className="text-sm text-gray-500">{patient.age} yrs, {patient.gender}</p>
                    </div>
                  </div>
                  <div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      patient.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      patient.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {patient.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'new-patient' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-6">New Patient Registration</h1>
          {/* Add new patient form here */}
        </motion.div>
      )}

      {/* Add other tab contents similarly */}
    </div>
  );
};

export default DashboardContent;