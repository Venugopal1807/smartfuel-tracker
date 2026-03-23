import { useState, useRef, useCallback } from 'react';

/**
 * Simulates a continuous stream of data from a BLE fuel sensor.
 */
export const useFuelSensor = () => {
  const [dispensing, setDispensing] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  
  const volumeRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startDispensing = useCallback(() => {
    setDispensing(true);
    setCurrentVolume(0);
    volumeRef.current = 0;
    
    intervalRef.current = setInterval(() => {
      const increment = Math.random() * 1.5 + 0.5;
      volumeRef.current += increment;
      setCurrentVolume(Number(volumeRef.current.toFixed(2)));
    }, 400);
  }, []);

  const stopDispensing = useCallback((): number => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    const finalVolume = Number(volumeRef.current.toFixed(2));
    setDispensing(false);
    return finalVolume;
  }, []);

  const resetSensor = useCallback(() => {
    setDispensing(false);
    setCurrentVolume(0);
    volumeRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return { dispensing, currentVolume, startDispensing, stopDispensing, resetSensor };
};