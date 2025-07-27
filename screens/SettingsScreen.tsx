import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput, Alert, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform as RNPlatform, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { flow_basic_1 } from '../flows/flow_basic_1';
import notificationService from '../utils/notificationService';

interface Child {
  id: string;
  child_uuid: string;
  child_name: string;
  pronouns: string;
}

export default function SettingsScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildPronouns, setNewChildPronouns] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomPronoun, setShowCustomPronoun] = useState(false);
  const [customPronoun, setCustomPronoun] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editChild, setEditChild] = useState<Child | null>(null);
  const [editName, setEditName] = useState('');
  const [editPronoun, setEditPronoun] = useState('');
  const [editShowCustomPronoun, setEditShowCustomPronoun] = useState(false);
  const [editCustomPronoun, setEditCustomPronoun] = useState('');
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);

  useEffect(() => {
    loadChildren();
    loadNotificationSettings();
  }, []);

  const loadChildren = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const childKeys = keys.filter(key => 
        key !== 'onboarding_completed' && 
        key !== 'current_selected_child' && 
        key !== 'daily_reminder_enabled'
      );
      const childData = await AsyncStorage.multiGet(childKeys);
      const childDetails = childData.map(([key, value]) => {
        if (!value) return null;
        const data = JSON.parse(value);
        if (data.is_deleted) return null;
        return {
          id: key,
          child_uuid: data.child_uuid,
          child_name: data.child_name_capitalized,
          pronouns: data.pronouns || '',
        };
      }).filter(Boolean) as Child[];
      setChildren(childDetails);
    } catch (error) {
      console.error('Error loading children:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const enabled = await notificationService.isReminderEnabled();
      setDailyReminderEnabled(enabled);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      console.log('Notification toggle called with value:', value);
      
      if (value) {
        // Enable notifications
        console.log('Requesting notification permissions...');
        const permissionGranted = await notificationService.requestPermissionsWithExplanation();
        console.log('Permission granted:', permissionGranted);
        
        if (!permissionGranted) {
          Alert.alert(
            'Permission Required',
            'To receive daily reminders, please enable notifications in your device settings.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        console.log('Scheduling daily reminder...');
        await notificationService.scheduleDailyReminder();
        console.log('Daily reminder scheduled successfully');
        
        // Check notification status after scheduling
        await notificationService.checkNotificationStatus();
        
        // Check again after 3 seconds to see if notifications persist
        setTimeout(async () => {
          console.log('=== 3-second follow-up check ===');
          await notificationService.checkNotificationStatus();
        }, 3000);
        
        // Check again after 10 seconds
        setTimeout(async () => {
          console.log('=== 10-second follow-up check ===');
          await notificationService.checkNotificationStatus();
        }, 10000);
        
        setDailyReminderEnabled(true);
        Alert.alert(
          'Reminders Enabled',
          'You will receive daily reminders at 8:30 PM to log your child\'s behavior.',
          [{ text: 'Great!' }]
        );
      } else {
        // Disable notifications
        console.log('Cancelling daily reminders...');
        await notificationService.cancelDailyReminder();
        console.log('Daily reminders cancelled');
        setDailyReminderEnabled(false);
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  const handleAddChild = async () => {
    const pronounToSave = newChildPronouns === 'Other' ? customPronoun.trim() : newChildPronouns.trim();
    if (!newChildName.trim() || !pronounToSave) {
      Alert.alert('Please enter both name and pronouns.');
      return;
    }
    setLoading(true);
    try {
      const timestamp = new Date().toISOString();
      const uuid = uuidv4();
      const key = `${newChildName.trim().toLowerCase()}_${uuid}`;
      const value = {
        logs: [],
        flow_basic_1: flow_basic_1,
        completed_logs: {
          flow_basic_1_positive: [],
          flow_basic_1_negative: []
        },
        is_deleted: false,
        child_name: newChildName.trim().toLowerCase(),
        child_name_capitalized: newChildName.trim().charAt(0).toUpperCase() + newChildName.trim().slice(1).toLowerCase(),
        pronouns: pronounToSave,
        created_at: timestamp,
        updated_at: timestamp,
        child_uuid: uuid,
      };
      await AsyncStorage.setItem(key, JSON.stringify(value));
      
      // Request notification permissions if this is the first child (non-blocking)
      if (children.length === 0) {
        setTimeout(async () => {
          try {
            const permissionGranted = await notificationService.requestPermissionsWithExplanation();
            if (permissionGranted) {
              // Enable daily reminders by default
              await notificationService.scheduleDailyReminder();
              setDailyReminderEnabled(true);
              Alert.alert(
                'Notifications Enabled',
                'Great! You\'ll receive daily reminders at 8:30 PM to log your child\'s behavior.',
                [{ text: 'Perfect!' }]
              );
            }
          } catch (notificationError) {
            console.error('Failed to setup notifications:', notificationError);
          }
        }, 500); // Small delay to ensure child is saved first
      }
      
      setIsAddModalVisible(false);
      setNewChildName('');
      setNewChildPronouns('');
      setCustomPronoun('');
      setShowCustomPronoun(false);
      loadChildren();
    } catch (error) {
      Alert.alert('Error', 'Could not add child.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveChild = (child: Child) => {
    Alert.alert(
      'Remove Child',
      `Are you sure you want to remove ${child.child_name}? This means that the data will be deleted for this child!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => softDeleteChild(child) },
      ]
    );
  };

  const softDeleteChild = async (child: Child) => {
    try {
      const value = await AsyncStorage.getItem(child.id);
      if (!value) return;
      const data = JSON.parse(value);
      data.is_deleted = true;
      await AsyncStorage.setItem(child.id, JSON.stringify(data));
      loadChildren();
    } catch (error) {
      Alert.alert('Error', 'Could not remove child.');
    }
  };

  // const pronounOptions = ['He/Him', 'She/Her', 'They/Them', 'Other'];
  const pronounOptions = ['He/Him', 'She/Her', 'They/Them'];

  return (
    <LinearGradient
      colors={["#FFE5DC", "#D3C7FF", "#C4E8F6"]}
      style={styles.background}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your children and app preferences.</Text>
      </View>

      {/* Notification Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Reminders</Text>
        <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Daily Log Reminders</Text>
          <Text style={styles.settingDescription}>
            Receive a daily reminder at 8:30 PM to log your child's behavior
          </Text>
        </View>
        <Switch
          value={dailyReminderEnabled}
          onValueChange={handleNotificationToggle}
          trackColor={{ false: '#E0E0E0', true: '#5B9AA0' }}
          thumbColor={dailyReminderEnabled ? '#fff' : '#f4f3f4'}
        />
      </View>
      </View>

      {/* Children Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage Children</Text>
        <Text style={styles.sectionSubtitle}>Add or remove children you want to track.</Text>
      </View>
      <FlatList
        data={children}
        keyExtractor={item => item.id}
        style={{ width: '100%' }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No children yet. Add your first child below!</Text>}
        renderItem={({ item }) => (
          <View style={styles.childRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>{item.child_name}</Text>
              <Text style={styles.childPronouns}>{item.pronouns}</Text>
            </View>
            <TouchableOpacity onPress={() => {
              setEditChild(item);
              setEditName(item.child_name);
              setEditPronoun(
                ['He/Him', 'She/Her', 'They/Them'].includes(item.pronouns)
                  ? item.pronouns
                  : 'Other'
              );
              setEditShowCustomPronoun(!['He/Him', 'She/Her', 'They/Them'].includes(item.pronouns));
              setEditCustomPronoun(!['He/Him', 'She/Her', 'They/Them'].includes(item.pronouns) ? item.pronouns : '');
              setEditModalVisible(true);
            }} style={styles.editBtn}>
              <Feather name="edit-2" size={20} color="#5B9AA0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveChild(item)} style={styles.removeBtn}>
              <Feather name="trash-2" size={22} color="#E57373" />
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddModalVisible(true)}>
        <Feather name="plus" size={24} color="#fff" />
        <Text style={styles.addBtnText}>Add Child</Text>
      </TouchableOpacity>
      {/* Add Child Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => { setIsAddModalVisible(false); Keyboard.dismiss(); }}>
          <View style={styles.modalOverlayCentered}>
            <KeyboardAvoidingView
              behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={-150}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContentCentered}>
                  <View style={styles.modalHeaderCentered}>
                    <Text style={styles.modalTitle}>Add Child</Text>
                    <TouchableOpacity onPress={() => { setIsAddModalVisible(false); Keyboard.dismiss(); }}>
                      <Ionicons name="close" size={24} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.inputLabel}>Child's Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter child's name"
                    value={newChildName}
                    onChangeText={setNewChildName}
                    autoCapitalize="words"
                    returnKeyType="done"
                    autoFocus={true}
                  />
                  <Text style={styles.inputLabel}>Pronouns</Text>
                  <View style={styles.chipRow}>
                    {pronounOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.chip, newChildPronouns === option ? styles.chipSelected : null]}
                        onPress={() => {
                          setNewChildPronouns(option);
                          setShowCustomPronoun(option === 'Other');
                          if (option !== 'Other') setCustomPronoun('');
                        }}
                      >
                        <Text style={[styles.chipText, newChildPronouns === option ? styles.chipTextSelected : null]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {showCustomPronoun && (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter custom pronouns"
                      value={customPronoun}
                      onChangeText={setCustomPronoun}
                      autoCapitalize="none"
                      returnKeyType="done"
                    />
                  )}
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddChild} disabled={loading}>
                    <Text style={styles.saveBtnText}>{loading ? 'Adding...' : 'Add Child'}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Edit Child Modal */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => { setEditModalVisible(false); Keyboard.dismiss(); }}>
          <View style={styles.modalOverlayCentered}>
            <KeyboardAvoidingView
              behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={-150}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContentCentered}>
                  <View style={styles.modalHeaderCentered}>
                    <Text style={styles.modalTitle}>Edit Child</Text>
                    <TouchableOpacity onPress={() => { setEditModalVisible(false); Keyboard.dismiss(); }}>
                      <Ionicons name="close" size={24} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.inputLabel}>Child's Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter child's name"
                    value={editName}
                    onChangeText={setEditName}
                    autoCapitalize="words"
                    returnKeyType="done"
                    autoFocus={true}
                  />
                  <Text style={styles.inputLabel}>Pronouns</Text>
                  <View style={styles.chipRow}>
                    {pronounOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.chip, editPronoun === option ? styles.chipSelected : null]}
                        onPress={() => {
                          setEditPronoun(option);
                          setEditShowCustomPronoun(option === 'Other');
                          if (option !== 'Other') setEditCustomPronoun('');
                        }}
                      >
                        <Text style={[styles.chipText, editPronoun === option ? styles.chipTextSelected : null]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* {editShowCustomPronoun && (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter custom pronouns"
                      value={editCustomPronoun}
                      onChangeText={setEditCustomPronoun}
                      autoCapitalize="none"
                      returnKeyType="done"
                    />
                  )} */}
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={async () => {
                      if (!editChild) return;
                      const pronounToSave = editPronoun === 'Other' ? editCustomPronoun.trim() : editPronoun.trim();
                      if (!editName.trim() || !pronounToSave) {
                        Alert.alert('Please enter both name and pronouns.');
                        return;
                      }
                      try {
                        const value = await AsyncStorage.getItem(editChild.id);
                        if (!value) throw new Error('Child not found');
                        const data = JSON.parse(value);
                        data.child_name = editName.trim().toLowerCase();
                        data.child_name_capitalized = editName.trim().charAt(0).toUpperCase() + editName.trim().slice(1).toLowerCase();
                        data.pronouns = pronounToSave;
                        data.updated_at = new Date().toISOString();
                        await AsyncStorage.setItem(editChild.id, JSON.stringify(data));
                        setEditModalVisible(false);
                        setEditChild(null);
                        setEditName('');
                        setEditPronoun('');
                        setEditCustomPronoun('');
                        setEditShowCustomPronoun(false);
                        loadChildren();
                      } catch (error) {
                        Alert.alert('Error', 'Could not update child.');
                      }
                    }}
                  >
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3E3E6B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#5B9AA0',
    marginBottom: 8,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F3F4',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#5B9AA0',
    ...Platform.select({
      ios: {
        shadowColor: '#5B9AA0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  childName: {
    fontSize: 20,
    color: '#3E3E6B',
    fontWeight: '600',
  },
  childPronouns: {
    fontSize: 15,
    color: '#5B9AA0',
    marginTop: 2,
  },
  removeBtn: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF0F0',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5B9AA0',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 130,
    alignSelf: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    color: '#3E3E6B',
    fontSize: 17,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
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
    padding: 20,
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
  input: {
    borderWidth: 1,
    borderColor: '#C6C6C8',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: '#F7F7F7',
  },
  saveBtn: {
    backgroundColor: '#5B9AA0',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#C6C6C8',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: '#F7F7F7',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
  },
  placeholder: {
    fontSize: 16,
    color: '#aaa',
  },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    // maxHeight: '100%',
    height: '63%',
  },
  modalContentCentered: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: 340,
    maxWidth: '90%',
    minWidth: 280,
    // maxHeight: '100%',
    height: '67%',
    flexShrink: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeaderCentered: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#5B9AA0',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#5B9AA0',
    borderColor: '#5B9AA0',
  },
  chipText: {
    color: '#5B9AA0',
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  editBtn: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8F3F4',
  },
  section: {
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3E3E6B',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#5B9AA0',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F3F4',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#5B9AA0',
    ...Platform.select({
      ios: {
        shadowColor: '#5B9AA0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E3E6B',
  },
  settingDescription: {
    fontSize: 14,
    color: '#5B9AA0',
    marginTop: 2,
  },
});