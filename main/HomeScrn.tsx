import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Platform, Button, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { IS_DEBUGGING } from '../flag';

interface SelectedChild {
  id: string;
  child_uuid: string;
  child_name: string;
}

export default function HomeScrn({navigation}: {navigation: any}) {
  const [selectedChild, setSelectedChild] = useState<SelectedChild | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [children, setChildren] = useState<SelectedChild[]>([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadChildren();
    }
  }, [isFocused]);

  const loadChildren = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const childKeys = keys.filter(key => key !== 'onboarding_completed' && key !== 'current_selected_child')
      const childData = await AsyncStorage.multiGet(childKeys)
      
      const childDetails = childData.map(([key, value]) => {
        if (!value) return null;
        const data = JSON.parse(value);
        if (data.is_deleted === true) return null;
        return {
          id: key,
          child_uuid: data.child_uuid,
          child_name: data.child_name_capitalized
        };
      }).filter(Boolean) as SelectedChild[];
      
      setChildren(childDetails)

      const currentSelectedChild = await AsyncStorage.getItem('current_selected_child')
      if (currentSelectedChild) {
        const parsedSelected = JSON.parse(currentSelectedChild);
        // Check if the selected child is still valid (not deleted)
        const stillExists = childDetails.find(child => child.id === parsedSelected.id);
        if (stillExists) {
          // If the data has changed (e.g., name edited), update selectedChild and AsyncStorage
          if (
            parsedSelected.child_name !== stillExists.child_name ||
            parsedSelected.child_uuid !== stillExists.child_uuid
          ) {
            setSelectedChild(stillExists);
            await AsyncStorage.setItem('current_selected_child', JSON.stringify(stillExists));
          } else {
            setSelectedChild(parsedSelected);
          }
        } else if (childDetails.length > 0) {
          setSelectedChild(childDetails[0]);
          await AsyncStorage.setItem('current_selected_child', JSON.stringify(childDetails[0]));
        } else {
          setSelectedChild(null);
          await AsyncStorage.removeItem('current_selected_child');
        }
      } else if (childDetails.length > 0) {
        setSelectedChild(childDetails[0])
        await AsyncStorage.setItem('current_selected_child', JSON.stringify(childDetails[0]))
      } else {
        setSelectedChild(null);
        await AsyncStorage.removeItem('current_selected_child');
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
  };

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <LinearGradient
      colors={["#FFE5DC", "#D3C7FF", "#C4E8F6"]}
      style={styles.background}
    >
      <View style={styles.header}>
        {/* <Text style={styles.greeting}>Welcome back!</Text> */}
        <Text style={styles.greeting}>{greeting()} 👋</Text>
        <TouchableOpacity
          style={styles.childSwitcher}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.childSwitcherText}>
            Tracking: {selectedChild?.child_name || 'Select Child'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#5B9AA0" />
        </TouchableOpacity>
        {/* Development/Staging button */}
        {IS_DEBUGGING && (
        <TouchableOpacity
          style={styles.devButton}
          onPress={() => navigation.push("DummyLogGenerator")}
        >
          <Text style={styles.devButtonText}>🧪 Dev Tools</Text>
        </TouchableOpacity>
        )}
      </View>
    {/* <Button title="add data" onPress={() => {}}/> */}
      <TouchableOpacity
        onPress={() => {
          if (children.length === 0) {
            Alert.alert(
              "No children added",
              "It looks like no children are added. Please add a child first.",
              [
                {
                  text: "Add child",
                  onPress: () => navigation.navigate("Settings"),
                },
                {
                  text: "Dismiss",
                  style: "cancel",
                },
              ]
            );
            return;
          }
          navigation.push("FlowBasic1BaseScrn");
        }}
        style={styles.logButton}
      >
        {/* <Feather name="edit-3" size={42} color="#EAA987" /> */}
        <SimpleLineIcons name="pencil" size={50} color="#EAA987" />
        <Text style={styles.logText}>Log Today</Text>
      </TouchableOpacity>

      <Text style={styles.footerMessage}>One step at a time 🌟</Text>

      {/* Child switcher Modal */}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40
  },
  header: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
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
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: '#3E3E6B',
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
    }),
  },
  childSwitcherText: {
    fontSize: 17,
    color: '#5B9AA0',
    marginRight: 8,
    fontWeight: '600',
  },
  devButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#5B9AA0',
  },
  devButtonText: {
    fontSize: 12,
    color: '#5B9AA0',
    fontWeight: '600',
  },
  logButton: {
    backgroundColor: '#FFEBDF',
    width: 180,
    height: 180,
    borderRadius: 90,
    // marginBottom: 80,
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
    fontSize: 23,
    color: '#3E3E6B',
    fontWeight: '500'
  },
  footerMessage: {
    fontSize: 22,
    color: '#3E3E6B',
    marginBottom: 155,
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
});
