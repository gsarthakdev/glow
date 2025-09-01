import { Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect } from 'react'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import OptionButton from '../components/OptionButton'
import Header from '../components/Header'

export default function ChildrenCountScrn({ navigation }: { navigation: any }) {
  // Entrance animation shared values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    // Fade and scale in when screen mounts
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withTiming(1, { duration: 600 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const PRIVACY_POLICY_URL = "https://docs.google.com/document/d/1xth4Opaqo07Z-7QT4OeBpIXzefdVxJR6dikuO-BzMFk/edit?usp=sharing"
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EAE4CF" }}>
      {/* Header remains static */}
      <Header hideBackButton={false} subtext="Let's set up your little star ⭐️" forWelcomeScrn={true} />

      {/* Animated main content */}
      <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
        {/* <Text>How many children are receiving therapy?</Text> */}
        <View style={{ flex: 1, marginTop: 30 }}>

          <View style={{ marginLeft: 20, }}>
            <Text
              style={{
                color: "#000000",
                fontWeight: "bold",
                fontSize: 30,

              }}
            >
              How many children are receiving therapy?
            </Text>
            <Text
              style={{
                color: "grey",
                // fontFamily: "regular",
                fontSize: 15,
                // marginLeft: 50,
                marginTop: 15
              }}
            >
              the number of children you want to log data for
            </Text>
          </View>

          <View style={{ alignItems: "center", justifyContent: "center", marginTop: 100 }}>
            <OptionButton text="Just one" onPress={() => navigation.push("OneChildScrn")} />
            <OptionButton text="More than one" onPress={() => navigation.push("MultiChildScrn")} />
          </View>

        </View>
      </Animated.View>
      <TouchableOpacity style={{marginBottom: 20, alignSelf: "center"}} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
        <Text style={{color:"blue"}}>See privacy policy</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({})