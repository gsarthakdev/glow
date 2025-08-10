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

  async scheduleDailyReminder(customTime?: { hour: number; minute: number }): Promise<void> {
    try {
      // Ensure the service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Cancel any existing daily reminders
      await this.cancelDailyReminder();
      
      // Use custom time if provided, otherwise default to 8:30 PM
      const targetHour = customTime?.hour ?? 20;
      const targetMinute = customTime?.minute ?? 30;
      
      // Schedule personalized daily reminder at the specified time
      await this.schedulePersonalizedReminder(targetHour, targetMinute);
      
      // Save reminder preference and time
      await AsyncStorage.setItem('daily_reminder_enabled', 'true');
      await AsyncStorage.setItem('daily_reminder_time', JSON.stringify({ hour: targetHour, minute: targetMinute }));
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
      console.error('Error checking reminder status:', error);
      return false;
    }
  }

  async getReminderTime(): Promise<{ hour: number; minute: number }> {
    try {
      const timeString = await AsyncStorage.getItem('daily_reminder_time');
      if (timeString) {
        return JSON.parse(timeString);
      }
      // Default to 8:30 PM if no custom time is set
      return { hour: 20, minute: 30 };
    } catch (error) {
      console.error('Error getting reminder time:', error);
      // Default to 8:30 PM if there's an error
      return { hour: 20, minute: 30 };
    }
  }

  async requestPermissionsWithExplanation(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async schedulePersonalizedReminder(hour: number, minute: number): Promise<void> {
    try {
      // Get current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if target time has already passed today
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const targetTimeInMinutes = hour * 60 + minute;
      
      if (currentTimeInMinutes >= targetTimeInMinutes) {
        // Schedule for tomorrow by adding 24 hours
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hour, minute, 0, 0);
        
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Daily Log Reminder",
            body: "Time to log your child's behavior for today",
            data: { type: 'daily_reminder' },
          },
          trigger: tomorrow as unknown as Notifications.NotificationTriggerInput,
        });
        
        console.log('Daily reminder scheduled for tomorrow at:', tomorrow.toLocaleString());
      } else {
        // Schedule a daily reminder at the specified time
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Daily Log Reminder",
            body: "Time to log your child's behavior for today",
            data: { type: 'daily_reminder' },
          },
          trigger: {
             type: 'calendar',
             hour: hour,
             minute: minute,
             second: 0,
             repeats: true,
             ...(Platform.OS === 'android' ? { channelId: 'daily-reminders' } : {}),
          } as Notifications.CalendarTriggerInput,
        });
        
        console.log('Daily reminder scheduled for today at:', `${hour}:${minute.toString().padStart(2, '0')}`);
      }
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
      throw error;
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