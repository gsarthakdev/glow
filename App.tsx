import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import ChildrenCountScrn from './onboarding/screens/ChildrenCountScrn';
import OneChildScrn from './onboarding/screens/OneChildScrn';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MultiChildScrn from './onboarding/screens/MultiChildScrn';
import { MainStack, OnboardingStack } from './navigation';
import HomeScrn from './main/HomeScrn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { seeAllDBData } from './seeData';
import { useAsyncStorage } from './hooks/useAsyncStorage';

export default function App() {
  const onboardingStatus = useAsyncStorage('onboarding_completed');
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    setIsOnboardingCompleted(onboardingStatus === 'true');
  }, [onboardingStatus]);

  if (isOnboardingCompleted === null) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return isOnboardingCompleted ? <MainStack /> : <OnboardingStack />;
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
