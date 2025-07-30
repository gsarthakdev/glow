import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure notification behavior - simplified to prevent immediate triggers
Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
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
      // Configure notification channel for Android (no permission request here)
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
      // Ensure the service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
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
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return false;
      }

      // Initialize the service after permissions are granted
      await this.initialize();
      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  async schedulePersonalizedReminder(): Promise<void> {
    try {
      console.log('Scheduling daily reminder for 1:57 AM...');
      
      // Get current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      console.log(`Current time: ${currentHour}:${currentMinute}`);
      console.log(`Target time: 2:18`);
      
      // Check if target time has already passed today
      const targetHour = 20;
      const targetMinute = 30;
      
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const targetTimeInMinutes = targetHour * 60 + targetMinute;
      
      console.log(`Current time in minutes: ${currentTimeInMinutes}`);
      console.log(`Target time in minutes: ${targetTimeInMinutes}`);
      
      if (currentTimeInMinutes >= targetTimeInMinutes) {
        console.log('Target time has already passed today. Scheduling for tomorrow.');
        // Schedule for tomorrow by adding 24 hours
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(targetHour, targetMinute, 0, 0);
        
        console.log(`Scheduling for tomorrow at: ${tomorrow.toLocaleString()}`);
        
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Daily Log Reminder",
            body: "Time to log your child's behavior for today",
            data: { type: 'daily_reminder' },
          },
          trigger: tomorrow as unknown as Notifications.NotificationTriggerInput,
        });
        
        console.log('Daily reminder scheduled for tomorrow with ID:', notificationId);
      } else {
        console.log('Target time is in the future today. Scheduling normally.');
        
        // Cancel any existing daily reminders first
        await this.cancelDailyReminder();
        
        // Schedule a simple daily reminder at 2:18 AM
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Daily Log Reminder",
            body: "Time to log your child's behavior for today",
            data: { type: 'daily_reminder' },
          },
          trigger: {
             type: 'calendar',
             hour: targetHour,
             minute: targetMinute,
             second: 0,
             repeats: true,
             ...(Platform.OS === 'android' ? { channelId: 'daily-reminders' } : {}),
          } as Notifications.CalendarTriggerInput,
        });
        
        console.log('Daily reminder scheduled for today with ID:', notificationId);
      }
      
      // Wait a moment and check if notification was stored
      setTimeout(async () => {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        console.log('Scheduled notifications after delay:', scheduledNotifications.length);
        scheduledNotifications.forEach((notification, index) => {
          console.log(`Notification ${index + 1}:`, {
            id: notification.identifier,
            title: notification.content.title,
            trigger: notification.trigger,
          });
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
    }
  }

  async checkNotificationStatus(): Promise<void> {
    try {
      console.log('=== Notification Status Check ===');
      
      // Check permissions
      const { status } = await Notifications.getPermissionsAsync();
      console.log('Notification permission status:', status);
      
      // Check scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Number of scheduled notifications:', scheduledNotifications.length);
      
      scheduledNotifications.forEach((notification, index) => {
        console.log(`Notification ${index + 1}:`, {
          id: notification.identifier,
          title: notification.content.title,
          body: notification.content.body,
          data: notification.content.data,
          trigger: notification.trigger,
        });
      });
      
      console.log('=== End Status Check ===');
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  }
}

export default NotificationService.getInstance(); 