import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Platform, Modal, FlatList } from 'react-native'
import { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SelectedChild {
  id: string;
  child_uuid: string;
  child_name: string;
}

export default function HomeScrn() {
  const [selectedChild, setSelectedChild] = useState<SelectedChild | null>(null)
  const [streakCount, setStreakCount] = useState(2)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [children, setChildren] = useState([])

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const childKeys = keys.filter(key => key !== 'onboarding_completed' && key !== 'current_selected_child')
      const childData = await AsyncStorage.multiGet(childKeys)
      
      // Get child names and store full data
      const childDetails = childData.map(([key, value]) => {
        const data = JSON.parse(value)
        return {
          id: key,
          child_uuid: data.child_uuid,
          child_name: data.child_name
        }
      })
      
      setChildren(childDetails)

      // Handle selected child
      const currentSelectedChild = await AsyncStorage.getItem('current_selected_child')
      if (currentSelectedChild) {
        setSelectedChild(JSON.parse(currentSelectedChild))
      } else if (childDetails.length > 0) {
        // Set first child as default if no selection exists
        setSelectedChild(childDetails[0])
        await AsyncStorage.setItem('current_selected_child', JSON.stringify(childDetails[0]))
      }
    } catch (error) {
      console.error('Error loading children:', error)
    }
  }

  const handleChildSelect = async (child: SelectedChild) => {
    try {
      await AsyncStorage.setItem('current_selected_child', JSON.stringify(child))
      setSelectedChild(child)
      setIsModalVisible(false)
    } catch (error) {
      console.error('Error saving selected child:', error)
    }
  }

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
        <Text style={styles.greeting}>{greeting()} 👋</Text>
        <TouchableOpacity
          style={styles.childSwitcher}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.childSwitcherText}>Tracking: {selectedChild?.child_name}</Text>
          <Ionicons name="chevron-down" size={20} color="#5B9AA0" />
        </TouchableOpacity>
      </View>

      {/* Child Selection Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Child</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={children}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.childItem}
                  onPress={() => handleChildSelect(item)}
                >
                  <Text style={styles.childItemText}>{item.child_name}</Text>
                  {selectedChild?.id === item.id && (
                    <Ionicons name="checkmark" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      
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
          {selectedChild?.child_name}'s seen more emotional outbursts after bedtime ⏰
        </Text>
      </View>

      {/* Core Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="pencil" size={48} color="#007AFF" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.actionText}>New Log</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="paper-plane" size={48} color="#007AFF" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.actionText}>Send Summary</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>


    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    // backgroundColor: '#EAE4CF',
  },
  header: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FAF9F6',
    // flexDirection: 'row',
    // alignItems: 'center',
    // justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
    // Optional: Add bottom border for extra separation
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  childSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F3F4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#5B9AA0',
    ...Platform.select({
      ios: {
        shadowColor: '#5B9AA0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      }
    })
  },
  childSwitcherText: {
    fontSize: 17,
    color: '#5B9AA0',
    marginRight: 8,
    fontWeight: '600',
  },
  actionsGrid: {
    alignItems: 'center',
    padding: 16,
  },
  actionCard: {
    backgroundColor: "white",
    width: "90%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }
    })
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    flex: 1,
    marginLeft: 30,
    marginRight: -15,
  },
  textContainer: {
    flex: 3,
  },
  actionText: {
    color: "black",
    fontSize: 20,
    // fontFamily: "semibold",
    fontWeight: '600',

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  childItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  childItemText: {
    fontSize: 17,
  },
})