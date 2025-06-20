import { FaPills, FaFileMedical, FaHeartbeat, FaCalendarAlt, FaUserMd, FaPrint } from 'react-icons/fa';
import { MdBloodtype, MdVaccines } from 'react-icons/md';
import { GiHealthNormal } from 'react-icons/gi';
import { motion } from 'framer-motion';
import Navbar from '../Navbar'
import Footer from '../Footer'

const PatientDashboard = () => {
  // Mock patient data
  const patientInfo = {
    name: "Mohammad Rahman",
    age: 42,
    gender: "Male",
    bloodGroup: "B+",
    height: "5'8\"",
    weight: "78 kg",
    lastVisit: "2023-06-15",
    photo: "https://randomuser.me/api/portraits/men/32.jpg"
  };

  // Current prescriptions
  const prescriptions = [
    {
      id: 1,
      medicine: "Ciprofloxacin 500mg",
      dosage: "1 tablet twice daily",
      duration: "7 days",
      purpose: "Urinary Tract Infection",
      prescribedBy: "Dr. Fatima Begum",
      date: "2023-06-10",
      status: "Active"
    },
    {
      id: 2,
      medicine: "Metformin 850mg",
      dosage: "1 tablet with breakfast",
      duration: "Ongoing",
      purpose: "Type 2 Diabetes",
      prescribedBy: "Dr. Abdullah Khan",
      date: "2023-03-15",
      status: "Active"
    },
    {
      id: 3,
      medicine: "Atorvastatin 20mg",
      dosage: "1 tablet at bedtime",
      duration: "Ongoing",
      purpose: "High Cholesterol",
      prescribedBy: "Dr. Abdullah Khan",
      date: "2023-03-15",
      status: "Active"
    }
  ];

  // Test reports
  const testReports = [
    {
      id: 1,
      testName: "Complete Blood Count (CBC)",
      date: "2023-06-12",
      lab: "Popular Diagnostics",
      status: "Completed",
      results: {
        "WBC": "6.5 x10³/μL",
        "RBC": "4.7 x10⁶/μL",
        "Hemoglobin": "14.2 g/dL",
        "Platelets": "250 x10³/μL"
      }
    },
    {
      id: 2,
      testName: "Urine Culture",
      date: "2023-06-12",
      lab: "Labaid Diagnostics",
      status: "Completed",
      results: {
        "Bacteria": "Present",
        "WBC": "8-10/HPF",
        "RBC": "0-2/HPF",
        "Sensitivity": "Sensitive to Ciprofloxacin"
      }
    },
    {
      id: 3,
      testName: "HbA1c",
      date: "2023-03-10",
      lab: "Popular Diagnostics",
      status: "Completed",
      results: {
        "HbA1c": "7.2%",
        "Average Glucose": "160 mg/dL"
      }
    }
  ];

  // Disease history
  const diseaseHistory = [
    {
      id: 1,
      disease: "Type 2 Diabetes",
      diagnosed: "2019",
      status: "Chronic",
      symptoms: "Increased thirst, frequent urination",
      treatment: "Metformin, Diet control"
    },
    {
      id: 2,
      disease: "Hypertension",
      diagnosed: "2020",
      status: "Controlled",
      symptoms: "Occasional headaches",
      treatment: "Lifestyle modification"
    },
    {
      id: 3,
      disease: "UTI (Current)",
      diagnosed: "2023-06-10",
      status: "Active",
      symptoms: "Burning sensation, fever",
      treatment: "Ciprofloxacin"
    }
  ];

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen">
        <Navbar/>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-teal-500 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <GiHealthNormal className="text-3xl" />
            <h1 className="text-2xl font-bold">MedMinders Patient Portal</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="bg-cyan-400 bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
              <FaPrint className="inline mr-2" />
              Print Records
            </button>
            <div className="flex items-center space-x-2">
              <img 
                src={patientInfo.photo} 
                alt="Patient" 
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <span className="font-medium">{patientInfo.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Profile Card */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="lg:col-span-1 bg-cyan-400rounded-xl shadow-md overflow-hidden"
        >
          <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-6 text-center text-white">
            <img 
              src={patientInfo.photo} 
              alt="Patient" 
              className="w-24 h-24 rounded-full border-4 border-white mx-auto mb-4"
            />
            <h2 className="text-xl font-bold">{patientInfo.name}</h2>
            <p className="text-blue-100">{patientInfo.age} years, {patientInfo.gender}</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Blood Group</p>
                <p className="font-semibold flex items-center">
                  <MdBloodtype className="text-red-500 mr-2" />
                  {patientInfo.bloodGroup}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Height/Weight</p>
                <p className="font-semibold">{patientInfo.height} / {patientInfo.weight}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <FaCalendarAlt className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Last Visit</p>
                  <p className="font-medium">{patientInfo.lastVisit}</p>
                </div>
              </div>
              <div className="flex items-center">
                <FaUserMd className="text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Primary Doctor</p>
                  <p className="font-medium">Dr. Fatima Begum</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Dashboard Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prescriptions Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center">
                <FaPills className="mr-2" />
                Current Prescriptions
              </h2>
              <span className="bg-amber-200 text-black bg-opacity-20 px-3 py-1 rounded-full text-sm">
                {prescriptions.length} active
              </span>
            </div>
            <div className="divide-y divide-gray-200">
              {prescriptions.map(prescription => (
                <div key={prescription.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{prescription.medicine}</h3>
                      <p className="text-gray-600">{prescription.purpose}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      prescription.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {prescription.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Dosage</p>
                      <p className="font-medium">{prescription.dosage}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium">{prescription.duration}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Prescribed By</p>
                      <p className="font-medium">{prescription.prescribedBy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Test Reports Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center">
                <FaFileMedical className="mr-2" />
                Test Reports
              </h2>
              <span className="bg-amber-200 text-black bg-opacity-20 px-3 py-1 rounded-full text-sm">
                {testReports.length} reports
              </span>
            </div>
            <div className="divide-y divide-gray-200">
              {testReports.map(report => (
                <div key={report.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{report.testName}</h3>
                      <p className="text-gray-600">{report.lab} • {report.date}</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {report.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(report.results).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-500">{key}</p>
                        <p className="font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Disease History Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center">
                <FaHeartbeat className="mr-2" />
                Disease History
              </h2>
              <span className="bg-amber-200 text-black bg-opacity-20 px-3 py-1 rounded-full text-sm">
                {diseaseHistory.length} conditions
              </span>
            </div>
            <div className="divide-y divide-gray-200">
              {diseaseHistory.map(disease => (
                <div key={disease.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{disease.disease}</h3>
                      <p className="text-gray-600">Diagnosed: {disease.diagnosed}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      disease.status === 'Active' ? 'bg-red-100 text-red-800' :
                      disease.status === 'Chronic' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {disease.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Symptoms</p>
                      <p className="font-medium">{disease.symptoms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Treatment</p>
                      <p className="font-medium">{disease.treatment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer/>
    </div>
  );
};

export default PatientDashboard;