import React from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiPhone, FiTruck } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const CustomerForm = ({ customerData, setCustomerData }) => {
  const handleInputChange = (field, value) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl shadow-lg p-6 mt-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <SafeIcon icon={FiUser} className="text-2xl text-green-600" />
        <h2 className="text-xl font-semibold text-gray-800">
          Customer Details
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer Name
          </label>
          <div className="relative">
            <SafeIcon icon={FiUser} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={customerData.name} 
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Juan Dela Cruz"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Number
          </label>
          <div className="relative">
            <SafeIcon icon={FiPhone} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="tel" 
              value={customerData.contact} 
              onChange={(e) => handleInputChange('contact', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="+63 912 345 6789"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit Details
          </label>
          <div className="relative">
            <SafeIcon icon={FiTruck} className="absolute left-3 top-4 text-gray-400" />
            <textarea 
              value={customerData.unitDetails} 
              onChange={(e) => handleInputChange('unitDetails', e.target.value)}
              rows={3}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Isuzu Forward Truck, 6-Wheeler, 2024 Model"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CustomerForm;