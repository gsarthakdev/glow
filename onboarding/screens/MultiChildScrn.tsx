import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Header from '../components/Header';
import { seeAllDBData } from '../../seeData';
import { finishOnboarding } from '../util/finishOnboarding';
import { capitalizeFirstLetter } from '../../utils/nameUtils';

const { width } = Dimensions.get('window');

const pronounOptions = ['He/Him', 'She/Her', 'They/Them', 'Other'];

const MultiChildScrn = () => {
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [children, setChildren] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showPronounModal, setShowPronounModal] = useState(false);

  const resetForm = () => {
    setName('');
    setPronouns('');
    setEditingIndex(null);
  };

  const handleAddOrUpdate = () => {
    const trimmedName = capitalizeFirstLetter(name.trim()); 
    if (editingIndex !== null) {
      const updated = [...children];
      updated[editingIndex] = { child_name: trimmedName, pronouns: pronouns.toLowerCase() || null };
      setChildren(updated);
    } else {
      setChildren([...children, { child_name: trimmedName, pronouns: pronouns.toLowerCase() || null }]);
    }
    resetForm();
  };

  const handleEdit = (index) => {
    const child = children[index];
    const childName = capitalizeFirstLetter(child.child_name);
    setName(childName);
    setPronouns(child.pronouns ? child.pronouns.toLowerCase() : null);
    setEditingIndex(index);
  };

  const handleDelete = (index) => {
    const updated = [...children];
    updated.splice(index, 1);
    setChildren(updated);
    if (editingIndex === index) resetForm();
  };

  async function handleSaveAndContinue() {
    try {
          console.log('Saving data:', children);
          await finishOnboarding(children); // Await the async function
          console.log('Data saved successfully');
          console.log("\n-- Data in AsyncStorage --\n");
          await seeAllDBData(); // Ensure this is awaited as well
          console.log("-- End of Data --\n");
        } catch (error) {
          console.error('Error saving data to AsyncStorage:', error);
        }
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
          <Header hideBackButton={false} subtext="Last step, then you can start logging 🎉" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>Add each child</Text>
          <Text style={styles.subtitle}>You can add more than one!</Text>

          <Text style={styles.label}>Child's Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter name"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.label}>Pronouns (optional)</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowPronounModal(true)}
          >
            <Text style={pronouns ? styles.dropdownText : styles.placeholder}>
              {pronouns || 'Select pronouns'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: name.trim().length < 2 ? '#ccc' : '#7CBADD' },
            ]}
            onPress={handleAddOrUpdate}
            disabled={name.trim().length < 2}
          >
            <Text style={styles.addButtonText}>
              {editingIndex !== null ? 'Save Changes' : 'Add Child'}
            </Text>
          </TouchableOpacity>

          <FlatList
            data={children}
            keyExtractor={(item, index) => index.toString()}
            style={styles.list}
            renderItem={({ item, index }) => (
              <View style={styles.childItem}>
                <View>
                  <Text style={styles.childName}>{item.child_name}</Text>
                  <Text style={styles.childPronoun}>{item.pronouns}</Text>
                </View>
                <View style={styles.childActions}>
                  <TouchableOpacity onPress={() => handleEdit(index)}>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(index)}>
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: children.length > 0 ? '#7CBADD' : '#ccc' },
            ]}
            disabled={children.length === 0}
            onPress={handleSaveAndContinue}
          >
            <Text style={styles.continueButtonText}>Save and Continue</Text>
          </TouchableOpacity>

          <Modal
            transparent
            animationType="fade"
            visible={showPronounModal}
            onRequestClose={() => setShowPronounModal(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowPronounModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  {pronounOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.modalOption}
                      onPress={() => {
                        setPronouns(option);
                        setShowPronounModal(false);
                      }}
                    >
                      <Text style={styles.modalOptionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EAE4CF' },
  container: { flex: 1, padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000' },
  subtitle: { fontSize: 15, color: 'gray', marginBottom: 24, marginTop: 8 },
  label: { fontSize: 16, color: '#444', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  dropdownText: { fontSize: 16, color: '#000' },
  placeholder: { fontSize: 16, color: '#aaa' },
  addButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  list: { flex: 1 },
  childItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
  },
  childName: { fontSize: 16, fontWeight: 'bold' },
  childPronoun: { fontSize: 14, color: 'gray' },
  childActions: { flexDirection: 'row', gap: 16 },
  actionText: { color: '#007AFF', fontWeight: '500', marginLeft: 12 },
  continueButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  continueButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: width - 80,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  modalOption: { padding: 12, alignItems: 'center' },
  modalOptionText: { fontSize: 16 },
});

export default MultiChildScrn;
