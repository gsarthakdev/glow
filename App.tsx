import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import ChildrenCountScrn from './onboarding/screens/ChildrenCountScrn';
import OneChildScrn from './onboarding/screens/OneChildScrn';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MultiChildScrn from './onboarding/screens/MultiChildScrn';
import BottomTabsStack, { MainStack, OnboardingStack } from './navigation';
import HomeScrn from './main/HomeScrn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { seeAllDBData } from './seeData';
import { useAsyncStorage } from './hooks/useAsyncStorage';
import TestScreen from './TestScreen';
import { NavigationContainer } from '@react-navigation/native';
import { writeAsyncStorageToFile } from './utils/asyncStorageUtils';

export default function App() {
  const onboardingStatus = useAsyncStorage('onboarding_completed');
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const clearAsyncStorage = async () => {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage cleared successfully');
    } catch (error) {
      console.error('Failed to clear AsyncStorage:', error);
    }
  };
  
    const doIt = async () => {
    await writeAsyncStorageToFile();
  }
  
  // clearAsyncStorage();
  useEffect(() => {
    setIsOnboardingCompleted(onboardingStatus === 'true');
    // doIt();
  }, [onboardingStatus]);

  if (isOnboardingCompleted === null) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // return isOnboardingCompleted ? <MainStack /> : <OnboardingStack />;
  // return isOnboardingCompleted ? <OnboardingStack /> : <BottomTabsStack />;
    return (
    <NavigationContainer>
      {isOnboardingCompleted ? <MainStack /> : <OnboardingStack />}
    </NavigationContainer>
  );
  
  // return <TestScreen/>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
