import { SafeAreaView, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import OptionButton from '../components/OptionButton'
import Header from '../components/Header'

export default function ChildrenCountScrn({navigation}: {navigation: any}) {
  return (
    <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: "#EAE4CF" }}>
      <Header hideBackButton={true} />
      {/* <Text>How many children are receiving therapy?</Text> */}
            <View style={{ flex: 1, marginTop: 30}}>

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

                <View style={{ alignItems: "center", justifyContent: "center", marginTop: 100  }}>
                  <OptionButton text="Just one" onPress={() => navigation.push("OneChildScrn")}/>
                  <OptionButton text="More than one" onPress={() => navigation.push("MultiChildScrn")}/>
                </View>

            </View>
          {/* </View> */}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({})