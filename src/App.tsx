import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './App.css'

/**
 * Interface representing a single dosage record.
 */
interface Dose {
  id: string;          // Unique identifier for the dose
  amount: number;      // The amount taken (in the specified unit)
  unit: 'mg' | 'ug' | 'g' | 'iu';  // Unit of measurement
  timestamp: Date;     // When the dose was taken
}

/**
 * Configuration for the calculator.
 */
interface CalculatorConfig {
  halfLifeHours: number;   // The half-life of the substance in hours
  targetTime?: Date;       // The time for which to calculate levels (default: now)
}

/**
 * Convert units to mg for consistent calculations
 */
function convertToMg(amount: number, unit: Dose['unit']): number {
  switch (unit) {
    case 'g': return amount * 1000;
    case 'mg': return amount;
    case 'ug': return amount / 1000;
    case 'iu': return amount; // IU doesn't convert directly, keep as-is
    default: return amount;
  }
}

/**
 * Calculates the total remaining amount of a substance based on a history of doses.
 * @param doses - Array of Dose objects
 * @param config - Configuration including half-life and target time
 * @returns The total amount remaining in the system (in mg)
 */
export function calculateActiveLevel(doses: Dose[], config: CalculatorConfig): number {
  const { halfLifeHours, targetTime = new Date() } = config;
  
  if (halfLifeHours <= 0) {
    throw new Error("Half-life must be a positive number.");
  }

  // Current time in milliseconds
  const targetTimeMs = targetTime.getTime();

  // Calculate remaining amount for each dose and sum them up
  const totalRemaining = doses.reduce((total, dose) => {
    const doseTimeMs = dose.timestamp.getTime();
    
    // Calculate elapsed time in hours
    const elapsedHours = (targetTimeMs - doseTimeMs) / (1000 * 60 * 60);

    // If the dose is in the future relative to targetTime, it contributes 0
    if (elapsedHours < 0) {
      return total;
    }

    // Convert to mg for consistent calculation
    const amountInMg = convertToMg(dose.amount, dose.unit);

    // Apply the half-life formula: Amount * (0.5 ^ (Elapsed / HalfLife))
    const remainingFromDose = amountInMg * Math.pow(0.5, elapsedHours / halfLifeHours);

    return total + remainingFromDose;
  }, 0);

  return totalRemaining;
}

