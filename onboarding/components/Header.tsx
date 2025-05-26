import { View, Text, StyleSheet, Pressable, Platform } from 'react-native'
import { SimpleLineIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

const Header = ({ onBackPress, hideBackButton  }: { onBackPress?: () => void, hideBackButton?: boolean }) => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Pressable disabled={hideBackButton} onPress={() => navigation.goBack()} style={styles.iconContainer}>
        <SimpleLineIcons name="arrow-left" size={22} color={hideBackButton ? "#EAE4CF" : "#000"} />
      </Pressable>
      <View style={styles.textContainer}>
        <Text style={styles.title}>glow</Text>
        <Text style={styles.tagline}>Illuminate patterns, empower progress</Text>
      </View>
      {/* Spacer to balance the arrow icon on the right */}
      <View style={styles.iconContainer} />
    </View>
  )
}

export default Header

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#EAE4CF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  
  iconContainer: {
    width: 32,
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  tagline: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
})
