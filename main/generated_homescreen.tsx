import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Platform } from 'react-native'
import { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'

export default function HomeScrn() {
  const [selectedChild, setSelectedChild] = useState('Ethan')
  const [streakCount, setStreakCount] = useState(2)
  
  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting()}, Aisha 👋</Text>
        <TouchableOpacity style={styles.childSwitcher}>
          <Text style={styles.childSwitcherText}>Tracking: {selectedChild}</Text>
          <Ionicons name="chevron-down" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Core Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="pencil-circle" size={36} color="#007AFF" />
          <Text style={styles.actionText}>New Log</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="calendar" size={36} color="#007AFF" />
          <Text style={styles.actionText}>Past Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="paper-plane" size={36} color="#007AFF" />
          <Text style={styles.actionText}>Send Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="settings" size={36} color="#007AFF" />
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Gamification Bar */}
      <View style={styles.streakCard}>
        <Text style={styles.streakText}>You've logged {streakCount} days in a row! 🌟</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '40%' }]} />
        </View>
        <Text style={styles.streakAction}>Keep it going →</Text>
      </View>

      {/* Weekly Insight */}
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>This Week's Insight</Text>
        <Text style={styles.insightText}>
          You've seen more emotional outbursts after bedtime ⏰
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  childSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 16,
  },
  childSwitcherText: {
    fontSize: 17,
    color: '#007AFF',
    marginRight: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  actionCard: {
    width: '45%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }
    })
  },
  actionText: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '500',
  },
  streakCard: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }
    })
  },
  streakText: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  streakAction: {
    marginTop: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  insightCard: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }
    })
  },
  insightTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 17,
    color: '#3C3C43',
  },
})