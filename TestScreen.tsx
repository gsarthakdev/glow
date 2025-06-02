// Ignore this file, it's just for experiementation purposes
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function App() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#FFE5DC", "#D3C7FF", "#C4E8F6"]}
        style={styles.background}
      >
        <Text style={styles.greeting}>Hi, how’s{"\n"}Emma today?</Text>

        <TouchableOpacity style={styles.logButton}>
          <Feather name="edit-3" size={32} color="#884E2B" />
          <Text style={styles.logText}>Log Today</Text>
        </TouchableOpacity>

        <Text style={styles.footerMessage}>One step at a time 🌟</Text>

        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navItem}>
            <Feather name="file-text" size={24} color="#3E3E6B" />
            <Text style={styles.navText}>Past Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Feather name="settings" size={24} color="#3E3E6B" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Feather name="bar-chart-2" size={24} color="#3E3E6B" />
            <Text style={styles.navText}>Summary</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  background: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40
  },
  greeting: {
    fontSize: 28,
    color: '#3E3E6B',
    textAlign: 'center',
    fontWeight: '600'
  },
  logButton: {
    backgroundColor: '#FDE2CE',
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4
  },
  logText: {
    marginTop: 10,
    fontSize: 18,
    color: '#3E3E6B',
    fontWeight: '500'
  },
  footerMessage: {
    fontSize: 16,
    color: '#3E3E6B',
    marginBottom: 20
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  navItem: {
    alignItems: 'center'
  },
  navText: {
    fontSize: 14,
    color: '#3E3E6B',
    marginTop: 4
  }
});