export enum DeviceStatus {
  ONLINE = 'ONLINE',
  WARNING = 'WARNING',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum VehicleClass {
  CLASS_1_MOTO = 'CLASS_1_MOTO',
  CLASS_2_CAR = 'CLASS_2_CAR',
  CLASS_4_HCV = 'CLASS_4_HCV', // Heavy Commercial Vehicle
  CLASS_7_LHCV = 'CLASS_7_LHCV', // Long Heavy Commercial Vehicle (Road Train)
}

export interface Device {
  id: string;
  name: string;
  type: 'CAMERA' | 'LASER' | 'SERVER' | 'SWITCH' | 'UPS' | 'CABINET';
  status: DeviceStatus;
  temperature: number; // Celsius
  uptime: number; // Hours
  lastPing: string;
  lane?: number; // Associated lane for visualization
  details?: Record<string, string | number>;
}

export interface Transaction {
  id: string;
  timestamp: string;
  plate: string;
  confidence: number;
  vehicleClass: VehicleClass;
  speed: number;
  lane: number;
  status: 'CAPTURED' | 'CLASSIFIED' | 'PRICED' | 'INVOICED' | 'PAID' | 'ENFORCEMENT';
  amount: number;
  images: {
    front: string;
    rear: string;
    overview: string;
  };
}

export interface Alarm {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  device: string;
  message: string;
  acknowledged: boolean;
}

export interface SimulationState {
  trafficVolume: number; // 0-100%
  failureRate: number; // 0-100%
  weather: 'SUNNY' | 'RAIN' | 'FOG' | 'NIGHT';
  timeOfDay: number; // 0-24 hour
}