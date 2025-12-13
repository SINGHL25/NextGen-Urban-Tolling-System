import React from 'react';
import { Device, DeviceStatus } from '../types';
import { ShieldCheck, Server, Globe, Wifi } from 'lucide-react';

interface NetworkTopologyProps {
  devices: Device[];
}

const NetworkTopology: React.FC<NetworkTopologyProps> = ({ devices }) => {
  // Simplified tree: Core -> Distribution -> Edge
  return (
    <div className="w-full h-full min-h-[300px] relative flex flex-col items-center justify-center space-y-8 p-4">
       
       {/* Core Layer */}
       <div className="flex flex-col items-center z-10">
          <div className="w-16 h-16 bg-blue-900/50 rounded-xl border border-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse">
             <Globe className="text-blue-300" size={32} />
          </div>
          <span className="mt-2 text-xs text-blue-300 font-mono">CORE_MPLS_VPN</span>
       </div>

       {/* Link Lines (SVG) */}
       <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <path d="M 50% 20% L 50% 50%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_1s_linear_infinite]" />
          <path d="M 50% 50% L 20% 80%" stroke="#64748b" strokeWidth="2" />
          <path d="M 50% 50% L 80% 80%" stroke="#64748b" strokeWidth="2" />
       </svg>

       {/* Distribution Layer */}
       <div className="flex items-center gap-4 z-10 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-700">
           <ShieldCheck size={20} className="text-emerald-500" />
           <span className="text-xs font-mono text-zinc-400">FW-CLUST-01 (ACTIVE)</span>
       </div>

        {/* Edge Layer (Gantries) */}
       <div className="flex w-full justify-between px-12 z-10">
           {/* Gantry 1 Controller */}
           <div className="flex flex-col items-center">
               <div className="w-12 h-12 bg-zinc-800 rounded border border-zinc-600 flex items-center justify-center relative">
                   <Server size={20} className="text-zinc-300" />
                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black"></div>
               </div>
               <span className="mt-1 text-[10px] text-zinc-500">EDGE_NODE_01</span>
           </div>

           {/* Switch 2 */}
            <div className="flex flex-col items-center">
               <div className="w-12 h-12 bg-zinc-800 rounded border border-zinc-600 flex items-center justify-center relative">
                   <Wifi size={20} className="text-zinc-300" />
                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black"></div>
               </div>
               <span className="mt-1 text-[10px] text-zinc-500">IND_SWITCH_04</span>
           </div>
       </div>

       <div className="absolute bottom-2 right-2 flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
           <span className="text-[10px] text-emerald-500 font-mono">BACKBONE: STABLE (1.2ms)</span>
       </div>
    </div>
  );
};

export default NetworkTopology;