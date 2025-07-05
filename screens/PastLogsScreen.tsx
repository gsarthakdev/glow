import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, SafeAreaView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as MailComposer from 'expo-mail-composer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useFocusEffect } from '@react-navigation/native';

interface Log {
  id: string;
  timestamp: string;
  responses: any;
}

interface MarkedDates {
  [date: string]: {
    marked: boolean;
    dotColor: string;
    count?: number;
  };
}

const DURATION_OPTIONS = ['Today', 'Yesterday', 'This Week'];

// Helper to format date as YYYY-MM-DD
const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// Helper: Uint8Array to base64 (Expo Go compatible)
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in React Native/Expo
  return typeof btoa === 'function' ? btoa(binary) : globalThis.btoa(binary);
}

// Helper: Remove non-ASCII (WinAnsi) characters for pdf-lib compatibility
function sanitizePdfText(text: string): string {
  // Remove all non-ASCII characters (including emoji, fancy spaces, etc.)
  return text.replace(/[^\x00-\x7F]/g, ' ');
}

// PDF generation using pdf-lib
async function generatePDF(logs: Log[], childName: string, duration: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;
  const leftMargin = 40;
  const lineHeight = 20;

  // Title
  page.drawText(sanitizePdfText(`${childName}'s Behavior Log - ${duration}`), {
    x: leftMargin,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.24, 0.24, 0.42),
  });
  y -= lineHeight * 2;

  if (logs.length === 0) {
    page.drawText(sanitizePdfText('No logs found for this period.'), {
      x: leftMargin,
      y,
      size: 14,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  } else {
    // Group logs by date
    const logsByDate: { [date: string]: Log[] } = {};
    logs.forEach((log) => {
      const date = new Date(log.timestamp).toLocaleDateString();
      if (!logsByDate[date]) logsByDate[date] = [];
      logsByDate[date].push(log);
    });
    for (const [date, dayLogs] of Object.entries(logsByDate)) {
      page.drawText(sanitizePdfText(date), {
        x: leftMargin,
        y,
        size: 16,
        font: fontBold,
        color: rgb(0.36, 0.6, 0.63),
      });
      y -= lineHeight;
      for (const log of dayLogs) {
        page.drawText(sanitizePdfText(`Time: ${new Date(log.timestamp).toLocaleTimeString()}`), {
          x: leftMargin + 10,
          y,
          size: 12,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= lineHeight;
        for (const [key, value] of Object.entries(log.responses)) {
          if (typeof value === 'object' && value !== null && 'question' in value && 'answers' in value) {
            page.drawText(sanitizePdfText(`${(value as any).question}: ${(value as any).answers.map((a: any) => a.answer).join(', ')}`), {
              x: leftMargin + 20,
              y,
              size: 12,
              font,
              color: rgb(0.2, 0.2, 0.2),
            });
            y -= lineHeight;
            if ((value as any).comment) {
              page.drawText(sanitizePdfText(`Comment: ${(value as any).comment}`), {
                x: leftMargin + 30,
                y,
                size: 11,
                font,
                color: rgb(0.4, 0.4, 0.4),
              });
              y -= lineHeight;
            }
          }
        }
        y -= 6;
        if (y < 60) {
          y = height - 50;
          pdfDoc.addPage();
        }
      }
      y -= 10;
    }
  }

  const pdfBytes = await pdfDoc.save();
  // Convert Uint8Array to base64 (Expo Go compatible)
  const base64String = uint8ToBase64(pdfBytes);
  const fileName = `${childName}_behavior_logs_${duration.replace(/\s/g, '_').toLowerCase()}.pdf`;
  const fileUri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(fileUri, base64String, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

export default function PastLogsScreen({ navigation }: { navigation: any }) {
  const [selectedDuration, setSelectedDuration] = useState('Today');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [logs, setLogs] = useState<Log[]>([]);

  // Reload logs every time the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadLogs();
    }, [])
  );

  const loadLogs = async () => {
    try {
      // Get the current selected child
      const currentSelectedChildStr = await AsyncStorage.getItem('current_selected_child');
      if (!currentSelectedChildStr) return;
      const currentSelectedChild = JSON.parse(currentSelectedChildStr);
      const childId = currentSelectedChild.id;
      if (!childId) return;
      // Get the full children data object
      const allDataStr = await AsyncStorage.getItem(childId);
      if (!allDataStr) return;
      const childData = JSON.parse(allDataStr);
      // Get completed logs for this child
      const logsArray = childData.completed_logs?.flow_basic_1 || [];
      setLogs(logsArray);
      // Process logs for calendar marking
      const marked: MarkedDates = {};
      logsArray.forEach((log: Log) => {
        const date = log.timestamp.split('T')[0];
        if (marked[date]) {
          marked[date].count = (marked[date].count || 1) + 1;
        } else {
          marked[date] = {
            marked: true,
            dotColor: '#4CAF50',
            count: 1
          };
        }
      });
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const getLogsForDuration = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    // Start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return logs.filter((log: Log) => {
      const logDate = new Date(log.timestamp);
      // Zero out time for comparison
      const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
      switch (selectedDuration) {
        case 'Today':
          return logDay.getTime() === today.getTime();
        case 'Yesterday':
          return logDay.getTime() === yesterday.getTime();
        case 'This Week':
          return logDay >= startOfWeek && logDay <= today;
        default:
          return false;
      }
    });
  };

  const sendLogs = async () => {
    try {
      const selectedLogs = getLogsForDuration();
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        alert('Email composition is not available on this device');
        return;
      }
      // Get current selected child's name
      const currentSelectedChild = await AsyncStorage.getItem('current_selected_child');
      const childName = currentSelectedChild ? JSON.parse(currentSelectedChild).child_name : 'Child';
      // Generate PDF file
      const fileUri = await generatePDF(selectedLogs, childName, selectedDuration);
      await MailComposer.composeAsync({
        subject: `${childName}'s Behavior Logs - ${selectedDuration}`,
        body: `Attached is the behavior log report for ${childName} from ${selectedDuration.toLowerCase()}.`,
        recipients: [], // Add therapist's email here
        attachments: [fileUri],
      });
      // Optionally clean up the file after sending
      // await FileSystem.deleteAsync(fileUri);
    } catch (error) {
      console.error('Error sending logs:', error);
      alert('Failed to generate and send logs. Please try again.');
    }
  };

  const renderDayComponent = ({ date, marking }: any) => {
    return (
      <View style={[styles.dayContainer, marking?.marked && styles.markedDayContainer]}>
        <Text style={styles.dayText}>{date.day}</Text>
        {marking?.count && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{marking.count}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.durationPicker}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.durationText}>
          Send logs from: {selectedDuration}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#5B9AA0" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sendButton}
        onPress={sendLogs}
      >
        <Text style={styles.sendButtonText}>Send logs to therapist</Text>
      </TouchableOpacity>

      <Calendar
        current={new Date().toISOString()}
        markedDates={markedDates}
        hideExtraDays={true}
        firstDay={0}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#5B9AA0',
          selectedDayBackgroundColor: '#4CAF50',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#4CAF50',
          dayTextColor: '#3E3E6B',
          textDisabledColor: '#d9e1e8',
          dotColor: '#4CAF50',
          arrowColor: '#5B9AA0',
          monthTextColor: '#3E3E6B',
          textMonthFontSize: 28,
          textMonthFontWeight: '600',
          textDayFontSize: 16,
          textDayFontWeight: '600',
          textDayHeaderFontSize: 14,
          textDayHeaderFontWeight: '600',
        }}
        style={styles.calendar}
        dayComponent={({ date, state, marking }) => {
          // Extend marking type to include count
          const typedMarking = marking as (typeof marking & { count?: number });
          const isMarked = typedMarking?.marked;
          return (
            <View style={[
              styles.dayContainer,
              isMarked && styles.markedDayContainer
            ]}>
              <Text style={[
                styles.dayText,
                state === 'disabled' && styles.disabledDayText,
                state === 'today' && styles.todayText
              ]}>
                {date?.day}
              </Text>
              {typedMarking?.count && typedMarking.count > 0 && (
                <View style={[
                  styles.countBadge,
                  typedMarking.count >= 10 && { paddingHorizontal: 4 }
                ]}>
                  <Text style={styles.countText}>{typedMarking.count}</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Duration</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.durationOption}
                onPress={() => {
                  setSelectedDuration(option);
                  setIsModalVisible(false);
                }}
              >
                <Text style={styles.durationOptionText}>{option}</Text>
                {selectedDuration === option && (
                  <Ionicons name="checkmark" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  durationPicker: {
    marginTop: 40,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5B9AA0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F8FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  durationText: {
    fontSize: 17,
    color: '#5B9AA0',
    marginRight: 8,
    fontWeight: '600',
  },
  sendButton: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  calendar: {
    margin: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  dayContainer: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    margin: 2,
    backgroundColor: '#fff',
  },
  markedDayContainer: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  dayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3E3E6B',
  },
  todayText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  disabledDayText: {
    color: '#d9e1e8',
  },
  countBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3E3E6B',
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  durationOptionText: {
    fontSize: 18,
    color: '#3E3E6B',
  },
});