function App() {
  const [doses, setDoses] = useState<Dose[]>(() => {
    const now = new Date();
    const defaultDoses: Array<{daysAgo: number, amount: number}> = [
      { daysAgo: 16, amount: 93.75 },   // Sun
      { daysAgo: 15, amount: 93.75 },   // Mon
      { daysAgo: 14, amount: 93.75 },   // Tues
      { daysAgo: 13, amount: 93.75 },   // Wed
      { daysAgo: 12, amount: 0 },       // Thurs
      { daysAgo: 11, amount: 93.75 },   // Fri
      { daysAgo: 10, amount: 125 },     // Sat
      { daysAgo: 9, amount: 0 },        // Sun
      { daysAgo: 8, amount: 125 },      // Mon
      { daysAgo: 7, amount: 125 },      // Tues
      { daysAgo: 6, amount: 125 },      // Wed
      { daysAgo: 5, amount: 125 },      // Thurs
      { daysAgo: 4, amount: 0 },        // Fri
      { daysAgo: 3, amount: 0 },        // Sat
      { daysAgo: 2, amount: 125 },      // Sun
      { daysAgo: 1, amount: 93.75 },    // Mon
      { daysAgo: 0, amount: 125 },      // Tues (today)
    ];
    
    return defaultDoses
      .filter(d => d.amount > 0) // Only include non-zero doses
      .map((d, index) => ({
        id: `default-${index}`,
        amount: d.amount,
        unit: 'ug' as Dose['unit'],
        timestamp: new Date(now.getTime() - d.daysAgo * 24 * 60 * 60 * 1000),
      }));
  });
  const [halfLifeHours, setHalfLifeHours] = useState<number>(200);
  const [newDoseAmount, setNewDoseAmount] = useState<string>('');
  const [newDoseUnit, setNewDoseUnit] = useState<Dose['unit']>('mg');
  const [newDoseTime, setNewDoseTime] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  });

  const addDose = () => {
    const amount = parseFloat(newDoseAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const newDose: Dose = {
      id: Date.now().toString(),
      amount,
      unit: newDoseUnit,
      timestamp: new Date(newDoseTime),
    };

    setDoses([...doses, newDose].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
    setNewDoseAmount('');
    setNewDoseTime(new Date().toISOString().slice(0, 16));
  };

  const removeDose = (id: string) => {
    setDoses(doses.filter(dose => dose.id !== id));
  };

  const clearAllDoses = () => {
    if (window.confirm('Are you sure you want to clear all doses?')) {
      setDoses([]);
    }
  };

  // Calculate current active level
  const currentLevel = doses.length > 0 
    ? calculateActiveLevel(doses, { halfLifeHours }) 
    : 0;

  // Generate chart data
  const generateChartData = () => {
    if (doses.length === 0) return [];

    const now = Date.now();
    const oldestDose = Math.min(...doses.map(d => d.timestamp.getTime()));
    const startTime = Math.min(oldestDose, now);
    const futureHours = halfLifeHours * 5; // Show 5 half-lives into future
    const endTime = now + futureHours * 60 * 60 * 1000;

    // Create a set of important timestamps (dose times + evenly spaced points)
    const importantTimes = new Set<number>();
    
    // Add all dose timestamps
    doses.forEach(dose => {
      importantTimes.add(dose.timestamp.getTime());
    });
    
    // Add evenly spaced points
    const numPoints = 100;
    const timeStep = (endTime - startTime) / numPoints;
    for (let i = 0; i <= numPoints; i++) {
      importantTimes.add(startTime + i * timeStep);
    }

    // Sort all times and generate data points
    const sortedTimes = Array.from(importantTimes).sort((a, b) => a - b);
    
    const dataPoints = sortedTimes.map(time => {
      const level = calculateActiveLevel(doses, {
        halfLifeHours,
        targetTime: new Date(time),
      });

      return {
        time: new Date(time).toLocaleString(),
        timestamp: time,
        level: parseFloat(level.toFixed(2)),
      };
    });

    return dataPoints;
  };

  const chartData = generateChartData();

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.timestamp);
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      const formattedTime = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>{formattedDate}</p>
          <p style={{ margin: '0 0 5px 0', color: '#555' }}>{formattedTime}</p>
          <p style={{ margin: 0, color: '#4CAF50', fontWeight: 'bold' }}>
            Active Level: {data.level} mg
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', overflowX: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '80%', maxWidth: '1600px', padding: '20px' }}>
        <h1>Half-Life Calculator</h1>

        {/* Two Column Layout */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'flex-start' }}>
          {/* Left Sidebar */}
          <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Configuration Section */}
          <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Configuration</h2>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Half-Life (hours):
                <input
                  type="number"
                  value={halfLifeHours}
                  onChange={(e) => setHalfLifeHours(parseFloat(e.target.value) || 0)}
                  style={{ marginLeft: '10px', padding: '5px', width: '100px' }}
                  step="0.1"
                  min="0.1"
                />
              </label>
            </div>
          </div>

          {/* Add Dose Section */}
          <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Add Dose</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Amount:</label>
                <input
                  type="number"
                  value={newDoseAmount}
                  onChange={(e) => setNewDoseAmount(e.target.value)}
                  style={{ padding: '5px', width: '100%' }}
                  step="0.01"
                  placeholder="100"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Unit:</label>
                <select
                  value={newDoseUnit}
                  onChange={(e) => setNewDoseUnit(e.target.value as Dose['unit'])}
                  style={{ padding: '5px', width: '100%' }}
                >
                  <option value="ug">μg (micrograms)</option>
                  <option value="mg">mg (milligrams)</option>
                  <option value="g">g (grams)</option>
                  <option value="iu">IU (international units)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Time:</label>
                <input
                  type="datetime-local"
                  value={newDoseTime}
                  onChange={(e) => setNewDoseTime(e.target.value)}
                  style={{ padding: '5px', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={addDose}
                  style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', flex: 1 }}
                >
                  Add Dose
                </button>
                <button
                  onClick={clearAllDoses}
                  style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', flex: 1 }}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Current Level Display */}
          <div style={{ padding: '20px', border: '2px solid #4CAF50', borderRadius: '8px', backgroundColor: '#f0f8f0' }}>
            <h2 style={{ color: '#1B5E20' }}>Current Active Level</h2>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1B5E20' }}>
              {currentLevel.toFixed(2)} mg
            </p>
          </div>
        </div>

        {/* Right Side - Dose History */}
        <div style={{ flex: '1', minWidth: 0 }}>
          <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Dose History</h2>
            {doses.length === 0 ? (
              <p>No doses recorded yet. Add a dose above to get started.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ccc' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Time</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Amount</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Unit</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doses.map(dose => (
                      <tr key={dose.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', textAlign: 'left' }}>{dose.timestamp.toLocaleString()}</td>
                        <td style={{ padding: '10px', textAlign: 'left' }}>{dose.amount}</td>
                        <td style={{ padding: '10px', textAlign: 'left' }}>{dose.unit}</td>
                        <td style={{ padding: '10px', textAlign: 'left' }}>
                          <button
                            onClick={() => removeDose(dose.id)}
                            style={{ padding: '4px 8px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart - Full Width */}
      {doses.length > 0 && (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h2>Half-Life Decay Chart</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 10 }}
              />
              <YAxis label={{ value: 'Active Level (mg)', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="level" stroke="#4CAF50" strokeWidth={2} dot={false} name="Active Level (mg)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      </div>
    </div>
  )
}

export default App
