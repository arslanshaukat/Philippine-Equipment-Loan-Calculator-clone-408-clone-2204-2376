import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiTruck, FiPieChart, FiMapPin, FiPhone, FiDollarSign, FiSettings } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import CustomerForm from './CustomerForm';
import ApprovalMeter from './ApprovalMeter';

const PieChart = React.lazy(() => import('./PieChart'));
const PDFGenerator = React.lazy(() => import('./PDFGenerator'));

const PaymentCalculator = () => {
  const [formData, setFormData] = useState({
    equipmentPrice: '',
    downPayment: '',
    interestRate: '1.1',
    leaseTerm: 36
  });

  const [customerData, setCustomerData] = useState({
    name: '',
    contact: '',
    unitDetails: ''
  });

  const [calculations, setCalculations] = useState({
    monthlyPayment: 0,
    totalInvestment: 0,
    totalPrincipal: 0,
    totalInterest: 0,
    downPaymentAmount: 0
  });

  const leaseTermOptions = [12, 24, 36, 48, 60];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculatePayments = () => {
    const price = parseFloat(formData.equipmentPrice) || 0;
    const downPayment = parseFloat(formData.downPayment) || 0;
    const rate = parseFloat(formData.interestRate) || 0;
    const term = parseInt(formData.leaseTerm) || 36;

    if (price <= 0 || downPayment < 0 || rate < 0) {
      setCalculations({
        monthlyPayment: 0,
        totalInvestment: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        downPaymentAmount: 0
      });
      return;
    }

    const principal = price - downPayment;
    const monthlyRate = rate / 100;

    let monthlyPayment = 0;
    if (monthlyRate > 0) {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    } else {
      monthlyPayment = principal / term;
    }

    const totalPayments = monthlyPayment * term;
    const totalInterest = totalPayments - principal;
    const totalInvestment = totalPayments + downPayment;

    setCalculations({
      monthlyPayment,
      totalInvestment,
      totalPrincipal: principal,
      totalInterest,
      downPaymentAmount: downPayment
    });
  };

  useEffect(() => {
    calculatePayments();
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const setSuggestedDP = (percent) => {
    const price = parseFloat(formData.equipmentPrice) || 0;
    const amount = (price * (percent / 100)).toString();
    handleInputChange('downPayment', amount);
  };

  const pieData = [
    { name: 'Principal', value: calculations.totalPrincipal, color: '#3B82F6' },
    { name: 'Interest', value: calculations.totalInterest, color: '#EF4444' },
    { name: 'Down Payment', value: calculations.downPaymentAmount, color: '#10B981' }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <SafeIcon icon={FiTruck} className="text-5xl text-blue-700" />
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
            GT International Inc
          </h1>
        </div>
        <p className="text-xl font-medium text-blue-600 mb-4">
          Heavy Equipment & Truck Payment Calculator
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-gray-500 max-w-2xl mx-auto">
          <div className="flex items-center gap-1">
            <SafeIcon icon={FiMapPin} className="text-blue-500" />
            <span>Subic Bay Freeport Zone, 2200 Zambales</span>
          </div>
          <div className="flex items-center gap-1">
            <SafeIcon icon={FiPhone} className="text-blue-500" />
            <span>+63 927 073 3100 / +63 960 072 8684</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <SafeIcon icon={FiPieChart} className="text-2xl text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">
                Loan Calculator
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment/Truck Price (PHP)
                </label>
                <input 
                  type="number" 
                  value={formData.equipmentPrice}
                  onChange={(e) => handleInputChange('equipmentPrice', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="₱ 1,500,000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Down Payment (PHP)
                </label>
                <input 
                  type="number" 
                  value={formData.downPayment}
                  onChange={(e) => handleInputChange('downPayment', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="₱ 300,000"
                />
                
                {/* Dynamic Downpayment Suggestions */}
                {formData.equipmentPrice && parseFloat(formData.equipmentPrice) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    {[15, 20, 30].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setSuggestedDP(pct)}
                        className="flex-1 min-w-[80px] py-1.5 px-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all text-center"
                      >
                        {pct}% ({formatCurrency(parseFloat(formData.equipmentPrice) * (pct / 100))})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <ApprovalMeter 
                equipmentPrice={formData.equipmentPrice} 
                downPayment={formData.downPayment} 
              />

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interest Rate Per Month (%)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) => handleInputChange('interestRate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Financing Term (Months)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {leaseTermOptions.map(term => (
                    <button
                      key={term}
                      onClick={() => handleInputChange('leaseTerm', term)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.leaseTerm === term 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {term}mo
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <CustomerForm customerData={customerData} setCustomerData={setCustomerData} />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <SafeIcon icon={FiDollarSign} className="text-2xl text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800">
                Payment Summary
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                  <h3 className="text-sm font-medium opacity-90">Monthly Payment</h3>
                  <p className="text-2xl font-bold">
                    {formatCurrency(calculations.monthlyPayment)}
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                  <h3 className="text-sm font-medium opacity-90">Total Investment</h3>
                  <p className="text-2xl font-bold">
                    {formatCurrency(calculations.totalInvestment)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-gray-600">Total Principal</h4>
                    <p className="text-lg font-semibold text-gray-800">
                      {formatCurrency(calculations.totalPrincipal)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-gray-600">Total Interest</h4>
                    <p className="text-lg font-semibold text-gray-800">
                      {formatCurrency(calculations.totalInterest)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-xs font-medium text-gray-600">Down Payment</h4>
                  <p className="text-lg font-semibold text-gray-800">
                    {formatCurrency(calculations.downPaymentAmount)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center min-h-[250px]">
                <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
                  <PieChart data={pieData} />
                </Suspense>
              </div>
            </div>
          </div>

          <Suspense fallback={<div className="p-6 bg-white rounded-xl shadow-lg">Loading...</div>}>
            <PDFGenerator 
              formData={formData} 
              customerData={customerData} 
              calculations={calculations}
              formatCurrency={formatCurrency}
            />
          </Suspense>
        </motion.div>
      </div>

      <footer className="mt-12 text-center text-gray-500 text-xs border-t pt-8 pb-12">
        <p className="font-bold text-gray-700 mb-1 uppercase tracking-wider">GT International Inc</p>
        <p>D2A Industrial Lot 37B, 4th St Extension, Industrial District, THEP, SBFZ Tipo</p>
        <p>Subic Bay Freeport Zone, 2200 Zambales, Philippines</p>
        
        <div className="mt-8 flex justify-center">
          <Link to="/admin" className="flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors group">
            <SafeIcon icon={FiSettings} className="group-hover:rotate-90 transition-transform duration-500" />
            <span>Staff Login</span>
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default PaymentCalculator;