import { Device, DeviceStatus, VehicleClass } from './types';

export const SYSTEM_NAME = "Smart Tunnel Tolling Platform (STTP)";
export const API_VERSION = "v3.0.0-production";

export const MOCK_GANTRY_DEVICES: Device[] = [
  // Lane 1
  { id: 'dev-cam-L1-F', name: 'L1 ANPR Front', type: 'CAMERA', status: DeviceStatus.ONLINE, temperature: 42, uptime: 1240, lastPing: '2ms', lane: 1 },
  { id: 'dev-las-L1', name: 'L1 Laser Profiler', type: 'LASER', status: DeviceStatus.ONLINE, temperature: 38, uptime: 1240, lastPing: '5ms', lane: 1 },
  // Lane 2
  { id: 'dev-cam-L2-F', name: 'L2 ANPR Front', type: 'CAMERA', status: DeviceStatus.ONLINE, temperature: 43, uptime: 1238, lastPing: '3ms', lane: 2 },
  { id: 'dev-las-L2', name: 'L2 Laser Profiler', type: 'LASER', status: DeviceStatus.ONLINE, temperature: 39, uptime: 1238, lastPing: '5ms', lane: 2 },
  // Lane 3
  { id: 'dev-cam-L3-F', name: 'L3 ANPR Front', type: 'CAMERA', status: DeviceStatus.ONLINE, temperature: 41, uptime: 1100, lastPing: '4ms', lane: 3 },
  { id: 'dev-cam-L3-R', name: 'L3 ANPR Rear', type: 'CAMERA', status: DeviceStatus.WARNING, temperature: 58, uptime: 1100, lastPing: '120ms', lane: 3 },
  
  // Infrastructure
  { id: 'dev-cab-01', name: 'Roadside Cabinet A (Interface)', type: 'CABINET', status: DeviceStatus.ONLINE, temperature: 24, uptime: 5000, lastPing: '1ms' },
  { id: 'dev-srv-01', name: 'Edge Compute Node 1', type: 'SERVER', status: DeviceStatus.ONLINE, temperature: 45, uptime: 5000, lastPing: '0.5ms' },
  { id: 'dev-ups-01', name: 'Main UPS 15kVA', type: 'UPS', status: DeviceStatus.ONLINE, temperature: 30, uptime: 8760, lastPing: '10ms' },
];

export const TOLL_RATES = {
  [VehicleClass.CLASS_1_MOTO]: 5.50,
  [VehicleClass.CLASS_2_CAR]: 9.80,
  [VehicleClass.CLASS_4_HCV]: 18.50,
  [VehicleClass.CLASS_7_LHCV]: 28.00,
};

export const TRAFFIC_DISTRIBUTION = [
  { type: VehicleClass.CLASS_2_CAR, weight: 60 },
  { type: VehicleClass.CLASS_4_HCV, weight: 25 },
  { type: VehicleClass.CLASS_7_LHCV, weight: 10 },
  { type: VehicleClass.CLASS_1_MOTO, weight: 5 },
];