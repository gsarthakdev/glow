import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

export async function finishOnboarding(childrenData: { child_name: string; pronouns: string | null }[]) {
    const timestamp = new Date().toISOString();

    for (const child of childrenData) {
        const uuid = uuidv4();
        const key = `${child.child_name}_${uuid}`;
        const value = {
            logs: [],
            flow_basic: [],
            is_deleted: false,
            child_name: child.child_name,
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
    } catch (error) {
        console.error('Failed to store onboarding_completed flag', error);
    }
}