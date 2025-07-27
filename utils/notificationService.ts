import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface Child {
  id: string;
  child_uuid: string;
  child_name: string;
  pronouns: string;
}

interface Log {
  id: string;
  timestamp: string;
  responses: any;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-reminders', {
          name: 'Daily Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6F61',
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      throw error;
    }
  }

  async scheduleDailyReminder(): Promise<void> {
    try {
      await this.initialize();
      
      // Cancel any existing daily reminders
      await this.cancelDailyReminder();
      
      // Schedule personalized daily reminder at 8:30 PM
      await this.schedulePersonalizedReminder();
      
      // Save reminder preference
      await AsyncStorage.setItem('daily_reminder_enabled', 'true');
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
      throw error;
    }
  }

  async cancelDailyReminder(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const dailyReminders = scheduledNotifications.filter(
        notification => notification.content.data?.type === 'daily_reminder'
      );
      
      for (const reminder of dailyReminders) {
        await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      }
      
      // Save reminder preference
      await AsyncStorage.setItem('daily_reminder_enabled', 'false');
    } catch (error) {
      console.error('Failed to cancel daily reminder:', error);
    }
  }

  async isReminderEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem('daily_reminder_enabled');
      return enabled === 'true';
    } catch (error) {
      console.error('Failed to check reminder status:', error);
      return false;
    }
  }

  async requestPermissionsWithExplanation(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return true;
      }
      
      // Show explanation before requesting permissions
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: false,
          allowSound: true,
        },
      });
      
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  async schedulePersonalizedReminder(): Promise<void> {
    try {
      // Get all children
      const keys = await AsyncStorage.getAllKeys();
      const childKeys = keys.filter(key => 
        key !== 'onboarding_completed' && 
        key !== 'current_selected_child' && 
        key !== 'daily_reminder_enabled'
      );
      
      const childData = await AsyncStorage.multiGet(childKeys);
      const children: Child[] = childData
        .map(([key, value]) => {
          if (!value) return null;
          const data = JSON.parse(value);
          if (data.is_deleted) return null;
          return {
            id: key,
            child_uuid: data.child_uuid,
            child_name: data.child_name_capitalized,
            pronouns: data.pronouns || '',
          };
        })
        .filter(Boolean) as Child[];

      if (children.length === 0) return;

      // Check today's date
      const today = new Date().toISOString().split('T')[0];
      const childrenWithoutLogs: Child[] = [];
      const childrenWithLogs: { child: Child; hasPositive: boolean; hasNegative: boolean }[] = [];

      // Check each child's logs for today
      for (const child of children) {
        const childDataStr = await AsyncStorage.getItem(child.id);
        if (!childDataStr) continue;
        
        const childData = JSON.parse(childDataStr);
        const positiveLogs: Log[] = childData.completed_logs?.flow_basic_1_positive || [];
        const negativeLogs: Log[] = childData.completed_logs?.flow_basic_1_negative || [];
        
        const todayPositiveLogs = positiveLogs.filter((log: Log) => 
          log.timestamp.startsWith(today)
        );
        const todayNegativeLogs = negativeLogs.filter((log: Log) => 
          log.timestamp.startsWith(today)
        );
        
        if (todayPositiveLogs.length === 0 && todayNegativeLogs.length === 0) {
          childrenWithoutLogs.push(child);
        } else {
          childrenWithLogs.push({
            child,
            hasPositive: todayPositiveLogs.length > 0,
            hasNegative: todayNegativeLogs.length > 0
          });
        }
      }

      // Cancel any existing reminders first
      await this.cancelDailyReminder();

      // Send appropriate notification
      if (childrenWithoutLogs.length > 0) {
        // Send reminder for children without logs
        const childNames = childrenWithoutLogs.map(c => c.child_name).join(', ');
        const message = childrenWithoutLogs.length === 1 
          ? `Reminder to make a log for ${childNames}!`
          : `Reminder to make a log for ${childNames}!`;
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Daily Log Reminder",
            body: message,
            data: { type: 'daily_reminder' },
          },
          trigger: {
            hour: 20,
            minute: 30,
            repeats: true,
          } as any,
        });
      } else if (childrenWithLogs.length > 0) {
        // Send congratulatory message for children with logs
        const childNames = childrenWithLogs.map(c => c.child.child_name).join(', ');
        const hasPositive = childrenWithLogs.some(c => c.hasPositive);
        const hasNegative = childrenWithLogs.some(c => c.hasNegative);
        
        let message = `Great job on logging today for ${childNames}!`;
        if (hasPositive && hasNegative) {
          message += " You tracked both positive and challenging moments.";
        } else if (hasPositive) {
          message += " You captured some wonderful positive moments.";
        } else if (hasNegative) {
          message += " You documented important challenging moments.";
        }
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Great Job! 🌟",
            body: message,
            data: { type: 'daily_reminder' },
          },
          trigger: {
            hour: 20,
            minute: 30,
            repeats: true,
          } as any,
        });
      } else {
        // Fallback for edge cases
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Time to log your child's behavior",
            body: "Don't forget to track today's important moments",
            data: { type: 'daily_reminder' },
          },
          trigger: {
            hour: 20,
            minute: 30,
            repeats: true,
          } as any,
        });
      }
    } catch (error) {
      console.error('Failed to schedule personalized reminder:', error);
      // Fallback to simple reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to log your child's behavior",
          body: "Don't forget to track today's important moments",
          data: { type: 'daily_reminder' },
        },
        trigger: {
          hour: 20,
          minute: 30,
          repeats: true,
        } as any,
      });
    }
  }
}

export default NotificationService.getInstance(); 