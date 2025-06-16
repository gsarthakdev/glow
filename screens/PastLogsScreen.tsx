import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Calendar, WeekCalendar } from 'react-native-calendars';
import * as MailComposer from 'expo-mail-composer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

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

export default function PastLogsScreen({ navigation }: { navigation: any }) {
  const [selectedDuration, setSelectedDuration] = useState('Today');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const storedData = await AsyncStorage.getItem('completed_logs');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const logsArray = parsedData.flow_basic_1 || [];
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
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const getLogsForDuration = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    return logs.filter((log: Log) => {
      const logDate = new Date(log.timestamp);
      switch (selectedDuration) {
        case 'Today':
          return logDate >= today;
        case 'Yesterday':
          return logDate >= yesterday && logDate < today;
        case 'Last Week':
          return logDate >= lastWeek;
        default:
          return false;
      }
    });
  };

  const createLogSummary = (logs: Log[]) => {
    return logs.map(log => {
      const date = new Date(log.timestamp).toLocaleDateString();
      const summary = Object.entries(log.responses)
        .map(([key, value]: [string, any]) => {
          return `${value.question}: ${value.answers.map((a: any) => a.answer).join(', ')}`;
        })
        .join('\n');
      return `Date: ${date}\n${summary}`;
    }).join('\n\n---\n\n');
  };

  const sendLogs = async () => {
    try {
      const selectedLogs = getLogsForDuration();
      const summary = createLogSummary(selectedLogs);

      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        alert('Email composition is not available on this device');
        return;
      }

      await MailComposer.composeAsync({
        subject: `Behavior Logs - ${selectedDuration}`,
        body: summary,
        recipients: [], // Add therapist's email here
        // attachments: [tempPdfPath],
        attachments: [], // TODO: Add PDF attachment
      });
    } catch (error) {
      console.error('Error sending logs:', error);
      alert('Failed to send logs. Please try again.');
    }
  };

  const renderDayComponent = ({ date, marking }: any) => {
    return (
      <View style={[styles.day, marking?.marked && styles.markedDay]}>
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
    <View style={styles.container}>
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
          'stylesheet.calendar.header': {
            header: {
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 15,
              paddingHorizontal: 10,
              alignItems: 'center',
            },
            monthText: {
              fontSize: 28,
              fontWeight: '600',
              color: '#3E3E6B',
              margin: 10,
            },
            dayHeader: {
              marginTop: 5,
              marginBottom: 10,
              width: 52,
              textAlign: 'center',
              fontSize: 14,
              fontWeight: '600',
              color: '#5B9AA0',
            },
          }
        }}
        style={styles.calendar}
        dayComponent={({ date, state, marking }) => {
          const isMarked = marking?.marked;
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
              {marking?.count && marking.count > 0 && (
                <View style={[
                  styles.countBadge,
                  marking.count >= 10 && { paddingHorizontal: 4 }
                ]}>
                  <Text style={styles.countText}>{marking.count}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  
    backgroundColor: '#fff',
    // padding: 16,
  
    backgroundColor: '#fff',
    // padding: 16,
  },
  durationPicker: {
    //   marginTop: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F3F4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 65,
    borderWidth: 1,
    borderColor: '#5B9AA0',
    ...Platform.select({
      ios: {
        shadowColor: '#5B9AA0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      }
    }),
  },
  durationText: {
    fontSize: 17,
    color: '#5B9AA0',
    marginRight: 8,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  calendar: {
    flex: 1,
    marginTop: 10,
  },
  dayContainer: {
    width: 52,
    height: 70,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    marginVertical: 2,
    marginHorizontal: 1,
    backgroundColor: '#fff',
  },
  markedDayContainer: {
    backgroundColor: '#E8F5E9',
  },
  dayText: {
    fontSize: 20,
    color: '#3E3E6B',
    fontWeight: '400',
    marginBottom: 4,
  },
  disabledDayText: {
    color: '#C6C6C8',
  },
  todayText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  countText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  durationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  durationOptionText: {
    fontSize: 17,
  },
});