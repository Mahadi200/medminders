import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaStethoscope, FaBrain, FaHeart, FaBone, FaChild, FaAllergies } from 'react-icons/fa';

const specialistIcons = {
  Cardiology: <FaHeart className="text-red-500 text-2xl" />,
  Neurology: <FaBrain className="text-blue-500 text-2xl" />,
  Orthopedics: <FaBone className="text-yellow-500 text-2xl" />,
  Pediatrics: <FaChild className="text-green-500 text-2xl" />,
  Dermatology: <FaAllergies className="text-purple-500 text-2xl" />,
  General: <FaStethoscope className="text-teal-500 text-2xl" />
};

const specialistSuggestions = {
  chest: "Cardiology",
  heart: "Cardiology",
  headache: "Neurology",
  migraine: "Neurology",
  bone: "Orthopedics",
  fracture: "Orthopedics",
  child: "Pediatrics",
  baby: "Pediatrics",
  skin: "Dermatology",
  rash: "Dermatology",
  pain: "General",
  fever: "General"
};

const HelpDesk = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeSymptoms = () => {
    setIsAnalyzing(true);
    
    // Simulate AI processing delay
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      let foundSpecialty = "General";
      
      for (const [keyword, specialty] of Object.entries(specialistSuggestions)) {
        if (lowerQuery.includes(keyword)) {
          foundSpecialty = specialty;
          break;
        }
      }
      
      setSuggestion(foundSpecialty);
      setIsAnalyzing(false);
    }, 1500);
  };

  const resetForm = () => {
    setQuery('');
    setSuggestion(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                AI Medical Help Desk
              </h2>
              <motion.button
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <FaTimes className="text-xl" />
              </motion.button>
            </div>

            {!suggestion ? (
              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Describe your symptoms or health concern..."
                    className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows="4"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={analyzeSymptoms}
                  disabled={!query.trim() || isAnalyzing}
                  className={`w-full py-3 px-4 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                    !query.trim() || isAnalyzing
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    "Get AI Suggestion"
                  )}
                </motion.button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">Based on your symptoms:</h3>
                  <div className="inline-flex items-center justify-center p-4 bg-gray-800 rounded-full border-2 border-blue-500">
                    {specialistIcons[suggestion]}
                  </div>
                  <h2 className="text-3xl font-bold text-white mt-4">{suggestion}</h2>
                  <p className="text-gray-400 mt-2">
                    We recommend consulting with a {suggestion.toLowerCase()} specialist
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={resetForm}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-all"
                  >
                    Ask Another Question
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                    className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white py-2 px-4 rounded-lg transition-all"
                  >
                    Find a Specialist
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HelpDesk;