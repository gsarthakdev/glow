import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { flow_basic_1 } from '../../flows/flow_basic_1';

export async function finishOnboarding(childrenData: { child_name: string; pronouns: string | null; goals?: string[]; commentsEnabled?: boolean }[]) {
    const timestamp = new Date().toISOString();

    // Helper function to convert string goals to goal objects
    const convertGoalsToObjects = (goalStrings: string[] | undefined) => {
        if (!goalStrings || goalStrings.length === 0) {
            return [];
        }
        
        return goalStrings.map(goalText => ({
            id: uuidv4(),
            text: goalText,
            dailyCounts: [],
            comments: [],
            createdAt: timestamp
        }));
    };

    // helper function to generate a unique 6 digit support key
    const generateSupportKey = () => {
        const uuid = uuidv4();
        const hash = parseInt(uuid.replace(/-/g, '').slice(0, 8), 16);
        return (100000 + (hash % 900000)).toString();
    };
   
    for (const child of childrenData) {
        const uuid = uuidv4();
        const key = `${child.child_name.toLowerCase()}_${uuid}`;
        const value = {
            logs: [],
            // flow_basic_1: flow_basic_1,
            completed_logs: {
                flow_basic_1_positive: [],
                flow_basic_1_negative: []
            },
            is_deleted: false,
            child_name: child.child_name.toLowerCase(),
            child_name_capitalized: child.child_name.charAt(0).toUpperCase() + child.child_name.slice(1).toLowerCase(),
            pronouns: child.pronouns,
            goals: convertGoalsToObjects(child.goals),
            created_at: timestamp,
            updated_at: timestamp,
            child_uuid: uuid,
            is_comment_enabled: child.commentsEnabled !== undefined ? child.commentsEnabled : true,
            support_key: generateSupportKey()
        };

        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
            console.log(`[ONBOARDING] Stored data for child: ${child.child_name} with key: ${key}`);
            console.log(`[ONBOARDING] commentsEnabled from QR: ${child.commentsEnabled}, stored as is_comment_enabled: ${value.is_comment_enabled}`);
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