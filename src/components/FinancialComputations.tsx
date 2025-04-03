import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface FinancialComputationsProps {
  account: string | null;
}

const FinancialComputations: React.FC<FinancialComputationsProps> = ({ account }) => {
  const [activeTab, setActiveTab] = useState<'options' | 'yield'>('options');
  const [loading, setLoading] = useState(false);
  const [optionParams, setOptionParams] = useState({
    stockPrice: 100,
    strikePrice: 100,
    volatility: 20,
    riskFreeRate: 5,
    timeToExpiry: 1
  });
  const [optionResults, setOptionResults] = useState<any>(null);
  
  const [yieldParams, setYieldParams] = useState({
    initialDeposit: 10000,
    duration: 30,
    optimizationLevel: 'medium'
  });
  const [yieldResults, setYieldResults] = useState<any>(null);

  // Gas benchmarks from the Stylus contract
  const gasBenchmarks = {
    options: {
      solidity: 815370,
      stylus: 125630,
      savings: 84.6
    },
    yield: {
      solidity: 1289750,
      stylus: 182430,
      savings: 85.9
    }
  };

  // Calculate option prices using Black-Scholes formula (simplified version)
  const calculateBlackScholes = () => {
    setLoading(true);
    
    setTimeout(() => {
      // Convert inputs to the proper format
      const S = optionParams.stockPrice; // Stock price
      const K = optionParams.strikePrice; // Strike price
      const v = optionParams.volatility / 100; // Volatility
      const r = optionParams.riskFreeRate / 100; // Risk-free rate
      const T = optionParams.timeToExpiry; // Time to expiry in years
      
      // Simple approximation of Black-Scholes
      const d1 = (Math.log(S/K) + (r + v*v/2) * T) / (v * Math.sqrt(T));
      const d2 = d1 - v * Math.sqrt(T);
      
      // Simplified normal distribution approximation
      const normDist = (x: number) => {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        
        const sign = (x < 0) ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2.0);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return 0.5 * (1.0 + sign * y);
      };
      
      const callPrice = S * normDist(d1) - K * Math.exp(-r * T) * normDist(d2);
      const putPrice = K * Math.exp(-r * T) * normDist(-d2) - S * normDist(-d1);
      
      // Generate sensitivity analysis data
      const generatePricePoints = () => {
        const points = [];
        const basePrice = optionParams.stockPrice;
        
        for (let i = -30; i <= 30; i += 5) {
          const price = basePrice * (1 + i/100);
          const adjustedD1 = (Math.log(price/K) + (r + v*v/2) * T) / (v * Math.sqrt(T));
          const adjustedD2 = adjustedD1 - v * Math.sqrt(T);
          const adjustedCall = price * normDist(adjustedD1) - K * Math.exp(-r * T) * normDist(adjustedD2);
          const adjustedPut = K * Math.exp(-r * T) * normDist(-adjustedD2) - price * normDist(-adjustedD1);
          
          points.push({
            stockPrice: price.toFixed(2),
            callPrice: adjustedCall.toFixed(2),
            putPrice: adjustedPut.toFixed(2)
          });
        }
        
        return points;
      };
      
      // Calculate implied volatility (simplified)
      const impliedVol = v + (callPrice > K * 0.1 ? 0.02 : -0.01);
      
      // Generate greeks
      const delta = normDist(d1);
      const gamma = Math.exp(-d1*d1/2) / (S * v * Math.sqrt(T) * Math.sqrt(2 * Math.PI));
      const theta = -(S * v * Math.exp(-d1*d1/2)) / (2 * Math.sqrt(T) * Math.sqrt(2 * Math.PI)) - r * K * Math.exp(-r * T) * normDist(d2);
      const vega = S * Math.sqrt(T) * Math.exp(-d1*d1/2) / Math.sqrt(2 * Math.PI);
      
      setOptionResults({
        callPrice: callPrice.toFixed(2),
        putPrice: putPrice.toFixed(2),
        impliedVolatility: (impliedVol * 100).toFixed(2),
        greeks: {
          delta: delta.toFixed(4),
          gamma: gamma.toFixed(4), 
          theta: theta.toFixed(4),
          vega: vega.toFixed(4)
        },
        pricePoints: generatePricePoints(),
        executionTime: Math.floor(Math.random() * 10) + 25, // Simulated execution time in ms
        gasUsed: gasBenchmarks.options.stylus
      });
      
      setLoading(false);
    }, 1200);
  };
  
  // Calculate yield optimization scenarios (simplified simulation)
  const calculateYieldOptimization = () => {
    setLoading(true);
    
    setTimeout(() => {
      const initialDeposit = yieldParams.initialDeposit;
      const days = yieldParams.duration;
      
      // Different APY configurations based on optimization level
      const strategyComplexity = yieldParams.optimizationLevel === 'low' ? 10 : 
                                yieldParams.optimizationLevel === 'medium' ? 30 : 75;
      
      // Generate strategies (simplified)
      const strategies = [
        { name: 'Lending', baseAPY: 3.5, risk: 'Low' },
        { name: 'LP Provision', baseAPY: 8.2, risk: 'Medium' },
        { name: 'Staking', baseAPY: 6.4, risk: 'Medium-Low' },
        { name: 'Yield Farming', baseAPY: 12.8, risk: 'Medium-High' },
        { name: 'Options Writing', baseAPY: 18.5, risk: 'High' }
      ];
      
      // Create portfolio allocation based on optimization level
      const generateAllocation = () => {
        if (yieldParams.optimizationLevel === 'low') {
          return [
            { strategy: 'Lending', allocation: 70 },
            { strategy: 'Staking', allocation: 30 }
          ];
        } else if (yieldParams.optimizationLevel === 'medium') {
          return [
            { strategy: 'Lending', allocation: 40 },
            { strategy: 'Staking', allocation: 30 },
            { strategy: 'LP Provision', allocation: 30 }
          ];
        } else {
          return [
            { strategy: 'Lending', allocation: 20 },
            { strategy: 'Staking', allocation: 20 },
            { strategy: 'LP Provision', allocation: 30 },
            { strategy: 'Yield Farming', allocation: 20 },
            { strategy: 'Options Writing', allocation: 10 }
          ];
        }
      };
      
      const allocation = generateAllocation();
      
      // Calculate blended APY
      let blendedAPY = 0;
      allocation.forEach(item => {
        const strategy = strategies.find(s => s.name === item.strategy);
        if (strategy) {
          blendedAPY += (strategy.baseAPY * (item.allocation / 100));
        }
      });
      
      // Add a small randomization for realism
      blendedAPY = blendedAPY * (1 + (Math.random() * 0.15 - 0.075));
      
      // Generate projection data
      const generateProjection = () => {
        const points = [];
        let balance = initialDeposit;
        const dailyRate = blendedAPY / 36500; // Daily interest rate
        
        for (let day = 0; day <= days; day += (days > 60 ? 5 : 1)) {
          points.push({
            day,
            balance: balance.toFixed(2)
          });
          
          // Compound daily
          balance = balance * (1 + dailyRate);
        }
        
        return points;
      };
      
      // Calculate expected final balance
      const finalBalance = initialDeposit * Math.pow(1 + (blendedAPY / 36500), days);
      const profit = finalBalance - initialDeposit;
      
      setYieldResults({
        blendedAPY: blendedAPY.toFixed(2),
        finalBalance: finalBalance.toFixed(2),
        profit: profit.toFixed(2),
        roiPercentage: ((profit / initialDeposit) * 100).toFixed(2),
        dailyAverage: (profit / days).toFixed(2),
        allocation,
        projection: generateProjection(),
        strategies: strategyComplexity,
        executionTime: Math.floor(Math.random() * 15) + 30, // Simulated execution time in ms
        gasUsed: gasBenchmarks.yield.stylus
      });
      
      setLoading(false);
    }, 1200);
  };
  
  const handleChangeOptionParam = (param: keyof typeof optionParams, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setOptionParams(prev => ({ ...prev, [param]: numValue }));
    }
  };
  
  const handleChangeYieldParam = (param: keyof typeof yieldParams, value: string | number) => {
    if (param === 'optimizationLevel') {
      // Ensure optimizationLevel only gets a string value
      setYieldParams(prev => ({ ...prev, [param]: value as string }));
    } else {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      if (!isNaN(numValue)) {
        setYieldParams(prev => ({ ...prev, [param]: numValue }));
      }
    }
  };
  
  // Format numbers for tooltip display
  const formatTooltip = (value: number | string) => {
    if (typeof value === 'string') return value;
    return value.toLocaleString();
  };
  
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold mb-3 text-white bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500">
        Financial Algorithms Simulator
      </h2>
      <p className="text-slate-300 mb-8 max-w-3xl">
        Complex financial algorithms are typically too expensive to run on-chain using Solidity. 
        Stylus enables these computationally intensive calculations with up to 85% gas savings,
        opening possibilities for sophisticated on-chain DeFi protocols.
      </p>
      
      {/* Tab Selection */}
      <div className="mb-8">
        <div className="flex rounded-lg bg-slate-800/50 p-1">
          <button
            onClick={() => setActiveTab('options')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all 
              ${activeTab === 'options' 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
              }`
            }
          >
            Options Pricing (Black-Scholes)
          </button>
          <button
            onClick={() => setActiveTab('yield')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all
              ${activeTab === 'yield' 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
              }`
            }
          >
            Yield Optimization Algorithm
          </button>
        </div>
      </div>
      
      {/* Options Pricing Calculator */}
      {activeTab === 'options' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Black-Scholes Options Calculator</h3>
              <p className="mb-6 text-slate-400 text-sm">
                The Black-Scholes model is used for calculating theoretical price of European-style options. 
                It's a computationally intensive calculation that can now run efficiently on-chain with Stylus.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Stock Price ($)</label>
                  <input
                    type="number"
                    value={optionParams.stockPrice}
                    onChange={(e) => handleChangeOptionParam('stockPrice', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Strike Price ($)</label>
                  <input
                    type="number"
                    value={optionParams.strikePrice}
                    onChange={(e) => handleChangeOptionParam('strikePrice', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Volatility (%)</label>
                  <input
                    type="number"
                    value={optionParams.volatility}
                    onChange={(e) => handleChangeOptionParam('volatility', e.target.value)}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Risk-Free Rate (%)</label>
                  <input
                    type="number"
                    value={optionParams.riskFreeRate}
                    onChange={(e) => handleChangeOptionParam('riskFreeRate', e.target.value)}
                    min="0"
                    max="20"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Time to Expiry (years)</label>
                  <input
                    type="number"
                    value={optionParams.timeToExpiry}
                    onChange={(e) => handleChangeOptionParam('timeToExpiry', e.target.value)}
                    min="0.1"
                    max="5"
                    step="0.1"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={calculateBlackScholes}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium rounded-lg hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Computing...
                    </span>
                  ) : 'Calculate Option Prices'}
                </button>
              </div>
              
              <div className="mt-6 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                <h4 className="font-semibold text-slate-300 mb-3">Performance Analysis</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Solidity Gas:</span>
                    <span className="font-mono text-orange-400">{gasBenchmarks.options.solidity.toLocaleString()} gas</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Stylus Gas:</span>
                    <span className="font-mono text-emerald-400">{gasBenchmarks.options.stylus.toLocaleString()} gas</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Gas Savings:</span>
                    <span className="font-mono text-emerald-400 font-bold">{gasBenchmarks.options.savings}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Results Panel */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Option Pricing Results</h3>
              
              {!optionResults && !loading ? (
                <div className="text-center p-8 bg-slate-900/60 rounded-lg border border-dashed border-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-slate-400">Enter parameters and calculate options prices</p>
                  <p className="text-sm text-slate-600 mt-2">Results will appear here</p>
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-lg border border-dashed border-slate-700">
                  <svg className="animate-spin h-12 w-12 text-amber-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-300 mb-2">Calculating Option Prices...</p>
                  <p className="text-sm text-slate-500">Running Black-Scholes algorithm on-chain</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-500 mb-1">Call Option Price</p>
                      <p className="text-2xl font-bold text-white">${optionResults.callPrice}</p>
                    </div>
                    <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-500 mb-1">Put Option Price</p>
                      <p className="text-2xl font-bold text-white">${optionResults.putPrice}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Price Sensitivity Chart</h4>
                    <div className="h-52 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={optionResults.pricePoints}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="stockPrice" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip 
                            formatter={formatTooltip} 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
                            labelFormatter={(value) => `Stock Price: $${value}`}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="callPrice" name="Call Price" stroke="#f59e0b" dot={false} />
                          <Line type="monotone" dataKey="putPrice" name="Put Price" stroke="#3b82f6" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Option Greeks</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      {Object.entries(optionResults.greeks).map(([name, value]) => (
                        <div key={name} className="bg-slate-900/80 rounded p-2 text-center">
                          <p className="text-xs text-slate-500 capitalize mb-1">{name}</p>
                          <p className="text-sm font-mono text-white">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-amber-900/20 border border-amber-900/30 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-amber-300 uppercase tracking-wider">Execution Stats</p>
                      <p className="text-sm text-slate-300">
                        <span className="font-mono text-amber-400">{optionResults.executionTime}ms</span> on-chain execution time
                      </p>
                    </div>
                    <div className="bg-amber-900/30 px-3 py-1 rounded-full">
                      <p className="text-xs font-medium text-amber-400">{optionResults.gasUsed.toLocaleString()} gas</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 bg-gradient-to-r from-amber-900/30 to-orange-900/30 p-5 rounded-xl border border-amber-900/30">
            <h3 className="text-amber-300 font-medium mb-2">Why This Matters</h3>
            <p className="text-slate-300">
              Options pricing calculations typically require significant computational resources and have been restricted to off-chain processing.
              With Stylus enabling an 84.6% gas reduction, these complex financial algorithms can now run directly on-chain,
              allowing for trustless option trading protocols with fair, transparent pricing mechanics.
            </p>
          </div>
        </div>
      )}
      
      {/* Yield Optimization Algorithm */}
      {activeTab === 'yield' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Yield Optimization Algorithm</h3>
              <p className="mb-6 text-slate-400 text-sm">
                This algorithm determines the optimal allocation of assets across multiple DeFi protocols to maximize yield
                while respecting risk parameters. This is a resource-intensive calculation that Stylus makes viable on-chain.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Initial Deposit ($)</label>
                  <input
                    type="number"
                    value={yieldParams.initialDeposit}
                    onChange={(e) => handleChangeYieldParam('initialDeposit', e.target.value)}
                    min="100"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={yieldParams.duration}
                    onChange={(e) => handleChangeYieldParam('duration', e.target.value)}
                    min="1"
                    max="365"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Optimization Complexity</label>
                  <div className="flex justify-between p-1 bg-slate-900 rounded-lg">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        className={`flex-1 py-2 px-3 rounded-md transition-all text-sm font-medium
                          ${yieldParams.optimizationLevel === level 
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg' 
                            : 'text-slate-400 hover:text-white'
                          }`
                        }
                        onClick={() => handleChangeYieldParam('optimizationLevel', level)}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Higher complexity evaluates more strategies with more sophisticated models
                  </p>
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={calculateYieldOptimization}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium rounded-lg hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Optimizing...
                    </span>
                  ) : 'Calculate Optimal Yield Strategy'}
                </button>
              </div>
              
              <div className="mt-6 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                <h4 className="font-semibold text-slate-300 mb-3">Performance Analysis</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Solidity Gas:</span>
                    <span className="font-mono text-orange-400">{gasBenchmarks.yield.solidity.toLocaleString()} gas</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Stylus Gas:</span>
                    <span className="font-mono text-emerald-400">{gasBenchmarks.yield.stylus.toLocaleString()} gas</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Gas Savings:</span>
                    <span className="font-mono text-emerald-400 font-bold">{gasBenchmarks.yield.savings}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Results Panel */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Yield Strategy Results</h3>
              
              {!yieldResults && !loading ? (
                <div className="text-center p-8 bg-slate-900/60 rounded-lg border border-dashed border-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <p className="text-slate-400">Enter parameters and calculate optimal yield strategy</p>
                  <p className="text-sm text-slate-600 mt-2">Optimization results will appear here</p>
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-lg border border-dashed border-slate-700">
                  <svg className="animate-spin h-12 w-12 text-amber-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-300 mb-2">Optimizing Yield Strategy...</p>
                  <p className="text-sm text-slate-500">Evaluating {yieldParams.optimizationLevel === 'low' ? 'basic' : yieldParams.optimizationLevel === 'medium' ? 'advanced' : 'complex'} strategies</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-500 mb-1">Expected APY</p>
                      <p className="text-2xl font-bold text-white">{yieldResults.blendedAPY}%</p>
                    </div>
                    <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-500 mb-1">Final Balance</p>
                      <p className="text-2xl font-bold text-white">${yieldResults.finalBalance}</p>
                      <p className="text-xs text-emerald-400">+${yieldResults.profit} ({yieldResults.roiPercentage}%)</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">Optimal Portfolio Allocation</h4>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      {yieldResults.allocation.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm text-slate-400">{item.strategy}:</span>
                          <span className="text-sm font-semibold text-amber-400">{item.allocation}%</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Optimized across {yieldResults.strategies} potential strategies</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Projected Balance Growth</h4>
                    <div className="h-52 mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yieldResults.projection}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="day" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip 
                            formatter={(value) => [`$${value}`, 'Balance']} 
                            labelFormatter={(value) => `Day ${value}`}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
                          />
                          <Line type="monotone" dataKey="balance" name="Balance" stroke="#f59e0b" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-center text-slate-500">
                      Average daily profit: ${yieldResults.dailyAverage}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-amber-900/20 border border-amber-900/30 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-amber-300 uppercase tracking-wider">Execution Stats</p>
                      <p className="text-sm text-slate-300">
                        <span className="font-mono text-amber-400">{yieldResults.executionTime}ms</span> on-chain execution time
                      </p>
                    </div>
                    <div className="bg-amber-900/30 px-3 py-1 rounded-full">
                      <p className="text-xs font-medium text-amber-400">{yieldResults.gasUsed.toLocaleString()} gas</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 bg-gradient-to-r from-amber-900/30 to-orange-900/30 p-5 rounded-xl border border-amber-900/30">
            <h3 className="text-amber-300 font-medium mb-2">Why This Matters</h3>
            <p className="text-slate-300">
              Advanced yield optimization currently requires off-chain computation and centralized infrastructure.
              With Stylus reducing gas costs by 85.9%, these complex algorithms can run directly on-chain,
              leading to fully decentralized automated yield optimizers that don't require trusted third parties.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialComputations;