import React from 'react';
import { motion } from 'framer-motion';
import { FiInfo, FiTrendingUp } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const ApprovalMeter = ({ equipmentPrice, downPayment }) => {
  const price = parseFloat(equipmentPrice) || 0;
  const dp = parseFloat(downPayment) || 0;
  
  if (price <= 0) return null;

  const percentage = (dp / price) * 100;
  
  let status = {
    label: 'Less Likely',
    color: 'bg-red-500',
    textColor: 'text-red-600',
    width: 'w-1/3',
    message: 'A higher down payment (15%+) is recommended for better approval odds.'
  };

  if (percentage >= 15 && percentage < 25) {
    status = {
      label: 'High Chances',
      color: 'bg-yellow-400',
      textColor: 'text-yellow-600',
      width: 'w-2/3',
      message: 'Good down payment range. Financing approval is likely.'
    };
  } else if (percentage >= 25) {
    status = {
      label: 'Highly Likely',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      width: 'w-full',
      message: 'Excellent down payment. High probability of financing approval.'
    };
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <SafeIcon icon={FiTrendingUp} className={`text-lg ${status.textColor}`} />
          <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Approval Probability
          </span>
        </div>
        <span className={`text-sm font-bold ${status.textColor}`}>
          {status.label} ({percentage.toFixed(1)}%)
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage * 2, 100)}%` }}
          className={`h-full transition-all duration-500 ${status.color}`}
        />
      </div>

      <div className="flex items-start gap-2">
        <SafeIcon icon={FiInfo} className="text-gray-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-500 leading-relaxed">
          {status.message}
        </p>
      </div>
    </motion.div>
  );
};

export default ApprovalMeter;