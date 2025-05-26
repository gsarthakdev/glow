import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAsyncStorage(key: string, initialValue: any = null) {
  const [storedValue, setStoredValue] = useState(initialValue);

  useEffect(() => {
    const loadValue = async () => {
      try {
        const value = await AsyncStorage.getItem(key);
        setStoredValue(value);
      } catch (error) {
        console.error('Error loading value:', error);
      }
    };

    loadValue();
    
    // Check every 500ms for changes
    const interval = setInterval(loadValue, 500);
    
    return () => clearInterval(interval);
  }, [key]);

  return storedValue;
}
