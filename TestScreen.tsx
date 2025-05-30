import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import HomeScreen from './screens/HomeScreen';

const Tab = createBottomTabNavigator();

// Placeholder screens
const PastLogsScreen = () => <View style={{flex: 1}}><Text>Past Logs</Text></View>;
const SettingsScreen = () => <View style={{flex: 1}}><Text>Settings</Text></View>;
const SummaryScreen = () => <View style={{flex: 1}}><Text>Summary</Text></View>;

export default function TestScreen() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarBackground: () => (
            <BlurView 
              tint="default"
              intensity={95}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '100%',
                borderRadius: 25,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}
            />
          ),
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderRadius: 25,
            paddingHorizontal: 10,
            height: 75,
            marginHorizontal: 20,
            marginBottom: 50,
            borderTopWidth: 0,
            elevation: 0,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            bottom: 0,
            justifyContent: 'center', // Center items vertically
          },
          tabBarItemStyle: {
            // margin: 0,
            padding: 10,
          },
          tabBarLabelStyle: {
            // paddingBottom: 20,
          },
          tabBarActiveTintColor: '#000',
          tabBarInactiveTintColor: 'rgba(0, 0, 0, 0.5)',
          headerShown: false
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Feather name="home" size={24} color={color} />
            )
          }}
        />
        <Tab.Screen 
          name="Past Logs" 
          component={PastLogsScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Feather name="file-text" size={24} color={color} />
            )
          }}
        />
        {/* <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Feather name="settings" size={24} color={color} />
            )
          }}
        /> */}
        <Tab.Screen 
          name="Summary" 
          component={SummaryScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Feather name="bar-chart-2" size={24} color={color} />
            )
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}