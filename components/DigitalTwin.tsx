import React, { useState, useEffect, useRef } from 'react';
import { Device, DeviceStatus, VehicleClass } from '../types';
import { TRAFFIC_DISTRIBUTION } from '../constants';
import { Video, Server, Battery, Zap, Activity, Aperture, ArrowDown, Wifi, Siren } from 'lucide-react';

interface DigitalTwinProps {
  devices: Device[];
  onDeviceClick: (device: Device) => void;
  simulationTime: number;
  trafficVolume: number;
  isSimRunning: boolean;
  onVehicleDetected: (vehicleClass: VehicleClass, lane: number, speed: number) => void;
}

// Extended Visual Vehicle Type
interface VisualVehicle {
  id: number;
  lane: number; // 0, 1, 2
  y: number; // 0 to 100% (top to bottom)
  speed: number;
  type: VehicleClass;
  processed: boolean;
  color: string;
  variant: 'sedan' | 'suv' | 'truck' | 'sport' | 'standard'; // Shape variation
}

const CAR_COLORS = ['bg-zinc-300', 'bg-zinc-800', 'bg-blue-700', 'bg-red-700', 'bg-white', 'bg-emerald-800', 'bg-slate-400'];
const TRUCK_COLORS = ['bg-white', 'bg-blue-600', 'bg-orange-500', 'bg-yellow-500', 'bg-zinc-100'];

