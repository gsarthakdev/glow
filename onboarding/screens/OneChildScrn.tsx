import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Menu, Provider } from 'react-native-paper';
import Header from '../components/Header'; // Assuming you have a Header component
import OptionButton from '../components/OptionButton';
import { finishOnboarding } from '../util/finishOnboarding';
import { seeAllDBData } from '../../seeData';

const { width } = Dimensions.get('window');

const pronounOptions = ['He/Him', 'She/Her', 'They/Them', 'Other'];

const OneChildScrn = () => {
  const [childName, setChildName] = useState('');
  const [pronoun, setPronoun] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  seeAllDBData(); // Call to see all data on screen load
  const onContinue = async () => {
    console.log('Name:', childName);
    console.log('Pronouns:', pronoun);

    const data = {
      child_name: childName.trim(),
      pronouns: pronoun.trim().toLowerCase() || null,
    };

    try {
      console.log('Saving data:', data);
      await finishOnboarding([data]); // Await the async function
      console.log('Data saved successfully');
      await seeAllDBData(); // Ensure this is awaited as well
    } catch (error) {
      console.error('Error saving data to AsyncStorage:', error);
    }
  };

  const isButtonDisabled = childName.trim().length < 2;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Provider>
        <Header onBackPress={() => {/* your navigation logic here */}} />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <View style={styles.textContainer}>
              <Text style={styles.header}>Tell us about your child</Text>
              <Text style={styles.subHeader}>
                Just their name and pronouns for now!
              </Text>
            </View>
        <View style={{marginTop: -40}}>
            <Text style={styles.label}>Child's Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              value={childName}
              onChangeText={setChildName}
              autoFocus
            />

            <Text style={styles.label}>Pronouns • (optional)</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setMenuVisible(true)}
                >
                  <Text style={pronoun ? styles.dropdownText : styles.placeholder}>
                    {pronoun || 'Select pronouns'}
                  </Text>
                </TouchableOpacity>
              }
            >
              {pronounOptions.map((option) => (
                <Menu.Item
                  key={option}
                  onPress={() => {
                    setPronoun(option);
                    setMenuVisible(false);
                  }}
                  title={option}
                />
              ))}
            </Menu>
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: isButtonDisabled ? '#9ABBCD' : '#7CBADD' },
                ]}
                onPress={onContinue}
                disabled={isButtonDisabled}
              >
                <Text style={styles.buttonText}>Save and Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Provider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EAE4CF',
  },
  content: {
    flex: 1,
    // alignItems: 'center',
    // justifyContent: 'center',
    marginTop: 30,
    paddingHorizontal: 24,
  },
  textContainer: {
    marginBottom: 60,
    // marginLeft: 20,
  },
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000',
  },
  subHeader: {
    fontSize: 15,
    color: 'grey',
    marginTop: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    fontSize: 16,
    width: '100%',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
    marginBottom: 40,
    width: '100%',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
  },
  placeholder: {
    fontSize: 16,
    color: '#aaa',
  },
  buttonContainer: {
    marginTop: -13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#9ABBCD',
    // not disabled backgroundColor: 7CBADD
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    width: width - 48,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OneChildScrn;
