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
