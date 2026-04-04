import { create } from 'zustand';

interface FuelState {
  // --- Transit / Navigation State ---
  activeOrder: any | null; 
  setActiveOrder: (order: any | null) => void;

  // --- Vehicle Centric State ---
  activeVehicle: string | null;
  setActiveVehicle: (vehicleReg: string | null) => void;

  // --- Dispensing / Telemetry State ---
  volume: string;
  amount: string;
  price: string;
  isDispensing: boolean;
  
  // --- Actions ---
  setTelemetry: (volume: string, amount: string, price: string) => void;
  setIsDispensing: (status: boolean) => void;
  reset: () => void;
}

export const useFuelStore = create<FuelState>((set) => ({
  // Initial Transit State
  activeOrder: null,
  setActiveOrder: (order) => set({ activeOrder: order }),

  // Initial Vehicle State
  activeVehicle: null,
  setActiveVehicle: (vehicleReg) => set({ activeVehicle: vehicleReg }),

  // Initial Dispensing State
  volume: "0.00",
  amount: "0.00",
  price: "0.00",
  isDispensing: false,

  setTelemetry: (volume, amount, price) => set({ volume, amount, price }),
  setIsDispensing: (isDispensing) => set({ isDispensing }),
  
  reset: () => set({ 
    volume: "0.00", 
    amount: "0.00", 
    price: "0.00", 
    isDispensing: false,
    activeOrder: null,
    activeVehicle: null
  }),
}));