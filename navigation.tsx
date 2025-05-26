import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChildrenCountScrn from "./onboarding/screens/ChildrenCountScrn";
import OneChildScrn from "./onboarding/screens/OneChildScrn";
import MultiChildScrn from "./onboarding/screens/MultiChildScrn";
import HomeScrn from "./main/HomeScrn";

const Stack = createNativeStackNavigator();

export function OnboardingStack() {
    return (
      <NavigationContainer>
        <Stack.Navigator
          // screenOptions={SignedInScreenOptions}
          screenOptions={{ headerShown: false }}
          initialRouteName="ChildrenCountScrn"
        >
            <Stack.Screen name="ChildrenCountScrn" component={ChildrenCountScrn} />
            <Stack.Screen name="OneChildScrn" component={OneChildScrn} />
            <Stack.Screen name="MultiChildScrn" component={MultiChildScrn} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  export function MainStack() {
    return (
      <NavigationContainer>
        <Stack.Navigator
          // screenOptions={SignedInScreenOptions}
          screenOptions={{ headerShown: false }}
          initialRouteName="HomeScrn"
        >
            <Stack.Screen name="HomeScrn" component={HomeScrn} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }