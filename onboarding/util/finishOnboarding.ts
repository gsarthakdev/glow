import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { flow_basic_1 } from '../../flows/flow_basic_1';
import notificationService from '../../utils/notificationService';

export async function finishOnboarding(childrenData: { child_name: string; pronouns: string | null }[]) {
    const timestamp = new Date().toISOString();

    for (const child of childrenData) {
        const uuid = uuidv4();
        const key = `${child.child_name.toLowerCase()}_${uuid}`;
        const value = {
            logs: [],
            flow_basic_1: flow_basic_1,
            completed_logs: {
                flow_basic_1_positive: [],
                flow_basic_1_negative: []
            },
            is_deleted: false,
            child_name: child.child_name.toLowerCase(),
            child_name_capitalized: child.child_name.charAt(0).toUpperCase() + child.child_name.slice(1).toLowerCase(),
            pronouns: child.pronouns,
            created_at: timestamp,
            updated_at: timestamp,
            child_uuid: uuid,
        };

        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
            console.log(`Stored data for child: ${child.child_name} with key: ${key}`);
        } catch (error) {
            console.error(`Failed to store data for child: ${child.child_name}`, error);
        }
    }

    try {
        await AsyncStorage.setItem('onboarding_completed', JSON.stringify(true));
        console.log('Onboarding completed flag set to true');
        
        // Request notification permissions after onboarding (non-blocking)
        setTimeout(async () => {
            try {
                const permissionGranted = await notificationService.requestPermissionsWithExplanation();
                if (permissionGranted) {
                    // Enable daily reminders by default
                    await notificationService.scheduleDailyReminder();
                    console.log('Daily reminders enabled after onboarding');
                }
            } catch (notificationError) {
                console.error('Failed to setup notifications after onboarding:', notificationError);
            }
        }, 1000); // Delay by 1 second to ensure onboarding completes first
    } catch (error) {
        console.error('Failed to store onboarding_completed flag', error);
    }
}