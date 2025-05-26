import AsyncStorage from '@react-native-async-storage/async-storage';

export const seeAllDBData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stores = await AsyncStorage.multiGet(keys);
    const allData = Object.fromEntries(stores);
    console.log(allData); // This will log an object with all keys and their values
  } catch (error) {
    console.error('Error fetching AsyncStorage data:', error);
  }
};
