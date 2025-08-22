import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
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

import { NavigationContainer } from '@react-navigation/native';
import { logChildCompletedLogs, logCustomOptionsData, writeAsyncStorageToFile } from './utils/asyncStorageUtils';
import * as Updates from "expo-updates";
import { IS_DEBUGGING } from './flag';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { LogBox } from 'react-native';


// LogBox.ignoreAllLogs();    
// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
    // Log error to your analytics service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong.</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const onboardingStatus = useAsyncStorage('onboarding_completed');

  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const [isUpdateChecking, setIsUpdateChecking] = useState(false);

  async function onFetchUpdateAsync() {
    if (isUpdateChecking) return; // Prevent multiple simultaneous update checks
    
    setIsUpdateChecking(true);
    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('Update available, fetching...');
        await Updates.fetchUpdateAsync();
        console.log('Update fetched, reloading...');
        await Updates.reloadAsync();
      } else {
        console.log('No update available');
      }
    } catch (error) {
      console.error(`Error fetching latest app update: ${error}`);
      // Don't show alert to user for update errors, just log them
    } finally {
      setIsUpdateChecking(false);
    }
  }

  const clearAsyncStorage = async () => {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage cleared successfully');
    } catch (error) {
      console.error('Failed to clear AsyncStorage:', error);
    }
  };

  const doIt = async () => {
    try {
      await writeAsyncStorageToFile();
      // await logChildCompletedLogs();
      // await logCustomOptionsData();
    } catch (error) {
      console.error('Error writing AsyncStorage to file:', error);
    }
  }

  async function shouldUpdate() {
    try {
      const getCurrentChildName = await AsyncStorage.getItem('current_selected_child');
      const currentChildExp = JSON.parse(getCurrentChildName);
      return currentChildExp.child_name === "Password123"
    } catch (error) {
      console.error('Error getting current child name:', error);
      return false;
    }
  }


  // clearAsyncStorage();
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsOnboardingCompleted(onboardingStatus === 'true');
       
        const shouldAppUpdate = await shouldUpdate();
        console.log("shouldAppUpdate", shouldAppUpdate);
        // Only check for updates if not in development
        if (!__DEV__) {
          if (shouldAppUpdate) {
            await onFetchUpdateAsync();
          }
        }
        
        // Only run debug functions in development
        if (IS_DEBUGGING) {
          await doIt();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        // Set a default state to prevent infinite loading
        setIsOnboardingCompleted(false);
      }
    };

    initializeApp();
  }, [onboardingStatus]);

  if (isOnboardingCompleted === null) {
    return (
      <LinearGradient
        colors={["#FFE5DC", "#D3C7FF", "#C4E8F6"]}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 300,
        }}
      >
        <ActivityIndicator size="large" color="#0000ff" />
      </LinearGradient>
    );
  }
  
  return (
    <ErrorBoundary>
      <NavigationContainer>
        {isOnboardingCompleted ? <MainStack /> : <OnboardingStack />}
      </NavigationContainer>
    </ErrorBoundary>
  );


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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
