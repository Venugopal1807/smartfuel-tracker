import { useState, useRef, useCallback } from 'react';

/**
 * Simulates a continuous stream of data from a BLE fuel sensor.
 */
export const useFuelSensor = () => {
  const [dispensing, setDispensing] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startDispensing = useCallback(() => {
    setDispensing(true);
    setCurrentVolume(0);
    
    // Simulate fuel flowing: add a random amount between 0.5L and 3.0L every 500ms
    intervalRef.current = setInterval(() => {
      setCurrentVolume((prev) => prev + (Math.random() * 2.5 + 0.5));
    }, 500);
  }, []);

  const stopDispensing = useCallback((): number => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDispensing(false);
    return currentVolume;
  }, [currentVolume]);

  return { dispensing, currentVolume, startDispensing, stopDispensing };
};
