// House Edge Verification System
// This module proves mathematically that our game design ensures profitability

// Squirrel probability function - matches backend RNG
function getSquirrelProbability(seconds: number): number {
  if (seconds <= 5) return 0.01 + (seconds - 1) * 0.005; // 1% to 3%
  if (seconds <= 10) return 0.03 + (seconds - 5) * 0.004; // 3% to 5%  
  if (seconds <= 20) return 0.05 + (seconds - 10) * 0.002; // 5% to 7%
  return Math.min(0.07 + (seconds - 20) * 0.003, 0.1); // 7% to 10% max
}

// Payout multiplier function - matches frontend calculation
function getPayoutMultiplier(seconds: number): number {
  const baseMultiplier = 1 + (seconds * 0.15) + Math.pow(seconds * 0.1, 1.8);
  return Math.round(baseMultiplier * (1 - 0.08) * 100) / 100; // 8% house edge
}

// Helper function for calculating time-based probabilities (unused but kept for reference)

// Calculate expected value for all possible outcomes
export function calculateHouseEdge(): {
  expectedReturn: number;
  houseEdge: number;
  breakdown: {
    time: number;
    winProb: number;
    multiplier: number;
    contribution: number;
  }[];
  summary: {
    totalWinProb: number;
    averageWinMultiplier: number;
    averageLossMultiplier: number;
    breakEvenTime: number;
  };
} {
  const maxTime = 30; // Maximum game duration
  const breakdown: any[] = [];
  let totalExpectedReturn = 0;
  let totalWinProb = 0;
  let weightedWinMultiplier = 0;

  // Calculate for each possible cash-out time
  for (let t = 1; t <= maxTime; t++) {
    // Probability of surviving until time t (no squirrel before t)
    let survivalProb = 1;
    for (let i = 1; i < t; i++) {
      survivalProb *= (1 - getSquirrelProbability(i));
    }
    
    // If player cashes out at time t
    const multiplier = getPayoutMultiplier(t);
    const winProb = survivalProb;
    const contribution = winProb * multiplier;
    
    totalExpectedReturn += contribution;
    totalWinProb += winProb;
    weightedWinMultiplier += winProb * multiplier;
    
    breakdown.push({
      time: t,
      winProb: winProb,
      multiplier: multiplier,
      contribution: contribution
    });
  }

  // Add probability of total loss (squirrel appears, player doesn't cash out in time)
  const totalLossProb = 1 - totalWinProb;
  const lossContribution = totalLossProb * 0; // Player loses entire bet
  totalExpectedReturn += lossContribution;

  const houseEdge = 1 - totalExpectedReturn;
  const averageWinMultiplier = totalWinProb > 0 ? weightedWinMultiplier / totalWinProb : 0;

  // Find break-even time (where multiplier = 1.0)
  let breakEvenTime = 1;
  for (let t = 1; t <= maxTime; t++) {
    if (getPayoutMultiplier(t) >= 1.0) {
      breakEvenTime = t;
      break;
    }
  }

  return {
    expectedReturn: totalExpectedReturn,
    houseEdge: houseEdge,
    breakdown,
    summary: {
      totalWinProb,
      averageWinMultiplier,
      averageLossMultiplier: 0,
      breakEvenTime
    }
  };
}

// Simulate many games to verify theoretical calculations
export function simulateGames(numGames: number = 100000): {
  actualHouseEdge: number;
  winRate: number;
  averageWinPayout: number;
  totalProfitRatio: number;
  gamesWon: number;
  gamesLost: number;
} {
  let totalBets = numGames;
  let totalPayouts = 0;
  let gamesWon = 0;
  let totalWinPayout = 0;

  for (let game = 0; game < numGames; game++) {
    // Simulate random squirrel appearance time
    let squirrelTime = -1;
    
    for (let t = 1; t <= 30; t++) {
      const squirrelProb = getSquirrelProbability(t);
      if (Math.random() < squirrelProb) {
        squirrelTime = t;
        break;
      }
    }

    // If no squirrel appeared, set to max time + 1
    if (squirrelTime === -1) squirrelTime = 31;

    // Simulate player strategy (random cash-out between 1-25 seconds)
    const playerCashoutTime = Math.floor(Math.random() * 25) + 1;

    if (playerCashoutTime < squirrelTime) {
      // Player wins
      const multiplier = getPayoutMultiplier(playerCashoutTime);
      totalPayouts += multiplier;
      gamesWon++;
      totalWinPayout += multiplier;
    } else {
      // Player loses (squirrel appeared first)
      totalPayouts += 0; // Player loses bet
    }
  }

  const actualHouseEdge = 1 - (totalPayouts / totalBets);
  const winRate = gamesWon / numGames;
  const averageWinPayout = gamesWon > 0 ? totalWinPayout / gamesWon : 0;

  return {
    actualHouseEdge,
    winRate,
    averageWinPayout,
    totalProfitRatio: (totalBets - totalPayouts) / totalBets,
    gamesWon,
    gamesLost: numGames - gamesWon
  };
}