const DigitalTwin: React.FC<DigitalTwinProps> = ({ 
  devices, 
  onDeviceClick, 
  simulationTime, 
  trafficVolume, 
  isSimRunning,
  onVehicleDetected 
}) => {
  const [vehicles, setVehicles] = useState<VisualVehicle[]>([]);
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const lastSpawnTime = useRef<number>(0);
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
  const [flashLane, setFlashLane] = useState<number | null>(null); // Lane index triggering flash

  // --- Animation Loop ---
  const animate = (time: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }
    const deltaTime = (time - previousTimeRef.current) / 1000; // Seconds
    previousTimeRef.current = time;

    if (!isSimRunning) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    setVehicles(prevVehicles => {
      const nextVehicles: VisualVehicle[] = [];
      const laneOccupied = [false, false, false];

      // 1. Move & Detect
      prevVehicles.forEach(v => {
        // Physics: Speed (km/h) -> Screen % per second
        // Adjust multiplier to calibrate visual speed
        const moveStep = v.speed * 0.4 * deltaTime; 
        v.y += moveStep;

        // Check Trigger Line (Gantry @ 72%)
        const TRIGGER_LINE = 72;
        if (v.y >= TRIGGER_LINE && !v.processed) {
          v.processed = true;
          triggerDetection(v);
        }

        // Keep if on screen
        if (v.y < 120) {
          nextVehicles.push(v);
          // Mark lane occupied if vehicle is in the "spawn zone" (top 15%)
          if (v.y < 15) {
            laneOccupied[v.lane] = true;
          }
        }
      });

      // 2. Spawn Logic
      const spawnInterval = Math.max(200, 2500 - (trafficVolume * 20)); // Min 200ms, Max 2.5s
      if (time - lastSpawnTime.current > spawnInterval) {
        // Try to spawn
        if (Math.random() < 0.8) {
           const newVehicle = createVehicle(laneOccupied);
           if (newVehicle) {
             nextVehicles.push(newVehicle);
             lastSpawnTime.current = time;
           }
        } else {
           // Skip frame to add variety
           lastSpawnTime.current = time + 100;
        }
      }

      // Sort by Y for proper Z-indexing (vehicles in front drawn last? No, HTML order means last is top. 
      // We want closer vehicles (High Y) to overlap further ones (Low Y).
      // So Low Y first (drawn behind), High Y last (drawn in front).
      return nextVehicles.sort((a, b) => a.y - b.y);
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [trafficVolume, isSimRunning]);

  const createVehicle = (laneOccupied: boolean[]): VisualVehicle | null => {
    // Weighted Random Choice for Vehicle Type
    const rand = Math.random() * 100;
    let accumulated = 0;
    let selectedType = VehicleClass.CLASS_2_CAR;
    
    for (const item of TRAFFIC_DISTRIBUTION) {
      accumulated += item.weight;
      if (rand <= accumulated) {
        selectedType = item.type;
        break;
      }
    }

    // Smart Lane Selection
    // Heavy vehicles prefer left lanes (0, 1), Fast cars prefer right (2)
    let availableLanes: number[] = [];
    if (selectedType === VehicleClass.CLASS_7_LHCV || selectedType === VehicleClass.CLASS_4_HCV) {
        if (!laneOccupied[0]) availableLanes.push(0);
        if (!laneOccupied[1]) availableLanes.push(1);
    } else {
        if (!laneOccupied[0]) availableLanes.push(0);
        if (!laneOccupied[1]) availableLanes.push(1);
        if (!laneOccupied[2]) availableLanes.push(2);
    }
    
    if (availableLanes.length === 0) return null; // No space

    // Pick random available lane
    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

    // Speed calculation based on lane & type
    // Lane 1: 60-80, Lane 2: 70-90, Lane 3: 90-110
    let baseSpeed = 70;
    if (lane === 1) baseSpeed = 80;
    if (lane === 2) baseSpeed = 100;

    // Adjust for type
    if (selectedType === VehicleClass.CLASS_7_LHCV) baseSpeed *= 0.8; // Slow down big trucks
    if (selectedType === VehicleClass.CLASS_4_HCV) baseSpeed *= 0.9;

    // Add Randomness (+/- 10%)
    const finalSpeed = baseSpeed * (0.9 + Math.random() * 0.2);

    // Visual Variations
    let color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    let variant: VisualVehicle['variant'] = 'standard';

    if (selectedType === VehicleClass.CLASS_2_CAR) {
        const r = Math.random();
        if (r < 0.3) variant = 'suv';
        else if (r < 0.5) variant = 'sport';
        else variant = 'sedan';
    } else if (selectedType === VehicleClass.CLASS_4_HCV || selectedType === VehicleClass.CLASS_7_LHCV) {
        color = TRUCK_COLORS[Math.floor(Math.random() * TRUCK_COLORS.length)];
        variant = 'truck';
    }

    return {
        id: Date.now() + Math.random(),
        lane,
        y: -20, // Start off-screen top
        speed: finalSpeed,
        type: selectedType,
        processed: false,
        color,
        variant
    };
  };

  const triggerDetection = (v: VisualVehicle) => {
    setFlashLane(v.lane);
    setTimeout(() => setFlashLane(null), 50); // Faster, sharper flash
    onVehicleDetected(v.type, v.lane + 1, v.speed);
  };

  // --- Rendering Helpers ---

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ONLINE: return 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
      case DeviceStatus.WARNING: return 'bg-amber-500 shadow-[0_0_8px_#f59e0b]';
      case DeviceStatus.OFFLINE: return 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';
      default: return 'bg-gray-500';
    }
  };

  const isNight = simulationTime > 19 || simulationTime < 6;

  // Render Individual Vehicle Models
  const renderVehicle = (v: VisualVehicle) => {
    // 3D Perspective Scale: Items get larger as y increases (approaching viewer)
    const scale = 0.5 + (v.y / 100) * 1.8; 
    const opacity = v.y < -5 ? 0 : 1;

    // Headlight logic
    const headlights = (
        <>
            <div className={`absolute bottom-[2px] left-1 w-2 h-1 bg-yellow-100 rounded-full ${isNight ? 'shadow-[0_10px_20px_rgba(255,255,200,0.6)]' : ''}`}></div>
            <div className={`absolute bottom-[2px] right-1 w-2 h-1 bg-yellow-100 rounded-full ${isNight ? 'shadow-[0_10px_20px_rgba(255,255,200,0.6)]' : ''}`}></div>
            {isNight && (
                <>
                  <div className="absolute bottom-[-60px] left-1 w-8 h-24 bg-gradient-to-b from-yellow-100/30 to-transparent transform -skew-x-12 blur-md"></div>
                  <div className="absolute bottom-[-60px] right-1 w-8 h-24 bg-gradient-to-b from-yellow-100/30 to-transparent transform skew-x-12 blur-md"></div>
                </>
            )}
        </>
    );

    const shadow = <div className="absolute top-[5%] left-[-10%] w-[120%] h-[110%] bg-black/40 blur-md rounded-full transform scale-y-110"></div>;
    const wheels = (offsetY: number = 0) => (
      <>
         <div className="absolute -left-1 top-[15%] w-1 h-3 bg-black rounded-l"></div>
         <div className="absolute -right-1 top-[15%] w-1 h-3 bg-black rounded-r"></div>
         <div className="absolute -left-1 bottom-[15%] w-1 h-3 bg-black rounded-l"></div>
         <div className="absolute -right-1 bottom-[15%] w-1 h-3 bg-black rounded-r"></div>
      </>
    );

    // CSS for suspension animation
    const suspensionStyle = { animation: `rumble ${0.2 + Math.random() * 0.1}s infinite linear`, willChange: 'transform' };

    let content = null;

    if (v.type === VehicleClass.CLASS_1_MOTO) {
      // Motorcycle
      content = (
        <div className="relative w-4 h-10" style={suspensionStyle}>
            {shadow}
            <div className="absolute inset-0 bg-zinc-800 rounded-full flex flex-col items-center">
                 <div className={`w-3 h-4 ${v.color} rounded-t-full mt-1`}></div> {/* Rider/Tank */}
                 <div className="w-4 h-1 bg-zinc-400 mt-1"></div> {/* Handlebars */}
                 <div className="w-2 h-2 bg-yellow-200 rounded-full mt-auto mb-1 shadow-lg"></div> {/* Headlight */}
                 {isNight && <div className="absolute bottom-[-40px] w-4 h-16 bg-gradient-to-b from-yellow-100/40 to-transparent blur-md"></div>}
            </div>
        </div>
      );
    } else if (v.type === VehicleClass.CLASS_2_CAR) {
      // Car Variants
      const isSuv = v.variant === 'suv';
      const isSport = v.variant === 'sport';
      const width = isSuv ? 'w-14' : 'w-12';
      const height = isSuv ? 'h-24' : 'h-22';
      
      content = (
        <div className={`relative ${width} ${height}`} style={suspensionStyle}>
           {shadow}
           {wheels()}
           {/* Chassis */}
           <div className={`absolute inset-0 ${v.color} rounded-lg overflow-hidden shadow-inner border-b-2 border-black/20`}>
              {/* Roof / Windshield Area */}
              <div className={`absolute top-[20%] left-[5%] right-[5%] bottom-[25%] bg-zinc-900/20 rounded-lg`}>
                 {/* Windshield */}
                 <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-sky-300/40 to-sky-900/60 backdrop-blur-[1px]"></div>
                 {/* Rear Window */}
                 <div className="absolute top-0 left-0 right-0 h-[25%] bg-black/60"></div>
                 {/* Roof Top */}
                 <div className={`absolute top-[25%] left-0 right-0 bottom-[40%] ${v.color} brightness-110`}></div>
              </div>
              {/* Hood Details */}
              <div className="absolute bottom-0 left-0 w-full h-[25%] bg-gradient-to-t from-black/10 to-transparent"></div>
              {/* Grill */}
              <div className="absolute bottom-0.5 left-1/4 right-1/4 h-1 bg-black/50 rounded-full"></div>
              {headlights}
           </div>
        </div>
      );
    } else if (v.type === VehicleClass.CLASS_4_HCV) {
        // Truck (Cab + Box)
        content = (
            <div className="relative w-16 h-36" style={suspensionStyle}>
                {shadow}
                {/* Rear Wheels */}
                <div className="absolute -left-1 top-[10%] w-1.5 h-6 bg-black rounded-l"></div>
                <div className="absolute -right-1 top-[10%] w-1.5 h-6 bg-black rounded-r"></div>
                {/* Front Wheels */}
                <div className="absolute -left-1 bottom-[10%] w-1.5 h-4 bg-black rounded-l"></div>
                <div className="absolute -right-1 bottom-[10%] w-1.5 h-4 bg-black rounded-r"></div>

                {/* Cargo Box (Rear/Top) */}
                <div className={`absolute top-0 left-0 w-full h-[70%] bg-zinc-100 border border-zinc-300 rounded-sm shadow-sm flex items-center justify-center overflow-hidden`}>
                     {/* Corrugated Texture */}
                     <div className="w-full h-full opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#000_4px,#000_5px)]"></div>
                </div>

                {/* Connector */}
                <div className="absolute top-[68%] left-1/3 right-1/3 h-2 bg-zinc-800"></div>

                {/* Cab (Front/Bottom) */}
                <div className={`absolute bottom-0 left-0 w-full h-[28%] ${v.color} rounded-sm shadow-md border-b-2 border-black/20`}>
                    <div className="absolute top-1 left-1 right-1 h-[40%] bg-sky-900 rounded-sm"></div> {/* Windshield */}
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-zinc-800"></div> {/* Bumper */}
                    {headlights}
                </div>
            </div>
        );
    } else if (v.type === VehicleClass.CLASS_7_LHCV) {
        // Road Train (Trailer 2 + Trailer 1 + Cab)
        content = (
            <div className="relative w-16 h-64" style={suspensionStyle}>
                {shadow}
                
                {/* Trailer 2 (Top) */}
                <div className="absolute top-0 left-0 w-full h-[30%] bg-zinc-200 border border-zinc-400 rounded-sm shadow-sm">
                    <div className="w-full h-full opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,#000_10px,#000_11px)]"></div>
                </div>
                
                {/* Link 2 */}
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-2 h-4 bg-black"></div>

                {/* Trailer 1 (Middle) */}
                <div className="absolute top-[34%] left-0 w-full h-[35%] bg-zinc-200 border border-zinc-400 rounded-sm shadow-sm">
                    <div className="w-full h-full opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,#000_10px,#000_11px)]"></div>
                </div>

                {/* Link 1 */}
                <div className="absolute top-[69%] left-1/2 -translate-x-1/2 w-2 h-4 bg-black"></div>

                {/* Cab (Bottom) */}
                <div className={`absolute bottom-0 left-0 w-full h-[25%] ${v.color} rounded-sm shadow-md`}>
                    <div className="absolute top-1 left-1 right-1 h-[30%] bg-sky-900 rounded-sm"></div>
                    <div className="absolute bottom-0 left-0 w-full h-3 bg-zinc-800"></div> {/* Big Bumper */}
                    {headlights}
                </div>
            </div>
        );
    }

    // Position calc: 3 lanes. Lane 0 = 20%, Lane 1 = 50%, Lane 2 = 80%
    const lanePositions = ['20%', '50%', '80%'];
    const leftPos = lanePositions[v.lane];

    return (
      <div 
        key={v.id}
        className={`absolute z-20 flex justify-center items-end`}
        style={{
          left: leftPos,
          top: `${v.y}%`,
          transform: `translate(-50%, -100%) scale(${scale})`,
          opacity: opacity,
          zIndex: Math.floor(v.y) // Ensure closer vehicles (higher Y) are on top
        }}
      >
        {content}
      </div>
    );
  };

  // --- Render Devices for a Lane ---
  const renderLaneEquipment = (laneIndex: number, deviceList: Device[]) => {
      const isFlash = flashLane === laneIndex;
      const cam = deviceList.find(d => d.type === 'CAMERA');
      const laser = deviceList.find(d => d.type === 'LASER');
      const status = cam?.status || DeviceStatus.ONLINE;

      return (
        <div className="relative flex flex-col items-center group pointer-events-auto cursor-pointer" onClick={() => cam && onDeviceClick(cam)}>
             {/* Lane Control Sign (LCS) */}
             <div className="mb-4 w-16 h-16 bg-black border-4 border-zinc-700 rounded-md flex items-center justify-center relative shadow-lg overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_50%,rgba(0,0,0,0.8)_100%)] z-10"></div>
                 {/* LED Matrix Grid Effect */}
                 <div className="absolute inset-0 bg-[length:2px_2px] bg-[rgba(30,30,30,1)] opacity-50 z-0"></div>
                 <span className="text-emerald-500 font-mono font-bold text-lg tracking-widest z-10 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">80</span>
                 {/* Warning corner LEDs */}
                 <div className="absolute top-1 left-1 w-1 h-1 bg-amber-500 rounded-full animate-pulse"></div>
                 <div className="absolute top-1 right-1 w-1 h-1 bg-amber-500 rounded-full animate-pulse delay-75"></div>
                 <div className="absolute bottom-1 left-1 w-1 h-1 bg-amber-500 rounded-full animate-pulse delay-150"></div>
                 <div className="absolute bottom-1 right-1 w-1 h-1 bg-amber-500 rounded-full animate-pulse delay-300"></div>
             </div>
             
             {/* Mounting Bracket */}
             <div className="h-8 w-1 bg-zinc-500 mb-[-2px]"></div>

             {/* Sensor Housing Cluster */}
             <div className="relative flex gap-1 bg-zinc-800 p-1.5 rounded-b-lg border border-zinc-600 shadow-xl transform transition-transform hover:scale-110">
                 
                 {/* ANPR Camera Unit */}
                 <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 bg-black rounded-full border-2 border-zinc-500 flex items-center justify-center relative overflow-hidden">
                        {/* Lens Reflection */}
                        <div className="absolute top-1 right-1 w-3 h-3 bg-white/10 rounded-full blur-[1px]"></div>
                        <div className="w-3 h-3 bg-indigo-900 rounded-full border border-indigo-700"></div>
                    </div>
                    <div className={`w-6 h-1 rounded-full ${getStatusColor(status)}`}></div>
                 </div>

                 {/* IR Illuminator / Laser Unit */}
                 {laser && (
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 bg-zinc-900 rounded border border-zinc-600 grid grid-cols-3 gap-[1px] p-[2px] content-center">
                            {/* IR LEDs */}
                            {Array.from({length: 9}).map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 bg-red-900/50 rounded-full"></div>
                            ))}
                        </div>
                    </div>
                 )}

                 {/* Flash Effect Overlay */}
                 {isFlash && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-200/40 rounded-full blur-2xl z-50 animate-[ping_0.1s_ease-out]"></div>
                 )}
             </div>
             
             {/* Lane Label */}
             <div className="mt-2 text-[9px] bg-black/70 px-1.5 py-0.5 rounded text-zinc-400 font-mono tracking-wider border border-white/10">
                 LANE {laneIndex + 1}
             </div>
        </div>
      );
  }

  return (
    <div className={`relative w-full h-[600px] overflow-hidden rounded-xl border border-white/10 transition-colors duration-2000 ${isNight ? 'bg-slate-900' : 'bg-sky-300'}`}>
      
      {/* Global Styles for Animations */}
      <style>{`
        @keyframes rumble {
          0% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-0.5px) rotate(0.2deg); }
          50% { transform: translateY(0px) rotate(0deg); }
          75% { transform: translateY(0.5px) rotate(-0.2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>

      {/* --- Environment --- */}
      <div className={`absolute inset-0 bg-gradient-to-b ${isNight ? 'from-slate-950 via-slate-900 to-black' : 'from-sky-400 via-sky-200 to-emerald-900'} opacity-100`}></div>
      
      {/* Cityscape Silhouette */}
      <div className={`absolute bottom-[35%] left-0 w-full h-48 bg-[url('https://raw.githubusercontent.com/google-fonts/noto-emoji/main/png/512/1f303.png')] opacity-30 bg-repeat-x bg-contain grayscale mix-blend-overlay`}></div>

      {/* --- The Road (Perspective Plane) --- */}
      <div className="absolute bottom-0 w-full h-[70%] bg-zinc-800 origin-bottom transform [perspective:1000px] overflow-hidden flex justify-center">
         {/* Road Surface Container - Rotated for 3D effect */}
         <div className="relative w-[150%] h-full bg-zinc-800 origin-bottom transform rotate-x-[60deg] shadow-[inset_0_50px_100px_rgba(0,0,0,0.8)]">
            
            {/* Lane Markers */}
            <div className="absolute inset-0 flex justify-evenly">
                {/* Left Shoulder */}
                <div className="h-full w-4 bg-yellow-500 border-r border-yellow-600"></div>
                {/* Lane Divider 1 */}
                <div className="h-full w-3 bg-dashed-line opacity-70"></div>
                {/* Lane Divider 2 */}
                <div className="h-full w-3 bg-dashed-line opacity-70"></div>
                {/* Right Shoulder */}
                <div className="h-full w-4 bg-white border-l border-zinc-400"></div>
            </div>
            
            {/* Gantry Shadow on Road */}
            <div className="absolute top-[30%] left-0 w-full h-8 bg-black/50 blur-xl"></div>
         </div>
      </div>

      {/* --- Vehicles Layer (2D Overlay with Scaling) --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         {vehicles.map(renderVehicle)}
      </div>


      {/* --- The Gantry (Foreground) --- */}
      <div className="absolute top-[58%] left-1/2 -translate-x-1/2 w-full max-w-5xl z-30 pointer-events-none perspective-[1000px]">
          
          {/* Support Pillars (Left & Right) */}
          <div className="absolute left-4 top-[-50px] bottom-[-400px] w-16 bg-gradient-to-r from-zinc-700 to-zinc-800 border-r-4 border-zinc-900 z-0">
               {/* Concrete Base */}
               <div className="absolute bottom-[350px] -left-4 w-24 h-32 bg-zinc-500 border-t border-zinc-400 rounded-sm"></div>
               {/* Warning Light */}
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full animate-ping"></div>
          </div>
          <div className="absolute right-4 top-[-50px] bottom-[-400px] w-16 bg-gradient-to-l from-zinc-700 to-zinc-800 border-l-4 border-zinc-900 z-0">
               {/* Concrete Base */}
               <div className="absolute bottom-[350px] -right-4 w-24 h-32 bg-zinc-500 border-t border-zinc-400 rounded-sm"></div>
               {/* Warning Light */}
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full animate-ping delay-700"></div>
          </div>

          {/* Main Horizontal Truss Structure */}
          <div className="relative w-full h-40 bg-zinc-800/90 border-y-4 border-zinc-600 shadow-2xl backdrop-blur-sm z-10 flex flex-col justify-end pb-2">
             
             {/* Industrial Cross Bracing Texture */}
             <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,#18181b_20px,#18181b_24px),repeating-linear-gradient(-45deg,transparent,transparent_20px,#18181b_20px,#18181b_24px)] pointer-events-none"></div>
             
             {/* Maintenance Walkway Railing (Top) */}
             <div className="absolute -top-10 left-0 w-full h-10 border-b-2 border-zinc-500 flex justify-between px-2 items-end">
                  {/* Railing posts */}
                  {Array.from({length: 12}).map((_, i) => (
                      <div key={i} className="w-1 h-full bg-zinc-500"></div>
                  ))}
                  <div className="absolute top-2 left-0 w-full h-1 bg-zinc-500"></div> {/* Top bar */}
                  <div className="absolute top-6 left-0 w-full h-1 bg-zinc-500"></div> {/* Mid bar */}
             </div>
             
             {/* Content Container (LCS + Sensors) */}
             <div className="relative flex w-full justify-evenly items-start z-20 pt-4">
                 
                 {/* Lane 1 Equipment */}
                 {renderLaneEquipment(0, [devices[0], devices[1]])}

                 {/* Lane 2 Equipment */}
                 {renderLaneEquipment(1, [devices[2], devices[3]])}

                 {/* Lane 3 Equipment */}
                 {renderLaneEquipment(2, [devices[4], devices[5]])}

             </div>

             {/* Signage on Truss */}
             <div className="absolute top-2 left-8 bg-yellow-500 text-black font-bold text-[10px] px-2 py-0.5 rounded-sm border border-yellow-600 shadow-sm">
                 MAX HEIGHT 4.8M
             </div>
             <div className="absolute top-2 right-8 bg-zinc-200 text-black font-bold text-[10px] px-2 py-0.5 rounded-sm border border-zinc-400 shadow-sm">
                 TOLL ZONE
             </div>

          </div>

          {/* Side Cabinets Visualization (Moved slightly out for composition) */}
          <div className="absolute -right-24 bottom-[-80px] w-20 h-32 pointer-events-auto group cursor-pointer z-20" onClick={() => onDeviceClick(devices.find(d => d.type === 'CABINET')!)}>
              <div className="w-full h-full bg-zinc-300 border-2 border-zinc-400 rounded shadow-2xl relative">
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_#10b981]"></div>
                  <div className="absolute bottom-4 left-3 right-3 h-1 bg-zinc-400"></div> {/* Vent */}
                  <div className="absolute top-4 left-3 right-3 h-1 bg-zinc-400"></div> {/* Vent */}
                  <div className="absolute top-1/2 left-2 w-2 h-8 bg-zinc-400 rounded-full"></div> {/* Handle */}
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-0 bg-black text-white text-[10px] p-1 rounded transition-opacity whitespace-nowrap border border-zinc-700">
                     Cabinet A (Online)
                  </div>
              </div>
          </div>

      </div>

      {/* Overlay Info */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded border border-white/10">
         <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Wifi size={12} />
            GANTRY LIVE FEED :: APPLETON DOCK ENTRY
         </div>
      </div>

    </div>
  );
};

export default DigitalTwin;