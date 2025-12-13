import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Network, AlertCircle, Settings, Play, Pause, RotateCcw, MessageSquare, Menu, X, CheckCircle, ChevronRight, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import DigitalTwin from './components/DigitalTwin';
import TransactionFlow from './components/TransactionFlow';
import NetworkTopology from './components/NetworkTopology';
import { MOCK_GANTRY_DEVICES, SYSTEM_NAME, TOLL_RATES } from './constants';
import { Device, Transaction, Alarm, SimulationState, DeviceStatus, VehicleClass } from './types';
import { generateAIResponse } from './services/geminiService';

const App = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'NETWORK' | 'OPERATIONS'>('DASHBOARD');
  const [devices, setDevices] = useState<Device[]>(MOCK_GANTRY_DEVICES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [simulation, setSimulation] = useState<SimulationState>({
    trafficVolume: 65,
    failureRate: 0,
    weather: 'SUNNY',
    timeOfDay: 10,
  });
  const [isSimRunning, setIsSimRunning] = useState(true);
  
  // AI Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    {role: 'ai', text: 'Hello. I am the STTP AI Operator. How can I assist you with the tolling infrastructure today?'}
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Selected Device for Sidebar
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // --- Simulation Logic (Time & Alarms only, Traffic is driven by DigitalTwin) ---
  useEffect(() => {
    if (!isSimRunning) return;

    const interval = setInterval(() => {
      // 1. Simulate Time
      setSimulation(prev => ({
        ...prev,
        timeOfDay: prev.timeOfDay >= 23.9 ? 0 : prev.timeOfDay + 0.1
      }));

      // 2. Simulate Random Device Failures based on Slider
      if (Math.random() * 100 < simulation.failureRate) {
        setDevices(prev => {
          const idx = Math.floor(Math.random() * prev.length);
          const newDevices = [...prev];
          if (newDevices[idx].status === DeviceStatus.ONLINE) {
             newDevices[idx].status = DeviceStatus.WARNING;
             setAlarms(a => [{
               id: Date.now().toString(),
               timestamp: new Date().toLocaleTimeString(),
               severity: 'MAJOR',
               device: newDevices[idx].name,
               message: 'Device unresponsive / High latency detected',
               acknowledged: false
             }, ...a]);
          }
          return newDevices;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimRunning, simulation.failureRate]);

  // --- Vehicle Detection Handler (Called by DigitalTwin) ---
  const handleVehicleDetected = (vehicleClass: VehicleClass, lane: number, speed: number) => {
    const amount = TOLL_RATES[vehicleClass];
    
    // Generate Plate
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    const plate = `${chars[Math.floor(Math.random()*26)]}${chars[Math.floor(Math.random()*26)]}${chars[Math.floor(Math.random()*26)]}-${nums[Math.floor(Math.random()*10)]}${nums[Math.floor(Math.random()*10)]}${nums[Math.floor(Math.random()*10)]}`;

    const newTx: Transaction = {
      id: `TX-${Math.floor(Math.random() * 100000)}`,
      timestamp: new Date().toLocaleTimeString(),
      plate: plate,
      confidence: 0.98 + (Math.random() * 0.02 - 0.01),
      vehicleClass: vehicleClass,
      speed: Math.floor(speed),
      lane: lane,
      status: 'CAPTURED',
      amount: amount,
      images: { front: '', rear: '', overview: '' }
    };

    setTransactions(prev => [newTx, ...prev].slice(0, 10)); // Keep last 10
  };

  // --- AI Handler ---
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsAiThinking(true);

    const aiResponse = await generateAIResponse(userMsg, {
      devices,
      alarms,
      simulation,
      recentTransactions: transactions.slice(0, 5)
    });

    setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setIsAiThinking(false);
  };

  // --- Charts Data ---
  const trafficData = Array.from({ length: 12 }, (_, i) => ({
    name: `${i * 2}:00`,
    vehicles: Math.floor(Math.random() * 500) + 100 + (simulation.trafficVolume * 5),
    revenue: Math.floor(Math.random() * 5000) + 1000
  }));

  return (
    <div className="flex h-screen w-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {/* Sidebar Navigation */}
      <div className="w-20 lg:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between transition-all duration-300 shrink-0">
        <div>
          <div className="p-6 flex items-center gap-3">
             <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
               <Activity className="text-white" size={20} />
             </div>
             <span className="hidden lg:block font-bold tracking-tight text-white">{SYSTEM_NAME.split(' ')[0]} <span className="text-emerald-500">Twin</span></span>
          </div>

          <nav className="mt-6 flex flex-col gap-2 px-3">
            {[
              { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Overview' },
              { id: 'NETWORK', icon: Network, label: 'Network Topology' },
              { id: 'OPERATIONS', icon: Settings, label: 'System Ops' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="hidden lg:block text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-800">
           <div className="bg-zinc-800/50 rounded-xl p-3 flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sim Controls</span>
              
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setIsSimRunning(!isSimRunning)}
                  className={`p-2 rounded-lg ${isSimRunning ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}
                >
                  {isSimRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button 
                   onClick={() => setDevices(MOCK_GANTRY_DEVICES)}
                   className="p-2 rounded-lg bg-zinc-700 text-zinc-400 hover:text-white"
                   title="Reset Devices"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <div className="space-y-1">
                 <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Traffic Volume</span>
                    <span>{simulation.trafficVolume}%</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" max="100" 
                   value={simulation.trafficVolume}
                   onChange={(e) => setSimulation(s => ({...s, trafficVolume: parseInt(e.target.value)}))}
                   className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                 />
              </div>

              <div className="space-y-1">
                 <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Equip. Failures</span>
                    <span>{simulation.failureRate}%</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" max="100" 
                   value={simulation.failureRate}
                   onChange={(e) => setSimulation(s => ({...s, failureRate: parseInt(e.target.value)}))}
                   className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-500"
                 />
              </div>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 bg-black/50 backdrop-blur flex items-center justify-between px-6 z-10">
           <div>
              <h2 className="text-lg font-semibold text-white">
                {activeTab === 'DASHBOARD' && 'Operations Dashboard'}
                {activeTab === 'NETWORK' && 'Network Infrastructure'}
                {activeTab === 'OPERATIONS' && 'System Health & Maintenance'}
              </h2>
              <div className="text-xs text-zinc-500 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 SYSTEM ONLINE &bull; {new Date().toLocaleDateString()}
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setChatOpen(!chatOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${chatOpen ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
              >
                <MessageSquare size={16} />
                <span className="text-sm font-medium">AI Assistant</span>
              </button>
           </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           
           {/* Top Stats */}
           {activeTab === 'DASHBOARD' && (
             <>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Daily Revenue', value: '$124,592', trend: '+12%', color: 'text-emerald-400' },
                    { label: 'Vehicles Processed', value: '45,201', trend: '+5%', color: 'text-blue-400' },
                    { label: 'OCR Accuracy', value: '99.8%', trend: '-0.1%', color: 'text-zinc-200' },
                    { label: 'Active Alarms', value: alarms.length.toString(), trend: alarms.length > 0 ? 'CRITICAL' : 'NOMINAL', color: alarms.length > 0 ? 'text-rose-500' : 'text-emerald-500' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 glass-panel">
                       <span className="text-zinc-500 text-xs uppercase font-medium">{stat.label}</span>
                       <div className="mt-2 flex items-baseline gap-2">
                          <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                          <span className="text-xs text-zinc-600">{stat.trend}</span>
                       </div>
                    </div>
                  ))}
               </div>

               {/* Digital Twin & Transaction Flow Row */}
               <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Visualizer (2/3 width) */}
                  <div className="xl:col-span-2 space-y-4">
                     <div className="flex items-center justify-between">
                       <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500"/> Live Roadside Twin (Appleton Dock Entry)</h3>
                     </div>
                     <DigitalTwin 
                        devices={devices} 
                        onDeviceClick={setSelectedDevice} 
                        simulationTime={simulation.timeOfDay}
                        trafficVolume={simulation.trafficVolume}
                        isSimRunning={isSimRunning}
                        onVehicleDetected={handleVehicleDetected}
                     />
                  </div>
                  
                  {/* Flow & Alarms (1/3 width) */}
                  <div className="space-y-4 flex flex-col">
                     <h3 className="text-sm font-semibold text-zinc-300">Processing Pipeline</h3>
                     <TransactionFlow transactions={transactions} />
                     
                     <div className="flex-1 bg-zinc-900/50 border border-white/5 rounded-xl p-4 overflow-hidden flex flex-col glass-panel">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-3 flex items-center justify-between">
                            Active Alarms 
                            <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-[10px]">{alarms.length}</span>
                        </h4>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                           {alarms.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                                <CheckCircle size={32} />
                                <span className="mt-2 text-xs">System Healthy</span>
                             </div>
                           ) : (
                             alarms.map(alarm => (
                               <div key={alarm.id} className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                  <AlertCircle className="text-rose-500 shrink-0" size={16} />
                                  <div>
                                     <div className="text-xs font-bold text-rose-200">{alarm.device}</div>
                                     <div className="text-[10px] text-rose-300/80 leading-tight mt-1">{alarm.message}</div>
                                     <div className="text-[10px] text-zinc-500 mt-2">{alarm.timestamp}</div>
                                  </div>
                               </div>
                             ))
                           )}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Charts Row */}
               <div className="h-64 bg-zinc-900/50 border border-white/5 rounded-xl p-4 glass-panel">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4">Traffic Volume & Revenue Analysis (24h)</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trafficData}>
                      <defs>
                        <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                        itemStyle={{ color: '#e4e4e7' }}
                      />
                      <Area type="monotone" dataKey="vehicles" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVehicles)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
             </>
           )}

           {activeTab === 'NETWORK' && (
             <div className="h-full bg-zinc-900/50 border border-white/5 rounded-xl p-4 glass-panel">
                <NetworkTopology devices={devices} />
             </div>
           )}

        </div>

        {/* Device Detail Slide-over */}
        {selectedDevice && (
          <div className="absolute top-0 right-0 h-full w-80 bg-zinc-900/95 backdrop-blur border-l border-zinc-800 shadow-2xl z-40 transform transition-transform duration-300 p-6">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-lg font-bold text-white">{selectedDevice.name}</h3>
               <button onClick={() => setSelectedDevice(null)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
             </div>
             
             <div className="space-y-6">
                <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700 relative overflow-hidden group">
                   {selectedDevice.type === 'CAMERA' ? (
                     <>
                      <img src={`https://picsum.photos/400/300?grayscale&blur=2`} alt="feed" className="opacity-50 group-hover:opacity-80 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-mono bg-black/50 px-2 py-1 rounded border border-white/20">LIVE FEED OFF</span>
                      </div>
                     </>
                   ) : (
                     <Activity size={32} className="text-zinc-600" />
                   )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-sm text-zinc-500">Status</span>
                    <span className={`text-sm font-bold ${selectedDevice.status === 'ONLINE' ? 'text-emerald-500' : 'text-rose-500'}`}>{selectedDevice.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-sm text-zinc-500">Temperature</span>
                    <span className="text-sm font-mono text-white">{selectedDevice.temperature}°C</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-sm text-zinc-500">Uptime</span>
                    <span className="text-sm font-mono text-white">{selectedDevice.uptime} Hrs</span>
                  </div>
                   <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-sm text-zinc-500">Last Ping</span>
                    <span className="text-sm font-mono text-white">{selectedDevice.lastPing}</span>
                  </div>
                </div>

                <button className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors mt-4">
                   Run Diagnostics
                </button>
             </div>
          </div>
        )}

        {/* AI Chat Window */}
        <div className={`absolute bottom-6 right-6 w-96 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right z-50 ${chatOpen ? 'opacity-100 scale-100 h-[600px]' : 'opacity-0 scale-90 h-0 pointer-events-none'}`}>
           <div className="p-4 border-b border-zinc-700 bg-zinc-800/50 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="font-bold text-white">AI Operations Assistant</span>
              </div>
              <button onClick={() => setChatOpen(false)}><X size={16} className="text-zinc-400" /></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                      {msg.text}
                   </div>
                </div>
              ))}
              {isAiThinking && (
                 <div className="flex justify-start">
                   <div className="bg-zinc-800 text-zinc-500 p-3 rounded-lg text-xs italic animate-pulse">
                      Analyzing System Telemetry...
                   </div>
                </div>
              )}
           </div>

           <div className="p-4 bg-zinc-900 border-t border-zinc-700 rounded-b-2xl">
              <div className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about alarms, revenue, or device health..."
                  className="w-full bg-zinc-800 text-white p-3 pr-10 rounded-lg border border-zinc-700 focus:border-emerald-500 focus:outline-none text-sm"
                />
                <button 
                  onClick={handleSendMessage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
           </div>
        </div>

      </main>
    </div>
  );
};

export default App;