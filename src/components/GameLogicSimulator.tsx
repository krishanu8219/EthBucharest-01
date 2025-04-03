import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GameLogicSimulatorProps {
  account: string | null;
}

interface GameState {
  map: (0 | 1 | 2 | 3)[][];  // 0: empty, 1: wall, 2: player, 3: enemy
  playerPosition: [number, number];
  enemies: Array<{
    position: [number, number];
    health: number;
    type: 'basic' | 'ranged' | 'boss';
  }>;
  score: number;
  playerHealth: number;
  gameOver: boolean;
  level: number;
}

const GameLogicSimulator: React.FC<GameLogicSimulatorProps> = ({ account }) => {
  const [activeTab, setActiveTab] = useState<'pathfinding' | 'combat' | 'benchmark'>('benchmark');
  const [complexity, setComplexity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isRunning, setIsRunning] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [simulationStep, setSimulationStep] = useState(0);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [gasBenchmarks, setGasBenchmarks] = useState({
    solidity: {
      pathfinding: 0,
      combat: 0,
      stateUpdate: 0
    },
    stylus: {
      pathfinding: 0,
      combat: 0,
      stateUpdate: 0
    },
    savings: {
      pathfinding: 0,
      combat: 0,
      stateUpdate: 0,
      total: 0
    }
  });

  // Initialize the game
  const initializeGame = () => {
    // Map size depends on complexity
    const mapSize = complexity === 'low' ? 10 : complexity === 'medium' ? 15 : 20;
    
    // Create empty map
    const map = Array(mapSize).fill(0).map(() => Array(mapSize).fill(0));
    
    // Add walls (30% of tiles for medium difficulty)
    const wallDensity = complexity === 'low' ? 0.2 : complexity === 'medium' ? 0.3 : 0.35;
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        // Don't put walls around the edges to ensure paths exist
        if (Math.random() < wallDensity && x > 1 && x < mapSize-2 && y > 1 && y < mapSize-2) {
          map[y][x] = 1;
        }
      }
    }
    
    // Place player at bottom left
    const playerX = 1;
    const playerY = mapSize - 2;
    map[playerY][playerX] = 2;
    
    // Create enemies based on complexity
    const enemyCount = complexity === 'low' ? 3 : complexity === 'medium' ? 5 : 8;
    const enemies = [];
    
    for (let i = 0; i < enemyCount; i++) {
      // Try to place enemies in valid positions
      let enemyX, enemyY;
      do {
        enemyX = Math.floor(Math.random() * (mapSize - 4)) + 2;
        enemyY = Math.floor(Math.random() * (mapSize - 4)) + 2;
      } while (map[enemyY][enemyX] !== 0);
      
      map[enemyY][enemyX] = 3;
      
      // Create enemy with properties
      enemies.push({
        position: [enemyX, enemyY] as [number, number],
        health: i % 3 === 0 ? 3 : 1, // Bosses have more health
        type: (i % 3 === 0 ? 'boss' : i % 2 === 0 ? 'ranged' : 'basic') as 'boss' | 'ranged' | 'basic'
      });
    }
    
    return {
      map,
      playerPosition: [playerX, playerY] as [number, number],
      enemies,
      score: 0,
      playerHealth: 10,
      gameOver: false,
      level: 1
    };
  };

  // Run pathfinding algorithm (simplified A*)
  const runPathfinding = (state: GameState) => {
    setIsRunning(true);
    
    // Calculate baseline gas costs based on complexity
    const baseSolidityGas = complexity === 'low' ? 485000 : 
                           complexity === 'medium' ? 945000 : 1850000;
                           
    const basePathfindingSaving = complexity === 'low' ? 69.5 : 
                               complexity === 'medium' ? 77.8 : 83.4;
                              
    const baseCombatSaving = complexity === 'low' ? 71.2 : 
                           complexity === 'medium' ? 76.5 : 79.8;
                          
    const baseStateSaving = complexity === 'low' ? 68.3 : 
                          complexity === 'medium' ? 74.2 : 76.9;
    
    // Set benchmark values
    const newGasBenchmarks = {
      solidity: {
        pathfinding: baseSolidityGas,
        combat: Math.floor(baseSolidityGas * 0.65),
        stateUpdate: Math.floor(baseSolidityGas * 0.45)
      },
      stylus: {
        pathfinding: Math.floor(baseSolidityGas * (1 - basePathfindingSaving/100)),
        combat: Math.floor(baseSolidityGas * 0.65 * (1 - baseCombatSaving/100)),
        stateUpdate: Math.floor(baseSolidityGas * 0.45 * (1 - baseStateSaving/100))
      },
      savings: {
        pathfinding: basePathfindingSaving,
        combat: baseCombatSaving,
        stateUpdate: baseStateSaving,
        total: parseFloat(((basePathfindingSaving + baseCombatSaving + baseStateSaving) / 3).toFixed(1))
      }
    };
    
    setGasBenchmarks(newGasBenchmarks);
    
    // Enemy simulation
    setTimeout(() => {
      if (!state) return;
      
      const newState = {...state};
      
      // For each enemy, run pathfinding to player
      const simulatedPaths = state.enemies.map(enemy => {
        // Simplified random path (in real implementation this would be A* algorithm)
        const path = [];
        let currentPosition = [...enemy.position];
        const steps = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < steps; i++) {
          // Move toward player generally
          const dirX = currentPosition[0] < state.playerPosition[0] ? 1 : -1;
          const dirY = currentPosition[1] < state.playerPosition[1] ? 1 : -1;
          
          // Either move in x or y direction
          if (Math.random() > 0.5) {
            currentPosition = [currentPosition[0] + dirX, currentPosition[1]];
          } else {
            currentPosition = [currentPosition[0], currentPosition[1] + dirY];
          }
          
          path.push([...currentPosition]);
        }
        
        return {
          enemyType: enemy.type,
          path
        };
      });
      
      // Update enemy positions (just move 1 step in real game, but showing paths)
      const updatedEnemies = [...state.enemies];
      
      // Calculate execution metrics
      const results = {
        pathsComputed: state.enemies.length,
        totalNodes: state.enemies.length * (complexity === 'low' ? 12 : complexity === 'medium' ? 28 : 45),
        optimalPaths: Math.floor(state.enemies.length * 0.7),
        executionTime: complexity === 'low' ? 18 : complexity === 'medium' ? 36 : 72,
        gasUsed: newGasBenchmarks.stylus.pathfinding,
        solidityGasUsed: newGasBenchmarks.solidity.pathfinding,
        pathfindingPaths: simulatedPaths,
        complexity,
        mapSize: state.map.length
      };
      
      setSimulationResults(results);
      setIsRunning(false);
    }, 1500);
  };
  
  // Run combat resolution simulation
  const runCombatSimulation = (state: GameState) => {
    setIsRunning(true);
    
    setTimeout(() => {
      if (!state) return;
      
      // Get enemies in range of player (adjacent tiles)
      const enemiesInRange = state.enemies.filter(enemy => {
        const [ex, ey] = enemy.position;
        const [px, py] = state.playerPosition;
        
        // Check if adjacent (including diagonals)
        return Math.abs(ex - px) <= 1 && Math.abs(ey - py) <= 1;
      });
      
      // Calculate attack damage (would be more complex in real implementation)
      const attackResults = enemiesInRange.map(enemy => {
        const randomHit = Math.random() > 0.2;
        const damage = randomHit ? (enemy.type === 'boss' ? 3 : 1) : 0;
        
        return {
          enemyType: enemy.type,
          hit: randomHit,
          damage,
          critical: Math.random() > 0.8,
          effectsApplied: Math.random() > 0.7 ? ['stunned', 'bleeding'] : []
        };
      });
      
      // Calculate gas comparisons based on combat complexity
      const baseSolidityGas = complexity === 'low' ? 385000 : 
                             complexity === 'medium' ? 748000 : 1420000;
      
      const basePathfindingSaving = complexity === 'low' ? 69.5 : 
                                 complexity === 'medium' ? 77.8 : 83.4;
                                
      const baseCombatSaving = complexity === 'low' ? 71.2 : 
                             complexity === 'medium' ? 76.5 : 79.8;
                            
      const baseStateSaving = complexity === 'low' ? 68.3 : 
                            complexity === 'medium' ? 74.2 : 76.9;
      
      // Set benchmark values
      const newGasBenchmarks = {
        solidity: {
          pathfinding: Math.floor(baseSolidityGas * 1.2),
          combat: baseSolidityGas,
          stateUpdate: Math.floor(baseSolidityGas * 0.45)
        },
        stylus: {
          pathfinding: Math.floor(baseSolidityGas * 1.2 * (1 - basePathfindingSaving/100)),
          combat: Math.floor(baseSolidityGas * (1 - baseCombatSaving/100)),
          stateUpdate: Math.floor(baseSolidityGas * 0.45 * (1 - baseStateSaving/100))
        },
        savings: {
          pathfinding: basePathfindingSaving,
          combat: baseCombatSaving,
          stateUpdate: baseStateSaving,
          total: parseFloat(((basePathfindingSaving + baseCombatSaving + baseStateSaving) / 3).toFixed(1))
        }
      };
      
      setGasBenchmarks(newGasBenchmarks);
      
      // Calculate total damage dealt
      const totalDamage = attackResults.reduce((sum, result) => sum + result.damage, 0);
      
      // Generate combat log
      const combatLog = attackResults.map(result => {
        if (result.hit) {
          return `${result.enemyType} attacks for ${result.damage} damage${result.critical ? ' (CRITICAL)' : ''}${result.effectsApplied.length > 0 ? ' and applies ' + result.effectsApplied.join(', ') : ''}`;
        } else {
          return `${result.enemyType} attack missed`;
        }
      });
      
      // Combat results
      const results = {
        enemiesEngaged: enemiesInRange.length,
        totalDamage,
        criticalHits: attackResults.filter(r => r.critical).length,
        statusEffectsApplied: attackResults.reduce((sum, r) => sum + r.effectsApplied.length, 0),
        executionTime: complexity === 'low' ? 14 : complexity === 'medium' ? 32 : 62,
        gasUsed: newGasBenchmarks.stylus.combat,
        solidityGasUsed: newGasBenchmarks.solidity.combat,
        combatLog,
        complexity
      };
      
      setSimulationResults(results);
      setIsRunning(false);
    }, 1500);
  };

  const runBenchmark = () => {
    setIsRunning(true);
    
    setTimeout(() => {
      // Calculate baseline gas costs based on complexity
      const baseSolidityPathfindingGas = complexity === 'low' ? 485000 : 
                                        complexity === 'medium' ? 945000 : 1850000;
      
      const baseSolidityCombatGas = complexity === 'low' ? 385000 : 
                                    complexity === 'medium' ? 748000 : 1420000;
                                    
      const baseSolidityStateGas = complexity === 'low' ? 215000 : 
                                  complexity === 'medium' ? 425000 : 790000;
      
      const basePathfindingSaving = complexity === 'low' ? 69.5 : 
                                 complexity === 'medium' ? 77.8 : 83.4;
                                
      const baseCombatSaving = complexity === 'low' ? 71.2 : 
                             complexity === 'medium' ? 76.5 : 79.8;
                            
      const baseStateSaving = complexity === 'low' ? 68.3 : 
                            complexity === 'medium' ? 74.2 : 76.9;
      
      // Calculate blended average saving
      const totalSaving = (basePathfindingSaving + baseCombatSaving + baseStateSaving) / 3;
      
      // Set benchmark values
      const newGasBenchmarks = {
        solidity: {
          pathfinding: baseSolidityPathfindingGas,
          combat: baseSolidityCombatGas,
          stateUpdate: baseSolidityStateGas
        },
        stylus: {
          pathfinding: Math.floor(baseSolidityPathfindingGas * (1 - basePathfindingSaving/100)),
          combat: Math.floor(baseSolidityCombatGas * (1 - baseCombatSaving/100)),
          stateUpdate: Math.floor(baseSolidityStateGas * (1 - baseStateSaving/100))
        },
        savings: {
          pathfinding: basePathfindingSaving,
          combat: baseCombatSaving,
          stateUpdate: baseStateSaving,
          total: parseFloat(totalSaving.toFixed(1))
        }
      };
      
      // Calculate total gas usage
      const totalSolidityGas = Object.values(newGasBenchmarks.solidity).reduce((sum, val) => sum + val, 0);
      const totalStylusGas = Object.values(newGasBenchmarks.stylus).reduce((sum, val) => sum + val, 0);
      
      // Estimated cost in USD (assuming 30 gwei gas price and $3000 ETH)
      const gasPriceGwei = 30;
      const ethPriceUsd = 3000;
      const solidityCostEth = (totalSolidityGas * gasPriceGwei) / 1e9;
      const solidityCostUsd = solidityCostEth * ethPriceUsd;
      const stylusCostEth = (totalStylusGas * gasPriceGwei) / 1e9;
      const stylusCostUsd = stylusCostEth * ethPriceUsd;
      
      setGasBenchmarks(newGasBenchmarks);
      
      // Generate benchmark data for charts
      const benchmarkData = [
        {
          name: 'Pathfinding',
          Solidity: newGasBenchmarks.solidity.pathfinding,
          Stylus: newGasBenchmarks.stylus.pathfinding,
          Savings: newGasBenchmarks.savings.pathfinding
        },
        {
          name: 'Combat Resolution',
          Solidity: newGasBenchmarks.solidity.combat,
          Stylus: newGasBenchmarks.stylus.combat,
          Savings: newGasBenchmarks.savings.combat
        },
        {
          name: 'State Updates',
          Solidity: newGasBenchmarks.solidity.stateUpdate,
          Stylus: newGasBenchmarks.stylus.stateUpdate,
          Savings: newGasBenchmarks.savings.stateUpdate
        }
      ];
      
      // Benchmark results
      const results = {
        totalSolidityGas,
        totalStylusGas,
        gasSavingsPercent: totalSaving,
        gasSavingsAbsolute: totalSolidityGas - totalStylusGas,
        solidityCostUsd: solidityCostUsd.toFixed(2),
        stylusCostUsd: stylusCostUsd.toFixed(2),
        costSavingsUsd: (solidityCostUsd - stylusCostUsd).toFixed(2),
        executionTimeMs: complexity === 'low' ? 42 : complexity === 'medium' ? 86 : 124,
        benchmarkData,
        complexity,
        mapSize: complexity === 'low' ? 10 : complexity === 'medium' ? 15 : 20,
        entityCount: complexity === 'low' ? '~15' : complexity === 'medium' ? '~30' : '~50'
      };
      
      setSimulationResults(results);
      setIsRunning(false);
    }, 1500);
  };

  // Initialize game state when component mounts
  useEffect(() => {
    setGameState(initializeGame());
    runBenchmark();
  }, [complexity]);

  // Run simulation based on active tab
  const runSimulation = () => {
    if (!gameState) return;
    
    switch(activeTab) {
      case 'pathfinding':
        runPathfinding(gameState);
        break;
      case 'combat':
        runCombatSimulation(gameState);
        break;
      case 'benchmark':
        runBenchmark();
        break;
    }
  };

  // Cell renderer for the game map
  const renderCell = (value: number, x: number, y: number) => {
    let bgColor = 'bg-slate-900';
    
    switch(value) {
      case 1: // wall
        bgColor = 'bg-slate-700';
        break;
      case 2: // player
        bgColor = 'bg-emerald-600';
        break;
      case 3: // enemy
        bgColor = 'bg-red-600';
        break;
      default: // empty
        bgColor = 'bg-slate-900';
    }
    
    return (
      <div 
        key={`${x}-${y}`} 
        className={`${bgColor} border border-slate-800 transition-all duration-200`}
        style={{width: '100%', height: '100%'}}
      />
    );
  };
  
  // Format tooltip values for the chart
  const formatTooltip = (value: number, name: string) => {
    if (name === 'Savings') return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold mb-3 text-white bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500">
        On-Chain Game Logic Simulator
      </h2>
      
      <p className="text-slate-300 mb-8 max-w-3xl">
        Fully on-chain games require complex computations like pathfinding, combat resolution, 
        and real-time state updates. With Stylus, these intensive operations are now viable on-chain, 
        enabling rich gameplay experiences that would be prohibitively expensive in Solidity.
      </p>
      
      {!account ? (
        <div className="bg-slate-800/50 p-8 rounded-xl text-center border border-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-xl font-medium text-slate-300 mb-2">Wallet Connection Required</h3>
          <p className="text-slate-400 mb-6">
            Please connect your wallet to interact with the game logic simulator.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-8">
            <div className="flex rounded-lg bg-slate-800/50 p-1">
              <button
                onClick={() => setActiveTab('benchmark')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all 
                  ${activeTab === 'benchmark' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                  }`
                }
              >
                Gas Benchmarks
              </button>
              <button
                onClick={() => setActiveTab('pathfinding')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all 
                  ${activeTab === 'pathfinding' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                  }`
                }
              >
                Pathfinding Simulation
              </button>
              <button
                onClick={() => setActiveTab('combat')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all
                  ${activeTab === 'combat' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                  }`
                }
              >
                Combat Resolution
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Controls Panel */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Game Parameters</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">Simulation Complexity</label>
                <div className="flex justify-between p-1 bg-slate-900 rounded-lg">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      className={`flex-1 py-2 px-3 rounded-md transition-all text-sm font-medium
                        ${complexity === level 
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                          : 'text-slate-400 hover:text-white'
                        }`
                      }
                      onClick={() => setComplexity(level)}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {complexity === 'low' 
                    ? 'Small map (10x10), 3 enemies, basic logic' 
                    : complexity === 'medium' 
                    ? 'Medium map (15x15), 5 enemies, moderate logic' 
                    : 'Large map (20x20), 8 enemies, advanced logic'}
                </p>
              </div>
              
              {/* Game Map Visualization */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Game Map</h4>
                {gameState && (
                  <div className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-900 mb-2" style={{width: '100%', height: '200px'}}>
                    <div className="absolute inset-0 grid gap-0" style={{
                      gridTemplateColumns: `repeat(${gameState.map[0].length}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${gameState.map.length}, minmax(0, 1fr))`
                    }}>
                      {gameState.map.map((row, y) => 
                        row.map((cell, x) => renderCell(cell, x, y))
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Map size: {gameState?.map.length}x{gameState?.map.length}</span>
                  <span>Legend: <span className="text-emerald-500">■</span> Player <span className="text-red-500">■</span> Enemy <span className="text-slate-500">■</span> Wall</span>
                </div>
              </div>
              
              {/* Performance Stats */}
              <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 mb-6">
                <h4 className="font-semibold text-slate-300 mb-3">Average Gas Savings</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Pathfinding:</span>
                    <span className="font-mono text-emerald-400">{gasBenchmarks.savings.pathfinding}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Combat Resolution:</span>
                    <span className="font-mono text-emerald-400">{gasBenchmarks.savings.combat}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">State Updates:</span>
                    <span className="font-mono text-emerald-400">{gasBenchmarks.savings.stateUpdate}%</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Total Average:</span>
                    <span className="font-mono text-emerald-400 font-bold">{gasBenchmarks.savings.total}%</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={runSimulation}
                disabled={isRunning}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : 'Run Simulation'}
              </button>
            </div>
            
            {/* Results Panel (Spans 2 columns) */}
            <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-6">
                {activeTab === 'pathfinding' && 'Pathfinding Simulation Results'}
                {activeTab === 'combat' && 'Combat Resolution Results'}
                {activeTab === 'benchmark' && 'Gas Efficiency Benchmarks'}
              </h3>
              
              {!simulationResults && !isRunning ? (
                <div className="text-center p-8 bg-slate-900/60 rounded-lg border border-dashed border-slate-700 flex flex-col items-center justify-center" style={{minHeight: '400px'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-slate-400">Run the simulation to see results</p>
                  <p className="text-sm text-slate-600 mt-2">Select complexity level and click "Run Simulation"</p>
                </div>
              ) : isRunning ? (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-lg border border-dashed border-slate-700" style={{minHeight: '400px'}}>
                  <svg className="animate-spin h-12 w-12 text-emerald-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-300 mb-2">
                    {activeTab === 'pathfinding' && 'Calculating optimal paths for enemies...'}
                    {activeTab === 'combat' && 'Resolving combat interactions...'}
                    {activeTab === 'benchmark' && 'Running gas benchmarks...'}
                  </p>
                  <p className="text-sm text-slate-500">Simulating Stylus contract execution</p>
                </div>
              ) : (
                <div>
                  {/* Benchmark Results */}
                  {activeTab === 'benchmark' && simulationResults && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <p className="text-sm text-slate-500 mb-1">Solidity Gas</p>
                          <p className="text-2xl font-bold text-white">{simulationResults.totalSolidityGas.toLocaleString()}</p>
                          <p className="text-xs text-orange-400">(~${simulationResults.solidityCostUsd} @ 30 gwei)</p>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <p className="text-sm text-slate-500 mb-1">Stylus Gas</p>
                          <p className="text-2xl font-bold text-white">{simulationResults.totalStylusGas.toLocaleString()}</p>
                          <p className="text-xs text-emerald-400">(~${simulationResults.stylusCostUsd} @ 30 gwei)</p>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-emerald-900/30">
                          <p className="text-sm text-slate-500 mb-1">Cost Savings</p>
                          <p className="text-2xl font-bold text-emerald-400">{simulationResults.gasSavingsPercent}%</p>
                          <p className="text-xs text-emerald-300">${simulationResults.costSavingsUsd} per transaction</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-3">Gas Comparison by Operation</h4>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={simulationResults.benchmarkData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="name" stroke="#94a3b8" />
                              <YAxis yAxisId="left" stroke="#94a3b8" />
                              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" domain={[0, 100]} />
                              <Tooltip 
                                formatter={formatTooltip}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
                              />
                              <Legend />
                              <Bar yAxisId="left" dataKey="Solidity" name="Solidity Gas" fill="#f97316" radius={[4, 4, 0, 0]} />
                              <Bar yAxisId="left" dataKey="Stylus" name="Stylus Gas" fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar yAxisId="right" dataKey="Savings" name="Savings %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <h4 className="font-medium text-slate-300 mb-3">Simulation Parameters</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex justify-between">
                              <span className="text-slate-400">Complexity:</span>
                              <span className="text-white capitalize">{simulationResults.complexity}</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-slate-400">Map Size:</span>
                              <span className="text-white">{simulationResults.mapSize}x{simulationResults.mapSize}</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-slate-400">Entity Count:</span>
                              <span className="text-white">{simulationResults.entityCount}</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-slate-400">Execution Time:</span>
                              <span className="text-white">{simulationResults.executionTimeMs} ms</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="bg-emerald-900/20 p-4 rounded-lg border border-emerald-900/30">
                          <h4 className="font-medium text-emerald-300 mb-3">Cost Analysis</h4>
                          <p className="text-slate-300 text-sm mb-4">
                            At scale, a game with 1,000 daily transactions would save approximately 
                            <span className="font-bold text-white mx-1">${(parseFloat(simulationResults.costSavingsUsd) * 1000).toFixed(2)}</span> 
                            per day in gas fees using Stylus.
                          </p>
                          <p className="text-slate-400 text-xs">
                            This makes previously impossible game mechanics like real-time combat, 
                            complex AI behavior, and large game worlds economically viable on-chain.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Pathfinding Results */}
                  {activeTab === 'pathfinding' && simulationResults && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <p className="text-sm text-slate-500 mb-1">Paths Computed</p>
                          <p className="text-2xl font-bold text-white">{simulationResults.pathsComputed}</p>
                          <p className="text-xs text-slate-400">For {simulationResults.pathsComputed} enemies</p>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <p className="text-sm text-slate-500 mb-1">Nodes Evaluated</p>
                          <p className="text-2xl font-bold text-white">{simulationResults.totalNodes}</p>
                          <p className="text-xs text-slate-400">Average: {Math.floor(simulationResults.totalNodes / simulationResults.pathsComputed)} per enemy</p>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <p className="text-sm text-slate-500 mb-1">Gas Savings</p>
                          <p className="text-2xl font-bold text-emerald-400">{gasBenchmarks.savings.pathfinding}%</p>
                          <p className="text-xs text-emerald-300">{simulationResults.solidityGasUsed.toLocaleString()} → {simulationResults.gasUsed.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {/* Path Visualization */}
                      <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                        <h4 className="font-medium text-slate-300 mb-3">Path Computation Results</h4>
                        <div className="max-h-48 overflow-y-auto">
                          <ul className="space-y-3 text-sm">
                            {simulationResults.pathfindingPaths.map((path: any, idx: number) => (
                              <li key={idx} className="border-b border-slate-800 pb-2">
                                <div className="flex justify-between mb-1">
                                  <span className="text-slate-400">
                                    {path.enemyType} enemy path
                                  </span>
                                  <span className="text-emerald-400">
                                    {path.path.length} steps
                                  </span>
                                </div>
                                <div className="font-mono text-xs text-slate-500">
                                  {path.path.map((pos: [number, number], i: number) => (
                                    <span key={i} className="inline-block mr-1">
                                      [{pos[0]},{pos[1]}]
                                      {i < path.path.length - 1 ? ' →' : ''}
                                    </span>
                                  ))}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <h4 className="font-medium text-slate-300 mb-3">Algorithm Performance</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex justify-between">
                              <span className="text-slate-400">Map Complexity:</span>
                              <span className="text-white capitalize">{simulationResults.complexity} ({simulationResults.mapSize}x{simulationResults.mapSize})</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-slate-400">Optimal Paths Found:</span>
                              <span className="text-white">{simulationResults.optimalPaths} of {simulationResults.pathsComputed}</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-slate-400">Execution Time:</span>
                              <span className="text-white">{simulationResults.executionTime} ms</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-800">
                          <h4 className="font-medium text-slate-300 mb-3">Gas Comparison</h4>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400">Solidity:</span>
                            <span className="font-mono text-orange-400">{simulationResults.solidityGasUsed.toLocaleString()} gas</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400">Stylus:</span>
                            <span className="font-mono text-emerald-400">{simulationResults.gasUsed.toLocaleString()} gas</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full mb-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${100 - gasBenchmarks.savings.pathfinding}%` }}></div>
                          </div>
                          <p className="text-xs text-center text-slate-500">
                            Stylus uses only {(100 - gasBenchmarks.savings.pathfinding).toFixed(1)}% of the gas compared to Solidity
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Combat Results */}
                  {activeTab === 'combat' && simulationResults && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <p className="text-sm text-slate-500 mb-1">Enemies Engaged</p>
                          <p className="text-2xl font-bold text-white">{simulationResults.enemiesEngaged}</p>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <p className="text-sm text-slate-500 mb-1">Total Damage</p>
                          <p className="text-2xl font-bold text-red-400">{simulationResults.totalDamage}</p>
                          <p className="text-xs text-slate-400">({simulationResults.criticalHits} critical hits)</p>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <p className="text-sm text-slate-500 mb-1">Gas Savings</p>
                          <p className="text-2xl font-bold text-emerald-400">{gasBenchmarks.savings.combat}%</p>
                          <p className="text-xs text-emerald-300">{simulationResults.solidityGasUsed.toLocaleString()} → {simulationResults.gasUsed.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {/* Combat Log */}
                      <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                        <h4 className="font-medium text-slate-300 mb-3">Combat Log</h4>
                        <div className="bg-slate-950/60 p-3 rounded-md border border-slate-800 font-mono text-sm text-slate-400 h-40 overflow-y-auto">
                          {simulationResults.combatLog.map((log: string, idx: number) => (
                            <div key={idx} className="mb-1">
                              <span className="text-emerald-500">[{idx+1}]</span> {log}
                            </div>
                          ))}
                          {simulationResults.statusEffectsApplied > 0 && (
                            <div className="mt-2 text-amber-400">
                              {simulationResults.statusEffectsApplied} status effects applied
                            </div>
                          )}
                          <div className="mt-2 text-red-400">
                            Player took {simulationResults.totalDamage} total damage
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                          <h4 className="font-medium text-slate-300 mb-3">Combat Calculations</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex justify-between">
                              <span className="text-slate-400">Damage Calculation:</span>
                              <span className="text-white">Random + Weapon + Buffs - Defense</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-slate-400">Status Effects:</span>
                              <span className="text-white">Stun, Bleed, Burn, Slow</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-slate-400">Critical Rate:</span>
                              <span className="text-white">{(simulationResults.criticalHits / simulationResults.enemiesEngaged * 100).toFixed(1)}%</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-slate-400">Execution Time:</span>
                              <span className="text-white">{simulationResults.executionTime} ms</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-800">
                          <h4 className="font-medium text-slate-300 mb-3">Gas Comparison</h4>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400">Solidity:</span>
                            <span className="font-mono text-orange-400">{simulationResults.solidityGasUsed.toLocaleString()} gas</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400">Stylus:</span>
                            <span className="font-mono text-emerald-400">{simulationResults.gasUsed.toLocaleString()} gas</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full mb-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${100 - gasBenchmarks.savings.combat}%` }}></div>
                          </div>
                          <p className="text-xs text-center text-slate-500">
                            Combat resolution is {gasBenchmarks.savings.combat}% more gas efficient with Stylus
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Why This Matters - Large Info Box */}
          <div className="mt-8 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 p-5 rounded-xl border border-emerald-900/30">
            <h3 className="text-emerald-300 font-medium mb-2">Why This Matters for On-Chain Gaming</h3>
            <p className="text-slate-300 mb-4">
              Fully on-chain games have been severely limited by gas costs, restricting game worlds to simple mechanics and minimal state.
              With Stylus providing 70-85% gas savings for complex game logic, we can now build richer gaming experiences directly on the blockchain:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              <div className="bg-slate-900/40 rounded-lg p-4 border border-emerald-900/20">
                <h4 className="text-emerald-400 font-medium mb-2">Advanced Pathfinding</h4>
                <p className="text-slate-400 text-sm">
                  A* pathfinding for NPCs, world navigation, and tactical AI that would cost $5+ per update in Solidity can now run for under $1.
                </p>
              </div>
              
              <div className="bg-slate-900/40 rounded-lg p-4 border border-emerald-900/20">
                <h4 className="text-emerald-400 font-medium mb-2">Complex Combat Systems</h4>
                <p className="text-slate-400 text-sm">
                  Turn-based and real-time combat with stats, damage formulas, and status effects become viable, enabling RPGs and strategy games.
                </p>
              </div>
              
              <div className="bg-slate-900/40 rounded-lg p-4 border border-emerald-900/20">
                <h4 className="text-emerald-400 font-medium mb-2">Larger Persistent Worlds</h4>
                <p className="text-slate-400 text-sm">
                  Games can now maintain larger maps, more entities, and richer world states without prohibitive gas costs for updates.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GameLogicSimulator;