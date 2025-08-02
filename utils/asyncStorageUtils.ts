import AsyncStorage from '@react-native-async-storage/async-storage';

export const writeAsyncStorageToFile = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stores = await AsyncStorage.multiGet(keys);
    
    // Parse JSON strings in the data
    const parsedData = stores.reduce((acc, [key, value]) => {
      try {
        acc[key] = value ? JSON.parse(value) : value;
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    // Pretty print the data to console
    console.log('\n=== AsyncStorage Data ===\n');
    console.log(JSON.stringify(parsedData, null, 2));
    console.log('\n=== End of AsyncStorage Data ===\n');
  } catch (error) {
    console.error('Error fetching AsyncStorage data:', error);
  }
};

// Safe AsyncStorage utilities to prevent crashes
export const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`Error getting item ${key}:`, error);
    return null;
  }
};

export const safeSetItem = async (key: string, value: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
    return false;
  }
};

export const safeRemoveItem = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item ${key}:`, error);
    return false;
  }
};

export const safeGetAllKeys = async (): Promise<string[]> => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('Error getting all keys:', error);
    return [];
  }
};

export const safeMultiGet = async (keys: string[]): Promise<[string, string | null][]> => {
  try {
    return await AsyncStorage.multiGet(keys);
  } catch (error) {
    console.error('Error getting multiple items:', error);
    return [];
  }
};

export const safeParseJSON = (value: string | null, fallback: any = null): any => {
  if (!value) return fallback;
  
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    console.error('Raw value (first 200 chars):', value.substring(0, 200));
    return fallback;
  }
};

// Clean up corrupted AsyncStorage data
export const cleanupCorruptedData = async (): Promise<void> => {
  try {
    const keys = await safeGetAllKeys();
    const items = await safeMultiGet(keys);
    
    for (const [key, value] of items) {
      if (value) {
        try {
          JSON.parse(value);
        } catch (parseError) {
          console.error(`Found corrupted data for key: ${key}`);
          await safeRemoveItem(key);
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};
