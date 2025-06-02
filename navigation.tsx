import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChildrenCountScrn from "./onboarding/screens/ChildrenCountScrn";
import OneChildScrn from "./onboarding/screens/OneChildScrn";
import MultiChildScrn from "./onboarding/screens/MultiChildScrn";
import HomeScrn from "./main/HomeScrn";

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { View, Text } from "react-native";
import FlowBasic1BaseScrn from "./main/FlowBasic1BaseScrn";
import CelebrationScreen from './screens/CelebrationScreen';

const Stack = createNativeStackNavigator();

export function OnboardingStack() {
    return (
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName="ChildrenCountScrn"
        >
            <Stack.Screen name="ChildrenCountScrn" component={ChildrenCountScrn} />
            <Stack.Screen name="OneChildScrn" component={OneChildScrn} />
            <Stack.Screen name="MultiChildScrn" component={MultiChildScrn} />
        </Stack.Navigator>
    );
}

export function MainStack() {
    return (
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName="BottomTabsStack"
        >
            <Stack.Screen name="BottomTabsStack" component={BottomTabsStack} />
            <Stack.Screen name="FlowBasic1BaseScrn" component={FlowBasic1BaseScrn} />
            <Stack.Screen name="CelebrationScreen" component={CelebrationScreen} />
        </Stack.Navigator>
    );
}


const Tab = createBottomTabNavigator();

// Placeholder screens
const PastLogsScreen = () => <View style={{flex: 1}}><Text>Past Logs</Text></View>;
const SettingsScreen = () => <View style={{flex: 1}}><Text>Settings</Text></View>;
const SummaryScreen = () => <View style={{flex: 1}}><Text>Summary</Text></View>;

export default function BottomTabsStack() {
  return (
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
        component={HomeScrn}
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
  );
}