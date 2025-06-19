import { motion } from 'framer-motion';
import { FaHeartbeat, FaClinicMedical, FaRegHeart } from 'react-icons/fa';

const MediMindersLoader = () => {
  const pulseVariants = {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.1, 1],
      transition: { 
        repeat: Infinity,
        duration: 1.5,
        ease: "easeInOut"
      }
    }
  };

  const heartbeatVariants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.3, 1],
      transition: {
        repeat: Infinity,
        duration: 1.2,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-50 space-y-8">
      {/* Animated Medical Logo */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 1.8,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <div className="relative w-32 h-32">
          {/* Pulse Circle */}
          <motion.div
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-400 to-green-400 opacity-20"
          />
          
          {/* Heartbeat Icon */}
          <motion.div
            variants={heartbeatVariants}
            initial="initial"
            animate="animate"
            className="absolute inset-0 flex items-center justify-center"
          >
            <FaHeartbeat className="text-6xl text-red-500" />
          </motion.div>
          
          {/* Clinic Icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -bottom-2 -right-2"
          >
            <FaClinicMedical className="text-3xl text-green-500" />
          </motion.div>
        </div>
      </motion.div>

      {/* Health is Wealth Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center space-y-4"
      >
        <motion.h3
          animate={{ 
            textShadow: ["0 0 0px #10b981", "0 0 10px #10b981", "0 0 0px #10b981"],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut"
          }}
          className="text-3xl font-bold text-gray-800"
        >
          Health is Wealth
        </motion.h3>
        
        <p className="text-gray-600">Loading your medical resources...</p>
      </motion.div>

      {/* Animated Hearts Progress */}
      <div className="flex space-x-3">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.7, opacity: 0.5 }}
            animate={{ 
              scale: [0.7, 1.2, 0.7],
              opacity: [0.5, 1, 0.5],
              y: [0, -10, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          >
            <FaRegHeart className="text-2xl text-pink-500" />
          </motion.div>
        ))}
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "80%" }}
        transition={{
          duration: 3,
          ease: "easeInOut"
        }}
        className="h-2 bg-gray-200 rounded-full overflow-hidden max-w-md"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 2,
            ease: "easeInOut"
          }}
          className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500"
        />
      </motion.div>
    </div>
  );
};

export default MediMindersLoader;