// Verify game is profitable across different player strategies
export function verifyProfitability(): {
  isAlwaysProfitable: boolean;
  worstCaseHouseEdge: number;
  bestCaseHouseEdge: number;
  strategies: {
    name: string;
    description: string;
    expectedReturn: number;
    houseEdge: number;
  }[];
} {
  const strategies = [
    {
      name: "Conservative (1-5s)",
      description: "Player always cashes out between 1-5 seconds",
      cashoutRange: [1, 5]
    },
    {
      name: "Moderate (5-15s)", 
      description: "Player cashes out between 5-15 seconds",
      cashoutRange: [5, 15]
    },
    {
      name: "Aggressive (15-25s)",
      description: "Player cashes out between 15-25 seconds", 
      cashoutRange: [15, 25]
    },
    {
      name: "Extreme (20-30s)",
      description: "Player tries to maximize payout",
      cashoutRange: [20, 30]
    }
  ];

  const results = strategies.map(strategy => {
    let totalExpectedReturn = 0;
    let totalWeight = 0;

    for (let cashoutTime = strategy.cashoutRange[0]; cashoutTime <= strategy.cashoutRange[1]; cashoutTime++) {
      // Probability of surviving to cashout time
      let survivalProb = 1;
      for (let t = 1; t < cashoutTime; t++) {
        survivalProb *= (1 - getSquirrelProbability(t));
      }

      const multiplier = getPayoutMultiplier(cashoutTime);
      const weight = 1; // Assume equal probability of each cashout time in range
      
      totalExpectedReturn += survivalProb * multiplier * weight;
      totalWeight += weight;
    }

    const expectedReturn = totalExpectedReturn / totalWeight;
    const houseEdge = 1 - expectedReturn;

    return {
      name: strategy.name,
      description: strategy.description,
      expectedReturn,
      houseEdge
    };
  });

  const houseEdges = results.map(r => r.houseEdge);
  const worstCaseHouseEdge = Math.min(...houseEdges);
  const bestCaseHouseEdge = Math.max(...houseEdges);
  const isAlwaysProfitable = worstCaseHouseEdge > 0;

  return {
    isAlwaysProfitable,
    worstCaseHouseEdge,
    bestCaseHouseEdge,
    strategies: results
  };
}

// Main verification function
export function verifyGameProfitability(): {
  isProfitable: boolean;
  theoreticalHouseEdge: number;
  simulatedHouseEdge: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  details: any;
} {
  const theoretical = calculateHouseEdge();
  const simulated = simulateGames(100000);
  const profitability = verifyProfitability();

  const isProfitable = theoretical.houseEdge > 0 && 
                      simulated.actualHouseEdge > 0 && 
                      profitability.isAlwaysProfitable;

  // Calculate confidence based on consistency
  const edgeDifference = Math.abs(theoretical.houseEdge - simulated.actualHouseEdge);
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
  
  if (edgeDifference > 0.02) confidence = 'MEDIUM';
  if (edgeDifference > 0.05) confidence = 'LOW';

  return {
    isProfitable,
    theoreticalHouseEdge: theoretical.houseEdge,
    simulatedHouseEdge: simulated.actualHouseEdge,
    confidence,
    details: {
      theoretical,
      simulated,
      profitability
    }
  };
} 