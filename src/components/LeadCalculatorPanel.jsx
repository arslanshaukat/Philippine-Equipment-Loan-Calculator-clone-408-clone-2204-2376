import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { FiPieChart, FiDollarSign, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import CustomerForm from './CustomerForm';
import ApprovalMeter from './ApprovalMeter';

const PieChart = React.lazy(() => import('./PieChart'));
const PDFGenerator = React.lazy(() => import('./PDFGenerator'));

const staffMembers = ['RHEA', 'MEL', 'PRINCESS', 'ARSLAN'];

// Embeddable version of the public PaymentCalculator, for use inside the
// logged-in admin dashboard's Leads page. Strips the marketing header,
// footer, and staff-login link (irrelevant once already logged in), and
// adds a "logged by" staff attribution field that PDFGenerator saves
// alongside the quotation record.
const LeadCalculatorPanel = () => {
  const [collapsed, setCollapsed] = useState(true);

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

  const [loggedBy, setLoggedBy] = useState('');

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

  const resetForNewEstimate = () => {
    setFormData({ equipmentPrice: '', downPayment: '', interestRate: '1.1', leaseTerm: 36 });
    setCustomerData({ name: '', contact: '', unitDetails: '' });
  };

  const pieData = [
    { name: 'Principal', value: calculations.totalPrincipal, color: '#3B82F6' },
    { name: 'Interest', value: calculations.totalInterest, color: '#EF4444' },
    { name: 'Down Payment', value: calculations.downPaymentAmount, color: '#10B981' }
  ];

  return (
    <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full p-6 lg:p-8 border-b bg-gray-50/50 flex items-center justify-between hover:bg-gray-100/50 transition-all"
      >
        <h2 className="font-black text-gray-800 flex items-center gap-3 uppercase text-xs tracking-widest">
          <div className="w-1 h-4 bg-blue-600 rounded-full" />
          New Estimate
        </h2>
        <SafeIcon icon={collapsed ? FiChevronDown : FiChevronUp} className="text-gray-400" />
      </button>

      {!collapsed && (
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-5">
                  <SafeIcon icon={FiPieChart} className="text-xl text-blue-600" />
                  <h3 className="text-base font-bold text-gray-800">Loan Calculator</h3>
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
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="₱ 300,000"
                    />
                    {formData.equipmentPrice && parseFloat(formData.equipmentPrice) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
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
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
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
              <div className="bg-gray-50 rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-5">
                  <SafeIcon icon={FiDollarSign} className="text-xl text-green-600" />
                  <h3 className="text-base font-bold text-gray-800">Payment Summary</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                      <h4 className="text-sm font-medium opacity-90">Monthly Payment</h4>
                      <p className="text-2xl font-bold">{formatCurrency(calculations.monthlyPayment)}</p>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
                      <h4 className="text-sm font-medium opacity-90">Total Investment</h4>
                      <p className="text-2xl font-bold">{formatCurrency(calculations.totalInvestment)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl p-3 border border-gray-100">
                        <h5 className="text-xs font-medium text-gray-600">Total Principal</h5>
                        <p className="text-lg font-semibold text-gray-800">{formatCurrency(calculations.totalPrincipal)}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-gray-100">
                        <h5 className="text-xs font-medium text-gray-600">Total Interest</h5>
                        <p className="text-lg font-semibold text-gray-800">{formatCurrency(calculations.totalInterest)}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                      <h5 className="text-xs font-medium text-gray-600">Down Payment</h5>
                      <p className="text-lg font-semibold text-gray-800">{formatCurrency(calculations.downPaymentAmount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center min-h-[200px]">
                    <Suspense fallback={<div className="animate-pulse text-xs text-gray-400">Loading chart...</div>}>
                      <PieChart data={pieData} />
                    </Suspense>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 mb-5">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                  {!loggedBy ? '⚠ Select Staff Before Generating' : 'Logged By'}
                </label>
                <select
                  value={loggedBy}
                  onChange={e => setLoggedBy(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-[10px] font-black uppercase outline-none ${!loggedBy ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-white'}`}
                >
                  <option value="">— Select Staff —</option>
                  {staffMembers.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <Suspense fallback={<div className="p-6 bg-white rounded-xl shadow-lg">Loading...</div>}>
                <PDFGenerator
                  formData={formData}
                  customerData={customerData}
                  calculations={calculations}
                  formatCurrency={formatCurrency}
                  loggedBy={loggedBy}
                  onSaved={resetForNewEstimate}
                />
              </Suspense>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadCalculatorPanel;
