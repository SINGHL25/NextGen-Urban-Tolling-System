import React from 'react';
import { Transaction } from '../types';
import { Camera, Scan, FileText, DollarSign, Check } from 'lucide-react';

interface TransactionFlowProps {
  transactions: Transaction[];
}

const TransactionFlow: React.FC<TransactionFlowProps> = ({ transactions }) => {
  // Take the most recent transaction to show detailed flow
  const latestTx = transactions[0];

  if (!latestTx) return <div className="p-4 text-center text-zinc-500">No active transactions</div>;

  const steps = [
    { id: 'CAPTURED', label: 'Detection', icon: <Camera size={18} /> },
    { id: 'CLASSIFIED', label: 'Classification', icon: <Scan size={18} /> },
    { id: 'PRICED', label: 'Rating', icon: <DollarSign size={18} /> },
    { id: 'INVOICED', label: 'Invoicing', icon: <FileText size={18} /> },
    { id: 'PAID', label: 'Settlement', icon: <Check size={18} /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === latestTx.status);

  return (
    <div className="w-full bg-zinc-900/50 border border-white/5 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Live Transaction Pipeline</h3>
        <span className="text-xs font-mono text-emerald-400">TXID: {latestTx.id}</span>
      </div>

      <div className="relative flex items-center justify-between">
        {/* Connecting Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-800 z-0"></div>
        <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 z-0 transition-all duration-500"
            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, idx) => {
          const isCompleted = idx <= currentStepIndex;
          const isActive = idx === currentStepIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 
                  ${isCompleted 
                    ? 'bg-emerald-900 border-emerald-500 text-emerald-400' 
                    : 'bg-zinc-900 border-zinc-700 text-zinc-600'
                  } ${isActive ? 'scale-110 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : ''}`}
              >
                {step.icon}
              </div>
              <span className={`mt-2 text-xs font-medium ${isCompleted ? 'text-zinc-200' : 'text-zinc-600'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 bg-black/20 p-3 rounded border border-white/5">
         <div className="flex flex-col">
            <span className="text-[10px] uppercase text-zinc-500">Vehicle Class</span>
            <span className="text-sm font-bold text-white">{latestTx.vehicleClass}</span>
         </div>
         <div className="flex flex-col">
            <span className="text-[10px] uppercase text-zinc-500">Plate (OCR)</span>
            <span className="text-sm font-mono text-emerald-400 bg-emerald-900/20 px-1 rounded w-fit">
                {latestTx.plate}
            </span>
         </div>
         <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase text-zinc-500">Toll Amount</span>
            <span className="text-sm font-bold text-white">${latestTx.amount.toFixed(2)}</span>
         </div>
      </div>
    </div>
  );
};

export default TransactionFlow;