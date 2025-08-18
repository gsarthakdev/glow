import AsyncStorage from '@react-native-async-storage/async-storage';

export const writeAsyncStorageToFile = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stores = await AsyncStorage.multiGet(keys);
    
    // Parse JSON strings in the data
    const parsedData = stores.reduce((acc: { [key: string]: any }, [key, value]) => {
      try {
        acc[key] = value ? JSON.parse(value) : value;
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    // Pretty print the data to console
    console.log('\n=== AsyncStorage Data ===\n');
    console.log(JSON.stringify(parsedData, null));
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
    const keys = await AsyncStorage.getAllKeys();
    return [...keys]; // Convert readonly array to mutable array
  } catch (error) {
    console.error('Error getting all keys:', error);
    return [];
  }
};

export const safeMultiGet = async (keys: string[]): Promise<[string, string | null][]> => {
  try {
    const items = await AsyncStorage.multiGet(keys);
    return [...items]; // Convert readonly array to mutable array
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

// Log custom options and deleted options data from child objects
export const logCustomOptionsData = async (): Promise<void> => {
  try {
    console.log('\n=== Custom Options & Deleted Options Data (Child-Based) ===\n');
    
    // Get all keys to find child objects
    const allKeys = await safeGetAllKeys();
    const childKeys = allKeys.filter(key => 
      key !== 'current_selected_child' && 
      key !== 'custom_options' && 
      key !== 'deleted_options' &&
      !key.includes('_') // Filter out other system keys
    );
    
    if (childKeys.length === 0) {
      console.log('👶 No child objects found');
      return;
    }
    
    // Get data for each child
    for (const childKey of childKeys) {
      const childDataJson = await safeGetItem(childKey);
      if (childDataJson) {
        const childData = safeParseJSON(childDataJson, {});
        
        console.log(`\n👶 Child: ${childKey}`);
        if (childData.name) {
          console.log(`   Name: ${childData.name}`);
        }
        
        // Show custom options
        if (childData.custom_options && Object.keys(childData.custom_options).length > 0) {
          console.log('   📝 Custom Options:');
          console.log('   ', JSON.stringify(childData.custom_options, null, 2));
        } else {
          console.log('   📝 Custom Options: None');
        }
        
        // Show deleted options
        if (childData.deleted_options && Object.keys(childData.deleted_options).length > 0) {
          console.log('   🗑️ Deleted Options:');
          console.log('   ', JSON.stringify(childData.deleted_options, null, 2));
        } else {
          console.log('   🗑️ Deleted Options: None');
        }
      }
    }
    
    console.log('\n=== End of Custom Options & Deleted Options Data ===\n');
    
  } catch (error) {
    console.error('Error logging custom options data:', error);
  }
};

// Log child's completed logs for the past 7 days
export const logChildCompletedLogs = async (): Promise<void> => {
  try {
    // Get the currently selected child
    const selectedChildJson = await safeGetItem('current_selected_child');
    if (!selectedChildJson) {
      console.log('No child currently selected');
      return;
    }

    const selectedChild = safeParseJSON(selectedChildJson);
    if (!selectedChild || !selectedChild.id) {
      console.log('Invalid selected child data');
      return;
    }

    // Get the child's data
    const childDataJson = await safeGetItem(selectedChild.id);
    if (!childDataJson) {
      console.log(`No data found for child: ${selectedChild.name || selectedChild.id}`);
      return;
    }

    const childData = safeParseJSON(childDataJson);
    if (!childData || !childData.completed_logs) {
      console.log(`No completed logs found for child: ${selectedChild.name || selectedChild.id}`);
      return;
    }

    // Calculate date range (past 7 days including today)
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6); // -6 to include today (7 days total)
    
    // Set time to start of day for accurate comparison
    sevenDaysAgo.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);

    // Filter logs from the past 7 days
    const allLogs: any[] = [];
    
    // Collect all logs from different flow types
    if (childData.completed_logs.flow_basic_1_positive) {
      allLogs.push(...childData.completed_logs.flow_basic_1_positive);
    }
    if (childData.completed_logs.flow_basic_1_negative) {
      allLogs.push(...childData.completed_logs.flow_basic_1_negative);
    }

    // Filter logs by date
    const recentLogs = allLogs.filter(log => {
      if (!log.timestamp) return false;
      const logDate = new Date(log.timestamp);
      return logDate >= sevenDaysAgo && logDate <= today;
    });

    // Create the output object with only completed_logs for the past 7 days
    const outputData = {
      child: {
        id: selectedChild.id,
        name: selectedChild.name || selectedChild.id
      },
      dateRange: {
        from: sevenDaysAgo.toISOString(),
        to: today.toISOString(),
        fromFormatted: sevenDaysAgo.toDateString(),
        toFormatted: today.toDateString()
      },
      completed_logs: {
        flow_basic_1_positive: recentLogs.filter(log => 
          log.responses?.whatDidTheyDo?.sentiment === 'positive'
        ),
        flow_basic_1_negative: recentLogs.filter(log => 
          log.responses?.whatDidTheyDo?.sentiment === 'negative'
        )
      },
      summary: {
        totalLogs: recentLogs.length,
        positiveLogs: recentLogs.filter(log => 
          log.responses?.whatDidTheyDo?.sentiment === 'positive'
        ).length,
        negativeLogs: recentLogs.filter(log => 
          log.responses?.whatDidTheyDo?.sentiment === 'negative'
        ).length
      }
    };

    // Output compact JSON to avoid console truncation
    console.log('\n=== Child Completed Logs (Past 7 Days) ===\n');
    
    // Log the complete data in compact JSON format (no pretty formatting)
    console.log('Complete Data:', JSON.stringify(outputData));
    
    console.log('\n=== End of Child Completed Logs ===\n');

  } catch (error) {
    console.error('Error logging child completed logs:', error);
  }
};

// Migrate custom options and deleted options from top-level keys to child-based storage
export const migrateCustomOptionsToChildStorage = async (): Promise<void> => {
  try {
    console.log('\n=== Starting Migration of Custom Options to Child Storage ===\n');
    
    // Get current selected child
    const selectedChildJson = await safeGetItem('current_selected_child');
    if (!selectedChildJson) {
      console.log('❌ No current selected child found. Cannot migrate data.');
      return;
    }
    
    const selectedChild = safeParseJSON(selectedChildJson, {});
    if (!selectedChild.id) {
      console.log('❌ Invalid selected child data. Cannot migrate data.');
      return;
    }
    
    console.log(`👶 Migrating data for child: ${selectedChild.id}`);
    
    // Get existing top-level custom options
    const existingCustomOptions = await safeGetItem('custom_options');
    const existingDeletedOptions = await safeGetItem('deleted_options');
    
    let hasDataToMigrate = false;
    
    // Get child's current data
    const childDataJson = await safeGetItem(selectedChild.id);
    if (!childDataJson) {
      console.log('❌ Child data not found. Cannot migrate data.');
      return;
    }
    
    const childData = safeParseJSON(childDataJson, {});
    let updatedChildData = { ...childData };
    
    // Migrate custom options
    if (existingCustomOptions) {
      const customOptions = safeParseJSON(existingCustomOptions, {});
      if (Object.keys(customOptions).length > 0) {
        console.log('📝 Migrating custom options...');
        updatedChildData.custom_options = customOptions;
        hasDataToMigrate = true;
        
        // Remove old top-level key
        await safeRemoveItem('custom_options');
        console.log('✅ Custom options migrated and old key removed');
      }
    }
    
    // Migrate deleted options
    if (existingDeletedOptions) {
      const deletedOptions = safeParseJSON(existingDeletedOptions, {});
      if (Object.keys(deletedOptions).length > 0) {
        console.log('🗑️ Migrating deleted options...');
        updatedChildData.deleted_options = deletedOptions;
        hasDataToMigrate = true;
        
        // Remove old top-level key
        await safeRemoveItem('deleted_options');
        console.log('✅ Deleted options migrated and old key removed');
      }
    }
    
    if (hasDataToMigrate) {
      // Save updated child data
      await safeSetItem(selectedChild.id, JSON.stringify(updatedChildData));
      console.log('✅ Child data updated with migrated options');
    } else {
      console.log('ℹ️ No data to migrate found');
    }
    
    console.log('\n=== Migration Complete ===\n');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
};
