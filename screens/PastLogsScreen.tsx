//iphone se adjustment
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, SafeAreaView, Linking, Pressable, Switch, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as MailComposer from 'expo-mail-composer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFName, PDFString } from 'pdf-lib';
import { Asset } from 'expo-asset';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AffirmationModal from '../components/AffirmationModal';
import { useEmailShare } from '../utils/useEmailShare';

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

const DURATION_OPTIONS = ['This Week', 'Today', 'Yesterday'];

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

// Helper: Truncate label to 32 chars + ellipsis
function truncateLabel(label: string): string {
  if (label.length > 32) {
    return label.slice(0, 32) + '...';
  }
  return label;
}

// --- Chart Data Aggregation Helpers ---

// 1. Who Was Involved
function aggregateWhoWasInvolved(logs: Log[]) {
  const participantCounts: Record<string, number> = {};
  const comboCounts: Record<string, number> = {};
  logs.forEach(log => {
    const answers = log.responses?.whoWasInvolved?.answers || [];
    const labels = answers.map((a: any) => truncateLabel(a.answer)).sort();
    // Count each participant
    labels.forEach((label: string) => {
      participantCounts[label] = (participantCounts[label] || 0) + 1;
    });
    // Count unique combinations
    if (labels.length > 0) {
      const comboKey = labels.join(' + ');
      comboCounts[comboKey] = (comboCounts[comboKey] || 0) + 1;
    }
  });
  return { participantCounts, comboCounts };
}

// 2. Log Distribution by Time of Day
function aggregateTimeOfDay(logs: Log[]) {
  // Map label to y-index (row)
  const timeLabels = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const timeLabelToY = Object.fromEntries(timeLabels.map((l, i) => [l, i]));
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const points: { x: string, y: string }[] = [];
  logs.forEach(log => {
    const answers = log.responses?.whenDidItHappen?.answers || [];
    const label = answers[0]?.answer || 'Other';
    const date = new Date(log.timestamp);
    const day = dayLabels[date.getDay()];
    points.push({ x: label, y: day });
  });
  return { points, timeLabels, dayLabels };
}

// 3. Mood Before vs. After
function aggregateMood(logs: Log[]) {
  // { [day]: { before: number[], after: number[] } }
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const moodByDay: Record<string, { before: number[], after: number[] }> = {};
  logs.forEach(log => {
    const date = new Date(log.timestamp);
    const day = dayLabels[date.getDay()];
    const moodStr = log.responses?.mood?.answers?.[0]?.answer || '';
    const match = moodStr.match(/Before: (\d+), After: (\d+)/);
    if (match) {
      const before = parseInt(match[1], 10);
      const after = parseInt(match[2], 10);
      if (!moodByDay[day]) moodByDay[day] = { before: [], after: [] };
      moodByDay[day].before.push(before);
      moodByDay[day].after.push(after);
    }
  });
  return { moodByDay, dayLabels };
}

// List of all possible behaviors (update as needed)
const ALL_BEHAVIOR_LABELS = [
  'Hit',
  'Screamed',
  'Refused instruction',
  'Threw object',
  // 'Other',
  // 'Crying really loud' // add any custom/expected labels
];

// 4. What Was Involved (dynamic, only labels in data)
function aggregateBehaviors(logs: Log[]) {
  const behaviorCounts: Record<string, number> = {};
  logs.forEach(log => {
    const answers = log.responses?.whatDidTheyDo?.answers || [];
    answers.forEach((a: any) => {
      // Always use a.answer as the label, regardless of isCustom
      if (a.answer === 'Other') return; // Exclude literal 'Other' if present
      const label = truncateLabel(a.answer);
      if (behaviorCounts[label] !== undefined) {
        behaviorCounts[label] += 1;
      } else {
        behaviorCounts[label] = 1;
      }
    });
  });
  return behaviorCounts;
}

// List of all possible antecedents and consequences (update as needed)
const ALL_ANTECEDENT_LABELS = [
  'After denied something',
  'After being told no',
  'After nap',
  'During play',
  // 'lol bruh'
  // 'Other'
];
const ALL_POSITIVE_ANTECEDENT_LABELS = [
  'After praise',
  'Routine was followed',
  'Transition went well',
  'Felt supported',
];
const ALL_CONSEQUENCE_LABELS = [
  'No reaction',
  'Happened again',
  'Comforted',
  'Removed item',
  'Given warning',
  'Sent to room',
  // 'Other'
];

// 5. Antecedents (ensure all possible antecedents are included)
function aggregateAntecedents(logs: Log[], allAntecedentLabels: string[]) {
  const antecedentCounts: Record<string, number> = {};
  allAntecedentLabels.forEach(label => {
    antecedentCounts[truncateLabel(label)] = 0;
  });
  logs.forEach(log => {
    const answers = log.responses?.whatHappenedBefore?.answers || [];
    answers.forEach((a: any) => {
      if (a.answer === 'Other') return; // Exclude literal 'Other'
      const label = truncateLabel(a.answer);
      if (antecedentCounts[label] !== undefined) {
        antecedentCounts[label] += 1;
      } else {
        antecedentCounts[label] = 1; // add new custom label
      }
    });
  });
  return antecedentCounts;
}

// 6. Consequences (dynamic, only labels in data)
function aggregateConsequences(logs: Log[]) {
  const consequenceCounts: Record<string, number> = {};
  logs.forEach(log => {
    const answers = log.responses?.whatHappenedAfter?.answers || [];
    answers.forEach((a: any) => {
      if (a.answer === 'Other') return; // Exclude literal 'Other'
      const label = truncateLabel(a.answer);
      if (consequenceCounts[label] !== undefined) {
        consequenceCounts[label] += 1;
      } else {
        consequenceCounts[label] = 1;
      }
    });
  });
  return consequenceCounts;
}

// --- QuickChart.io Chart URL Generators ---

// 1. Pie Chart for Who Was Involved
function getWhoPieChartUrl(participantCounts: Record<string, number>, colors: string[]) {
  const labels = Object.keys(participantCounts).map(truncateLabel);
  const data = Object.values(participantCounts);
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
    type: 'pie',
    data: {
      labels,
      datasets: [{ 
        data, 
        backgroundColor: colors.slice(0, labels.length), 
        fontColor: 'white',
        fontStyle: 'bold',
      }]
    },
    options: {
      legend: { position: 'left', labels: {
        fontSize: 20
      } },
      title: { display: true, text: 'Who Was Involved', fontSize: 30 },
      plugins: {
        datalabels: {
          "display": true,
          "align": "center",
          "anchor": "center",
          // "backgroundColor": "#000000",
          // "borderColor": "#ffffff",
          // "borderRadius": 15,
          // "borderWidth": 1,
          // "padding": 4,
          "color": "#ffffff",
          "font": {
            "family": "sans-serif",
            "size": 17,
            "style": "bold"
          }
        },
        datalabelsZAxis: {
          "enabled": false
        },
        googleSheets: {},
        airtable: {},
        tickFormat: ""
        }
    }
    
  }))}`;
}

// 2. Scatter Plot for Time of Day (categorical axes, full day names)
function getTimeScatterChartUrl(points: { x: string, y: string }[], timeLabels: string[], dayLabels: string[], color: string) {
  const fullDayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Map short day labels to full names in points
  const pointsFull = points.map(pt => {
    const dayIdx = dayLabels.indexOf(pt.y);
    const fullDay = dayIdx !== -1 ? fullDayLabels[dayIdx] : pt.y;
    return { x: pt.x, y: fullDay, r: 7 };
  });
  // Add dummy points for all (time, day) combinations not present
  const existingSet = new Set(pointsFull.map(pt => pt.x + '|' + pt.y));
  const dummyPoints = [];
  for (const x of timeLabels) {
    for (const y of fullDayLabels) {
      const key = x + '|' + y;
      if (!existingSet.has(key)) {
        dummyPoints.push({ x, y, r: 0 });
      }
    }
  }
  // Sanity check: log axis labels and unique x/y values in real points
  const uniqueX = Array.from(new Set(pointsFull.map(pt => pt.x)));
  const uniqueY = Array.from(new Set(pointsFull.map(pt => pt.y)));
  console.log('Bubble uniqueX (real):', uniqueX);
  console.log('Bubble uniqueY (real):', uniqueY);
  console.log('Bubble timeLabels (x axis):', timeLabels);
  console.log('Bubble fullDayLabels (y axis):', fullDayLabels);
  // Build chart config
  const chartConfig = {
    type: 'bubble',
    data: {
      datasets: [
        {
          label: 'dummy',
          data: dummyPoints,
          backgroundColor: 'rgba(0,0,0,0)',
          borderColor: 'rgba(0,0,0,0)',
          order: 1,
        },
        {
          label: 'Incidents',
          data: pointsFull,
          backgroundColor: color,
          borderColor: color,
          order: 2,
        }
      ]
    },
    options: {
      scales: {
        x: {
          type: 'category',
          labels: timeLabels,
          title: { display: true, text: 'Time of Day' },
          ticks: { autoSkip: false },
          offset: true
        },
        y: {
          type: 'category',
          labels: fullDayLabels,
          title: { display: true, text: 'Day of Week' },
          ticks: { autoSkip: false },
          offset: true
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            filter: function(item: any, chart: any) {
              // Hide dummy from legend
              return item.text !== 'dummy';
            }
          }
        }
      },
      title: { display: true, text: 'Log Distribution by Time of Day' },
    }
  };
  // Log full chart config
  console.log('Bubble chartConfig:', JSON.stringify(chartConfig, null, 2));
  const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
  console.log('Bubble chart URL:', url);
  return url;
}

// 3. Mood Before vs. After (Dual Line)
function getMoodLineChartUrl(moodByDay: Record<string, { before: number[], after: number[] }>, dayLabels: string[], colors: { before: string, after: string }) {
  const xLabels = dayLabels;
  const beforeData = xLabels.map(day => {
    const arr = moodByDay[day]?.before || [];
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  });
  const afterData = xLabels.map(day => {
    const arr = moodByDay[day]?.after || [];
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  });
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
    type: 'line',
    data: {
      labels: xLabels,
      datasets: [
        { label: 'Mood Before', data: beforeData, borderColor: colors.before, fill: false },
        { label: 'Mood After', data: afterData, borderColor: colors.after, fill: false }
      ]
    },
    options: {
      spanGaps: true,
      plugins: { legend: { position: 'bottom' } },
      title: { display: true, text: 'Mood Before vs. After', fontSize: 30 },
      scales: {
        yAxes: [{
          // min: 0, max: 10, 
          ticks: {
            stepSize: 1,
            // beginAtZero: true,
            min: 1,
            max: 10
          }
        }]
      }
    }
  }))}`;
}

// 4. Histogram (Bar) for Behaviors, Antecedents, Consequences
function getBarChartUrl(title: string, counts: Record<string, number>, color: string, horizontal = false) {
  const labels = Object.keys(counts).map(truncateLabel);
  const data = labels.map(l => Number(counts[l]) || 0);
  const maxValue = Math.max(...data, 1);
  const axisMax = Math.max(2, maxValue);

  // For 'What happened' and 'Consequences', as well as 'Antecedents', use the same dynamic axis logic
  const isSpecial = ['What happened', 'Antecedents', 'Consequences'].includes(title);

  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: color, minBarLength: 4 }]
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      legend: { display: false },
      title: { display: true, text: title, fontSize: 30, fontStyle: 'normal', fontFamily: 'sans-serif' },
      scales: {
        yAxes: [{
          // min: 0, max: 10, 
          ticks: {
            stepSize: 1,
            beginAtZero: true,
            // min: 1,
            max: axisMax
          }
        }]
      }
      // scales: isSpecial || horizontal
      //   ? {
      //       x: {
      //         type: 'linear',
      //         min: 0,
      //         max: axisMax,
      //         ticks: { stepSize: 1, min: 0, max: axisMax }
      //       },
      //       y: {
      //         type: 'category'
      //       }
      //     }
      //   : {
      //       x: {
      //         type: 'category'
      //       },
      //       y: {
      //         type: 'linear',
      //         min: 0,
      //         max: axisMax,
      //         ticks: { stepSize: 1, min: 0, max: axisMax }
      //       }
      //     }
    }
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
}

// Helper to aggregate log counts for each (time, day) cell
function aggregateTimeOfDayMatrix(logs: Log[]) {
  const timeLabels = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Initialize matrix
  const matrix: number[][] = Array(dayLabels.length).fill(0).map(() => Array(timeLabels.length).fill(0));
  logs.forEach(log => {
    const answers = log.responses?.whenDidItHappen?.answers || [];
    const timeIdx = timeLabels.indexOf(answers[0]?.answer || 'Other');
    const date = new Date(log.timestamp);
    const dayIdx = date.getDay(); // 0=Sunday
    if (timeIdx !== -1 && dayIdx !== -1) {
      matrix[dayIdx][timeIdx] += 1;
    }
  });
  return { matrix, timeLabels, dayLabels };
}

// Goals PDF generation function
async function generateGoalsPDF(childName: string, childId: string, duration: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper to get current week dates (Monday to Sunday)
  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Adjust for Monday start
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      weekDates.push(`${year}-${month}-${day}`);
    }
    return weekDates;
  };

  // Helper to get day name
  const getDayName = (dateString: string) => {
    // Parse date string in local time to avoid UTC issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Convert Sunday (0) to 6, and shift other days accordingly
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    return days[dayIndex];
  };

  // Helper to format date for display
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  // Load goals from child's data
  const loadGoals = async () => {
    try {
      const childData = await AsyncStorage.getItem(childId);
      if (childData) {
        try {
          const child = JSON.parse(childData);
          const childGoals = child.goals || [];
          // Filter out archived goals and ensure they have comments array
          return childGoals
            .filter((goal: any) => !goal.isArchived)
            .map((goal: any) => ({
              ...goal,
              comments: goal.comments || []
            }));
        } catch (parseError) {
          console.error('JSON PARSE ERROR in generateGoalsPDF loadGoals:', parseError);
          console.error('Raw child data:', childData);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading goals:', error);
      return [];
    }
  };

  // Helper to format date for comment display
  const formatDateForCommentDisplay = (dateString: string) => {
    // Parse date string in local time to avoid UTC issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    return dayName;
  };

  // Helper to filter comments for current week
  const filterCommentsForWeek = (comments: any[], weekDates: string[]) => {
    return comments.filter(comment => weekDates.includes(comment.date));
  };

  // Helper to group comments by goal and date
  const groupCommentsByGoalAndDate = (goals: any[], weekDates: string[]) => {
    const grouped: { [goalId: string]: { goalName: string, dates: { [date: string]: any[] } } } = {};
    
    goals.forEach(goal => {
      const weekComments = filterCommentsForWeek(goal.comments || [], weekDates);
      if (weekComments.length > 0) {
        grouped[goal.id] = {
          goalName: goal.text,
          dates: {}
        };
        
        weekComments.forEach(comment => {
          if (!grouped[goal.id].dates[comment.date]) {
            grouped[goal.id].dates[comment.date] = [];
          }
          grouped[goal.id].dates[comment.date].push(comment);
        });
      }
    });
    
    return grouped;
  };

  const goals = await loadGoals();
  const weekDates = getWeekDates();
  const startDate = formatDateForDisplay(weekDates[0]);
  const endDate = formatDateForDisplay(weekDates[6]);

  // Create the goals page
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  let y = height - 40;
  const leftMargin = 20;
  const rightMargin = 20;
  const tableWidth = width - leftMargin - rightMargin;

  // Page title
  page.drawText(sanitizePdfText(`Goals Frequency Report for ${childName}`), {
    x: leftMargin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.24, 0.24, 0.42),
  });
  y -= 30;

  // Week range subtitle
  page.drawText(sanitizePdfText(`Week of ${startDate} to ${endDate}`), {
    x: leftMargin,
    y,
    size: 14,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 40;

  if (goals.length === 0) {
    // No goals message
    page.drawText(sanitizePdfText(`No goals added for this week (${startDate} to ${endDate})`), {
      x: leftMargin,
      y,
      size: 14,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
  } else {
    // Create goals table
    const tableStartY = y;
    const rowHeight = 25;
    const headerHeight = 30;
    const goalColWidth = tableWidth * 0.4; // 40% for goal text
    const dayColWidth = (tableWidth - goalColWidth) / 7; // Equal width for 7 days

    // Table header
    const headerY = tableStartY;
    
    // Goal column header
    page.drawText('Goal', {
      x: leftMargin,
      y: headerY - 20,
      size: 12,
      font: fontBold,
      color: rgb(0.24, 0.24, 0.42),
    });

    // Day headers
    weekDates.forEach((date, index) => {
      const dayName = getDayName(date);
      const dayX = leftMargin + goalColWidth + (index * dayColWidth);
      page.drawText(dayName, {
        x: dayX + (dayColWidth / 2) - (fontBold.widthOfTextAtSize(dayName, 10) / 2),
        y: headerY - 20,
        size: 10,
        font: fontBold,
        color: rgb(0.24, 0.24, 0.42),
      });
    });

    // Draw header border
    page.drawLine({
      start: { x: leftMargin, y: headerY - 25 },
      end: { x: leftMargin + tableWidth, y: headerY - 25 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Table rows
    goals.forEach((goal: any, goalIndex: number) => {
      const rowY = tableStartY - headerHeight - (goalIndex * rowHeight);
      
      // Goal text (with word wrapping)
      const goalText = sanitizePdfText(goal.text);
      const maxGoalWidth = goalColWidth - 10;
      const goalLines = [];
      let currentLine = '';
      const words = goalText.split(' ');
      
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = font.widthOfTextAtSize(testLine, 10);
        if (testWidth > maxGoalWidth && currentLine) {
          goalLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) goalLines.push(currentLine);

      // Draw goal text (first line only, truncate if too long)
      const displayText = goalLines[0] || '';
      page.drawText(displayText, {
        x: leftMargin + 5,
        y: rowY - 15,
        size: 10,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });

      // Day counts
      weekDates.forEach((date, dayIndex) => {
        const dayX = leftMargin + goalColWidth + (dayIndex * dayColWidth);
        const count = goal.dailyCounts?.find((dc: any) => dc.date === date)?.count || 0;
        const countText = count.toString();
        
        page.drawText(countText, {
          x: dayX + (dayColWidth / 2) - (font.widthOfTextAtSize(countText, 10) / 2),
          y: rowY - 15,
          size: 10,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
      });

      // Row border
      page.drawLine({
        start: { x: leftMargin, y: rowY - 25 },
        end: { x: leftMargin + tableWidth, y: rowY - 25 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9),
      });
    });

    // Final table border
    page.drawLine({
      start: { x: leftMargin, y: tableStartY },
      end: { x: leftMargin + tableWidth, y: tableStartY },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawLine({
      start: { x: leftMargin, y: tableStartY - headerHeight - (goals.length * rowHeight) },
      end: { x: leftMargin + tableWidth, y: tableStartY - headerHeight - (goals.length * rowHeight) },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawLine({
      start: { x: leftMargin, y: tableStartY },
      end: { x: leftMargin, y: tableStartY - headerHeight - (goals.length * rowHeight) },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawLine({
      start: { x: leftMargin + tableWidth, y: tableStartY },
      end: { x: leftMargin + tableWidth, y: tableStartY - headerHeight - (goals.length * rowHeight) },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawLine({
      start: { x: leftMargin + goalColWidth, y: tableStartY },
      end: { x: leftMargin + goalColWidth, y: tableStartY - headerHeight - (goals.length * rowHeight) },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Add comments section if there are comments for the current week
    const groupedComments = groupCommentsByGoalAndDate(goals, weekDates);
    const hasComments = Object.keys(groupedComments).length > 0;
    
    if (hasComments) {
      // Calculate where the goals table ended
      const tableEndY = tableStartY - headerHeight - (goals.length * rowHeight);
      y = tableEndY - 40;
      
      // Comments section title
      page.drawText(sanitizePdfText('Parent-added Comments for each Goal'), {
        x: leftMargin,
        y,
        size: 16,
        font: fontBold,
        color: rgb(0.24, 0.24, 0.42),
      });
      y -= 30;

      // Iterate through each goal with comments
      Object.entries(groupedComments).forEach(([goalId, goalData]) => {
        // Goal name header
        page.drawText(sanitizePdfText(`Goal: ${goalData.goalName}`), {
          x: leftMargin,
          y,
          size: 12,
          font: fontBold,
          color: rgb(0.24, 0.24, 0.42),
        });
        y -= 20;

        // Sort dates (most recent first)
        const sortedDates = Object.keys(goalData.dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        sortedDates.forEach(date => {
          const comments = goalData.dates[date];
          
          // Date header
          page.drawText(sanitizePdfText(formatDateForCommentDisplay(date)), {
            x: leftMargin + 10,
            y,
            size: 10,
            font: fontBold,
            color: rgb(0.5, 0.5, 0.5),
          });
          y -= 15;

                     // Comments for this date
           comments.forEach(comment => {
             const commentText = sanitizePdfText(comment.text);
             const maxCommentWidth = tableWidth - 30; // Reduced width to accommodate bullet point
             const commentLines = wrapText(commentText, maxCommentWidth, 9, font);
             
             commentLines.forEach((line, lineIndex) => {
               if (y < 100) {
                 // Add new page if running out of space
                 const newPage = pdfDoc.addPage([595, 842]);
                 y = height - 40;
               }
               
               // Add bullet point only for the first line of each comment
               const displayText = lineIndex === 0 ? `• ${line}` : `  ${line}`;
               const xOffset = lineIndex === 0 ? leftMargin + 20 : leftMargin + 25;
               
               page.drawText(displayText, {
                 x: xOffset,
                 y,
                 size: 9,
                 font: font,
                 color: rgb(0.2, 0.2, 0.2),
               });
               y -= 12;
             });
             
             y -= 5; // Space between comments
           });
          
          y -= 10; // Space between dates
        });
        
        y -= 15; // Space between goals
      });
    }
  }

  // Add footer with therapist contact and App Store link
  const footerY = 40;
  const footerText = "Therapists, to have this report customized, email";
  const therapistEmail = "hello@sarthak.pro";
  const appStoreUrl = "https://apps.apple.com/us/app/glow-logs-that-light-the-way/id6748978131";
  
  const footerRightMargin = 20;
  const footerRightEdge = width - footerRightMargin;
  
  // Helper function to wrap text at word boundaries
  function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  const footerStartX = 50;
  const availableTextWidth = footerRightEdge - footerStartX - 10;
  
  // Wrap the footer text
  const wrappedFooterLines = wrapText(footerText, availableTextWidth, 12, fontBold);
  const footerLineHeight = 14;

  wrappedFooterLines.forEach((line, index) => {
    const lineWidth = fontBold.widthOfTextAtSize(line, 7);
    page.drawText(sanitizePdfText(line), {
      x: footerRightEdge - lineWidth,
      y: footerY - (index * footerLineHeight),
      size: 7,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  // Place therapist email
  const emailY = footerY - (wrappedFooterLines.length * footerLineHeight);
  const emailWidthR = fontBold.widthOfTextAtSize(therapistEmail, 7);
  page.drawText(sanitizePdfText(therapistEmail), {
    x: footerRightEdge - emailWidthR,
    y: emailY,
    size: 7,
    font: fontBold,
    color: rgb(0, 0, 1),
  });

  // Draw "See Glow App" hyperlink
  const appLinkText = "See Glow App";
  const appLinkWidth = font.widthOfTextAtSize(appLinkText, 10);
  const appLinkX = footerRightEdge - appLinkWidth;
  const appLinkY = emailY - footerLineHeight;

  page.drawText(sanitizePdfText(appLinkText), {
    x: appLinkX,
    y: appLinkY,
    size: 10,
    font: font,
    color: rgb(0, 0, 1),
  });

  // Hyperlink annotation for "See Glow App"
  // @ts-ignore - low-level annotation creation
  const linkAnnot = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [appLinkX, appLinkY, appLinkX + appLinkWidth, appLinkY + 12],
    Border: [0, 0, 0],
    A: {
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(appStoreUrl),
    },
  });

  // @ts-ignore - attach annotation to page
  const annots = page.node.lookup(PDFName.of('Annots')) || pdfDoc.context.obj([]);
  // @ts-ignore
  annots.push(linkAnnot);
  // @ts-ignore
  page.node.set(PDFName.of('Annots'), annots);

  const pdfBytes = await pdfDoc.save();
  const base64String = uint8ToBase64(pdfBytes);
  const fileName = `${childName}_goals_report_${duration.replace(/\s/g, '_').toLowerCase()}.pdf`;
  const fileUri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(fileUri, base64String, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

// QuickChart.io Heatmap-style Bar Chart (stacked bar)
function getTimeOfDayHeatmapUrl(matrix: number[][], timeLabels: string[], dayLabels: string[], colors: string[]) {
  // Each day is a dataset (stacked bars for each time)
  const datasets = dayLabels.map((day, i) => ({
    label: day,
    data: matrix[i],
    backgroundColor: colors[i % colors.length],
    stack: 'day',
    borderWidth: 1
  }));
  const chartConfig = {
    type: 'bar',
    data: {
      labels: timeLabels,
      datasets
    },
    options: {
      // indexAxis: 'x',
        legend: { position: 'right' },
        title: { display: true, text: 'Log Distribution by Time of Day (Heatmap)' },
      responsive: true,
      scales: {
        xAxes: [{ stacked: true, title: { display: true, text: 'Time of Day' } }],
        yAxes: [{
          ticks: {
            stepSize: 1
          }
        }]
      }
    }
  };
  // Log config for debug
  console.log('Heatmap chartConfig:', JSON.stringify(chartConfig, null, 2));
  const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
  console.log('Heatmap chart URL:', url);
  return url;
}

// QuickChart.io Matrix Heatmap Chart (using matrix plugin)
function getTimeOfDayMatrixHeatmapUrl(matrix: number[][], timeLabels: string[], dayLabels: string[]) {
  // Flatten matrix to array of {x, y, v}
  const data = [];
  for (let y = 0; y < dayLabels.length; y++) {
    for (let x = 0; x < timeLabels.length; x++) {
      data.push({ x, y, v: matrix[y][x] });
    }
  }
  const chartConfig = {
    type: 'matrix',
    data: {
      datasets: [{
        label: 'Log Count',
        data,
        width: ({chart}: {chart: any}) => (chart.chartArea || {}).width / timeLabels.length - 2,
        height: ({chart}: {chart: any}) => (chart.chartArea || {}).height / dayLabels.length - 2,
        backgroundColor: function(ctx: any) {
          const value = ctx.dataset.data[ctx.dataIndex].v;
          if (value === 0) return '#f0f0f0';
          // Color scale: light to dark red
          const alpha = Math.min(0.15 + value * 0.15, 1);
          return `rgba(255, 80, 80, ${alpha})`;
        },
        borderWidth: 1,
        borderColor: '#fff',
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Log Distribution Heatmap' },
        tooltip: {
          callbacks: {
            title: function(ctx: any) {
              const d = ctx[0].raw;
              return `${dayLabels[d.y]}, ${timeLabels[d.x]}`;
            },
            label: function(ctx: any) {
              return `Logs: ${ctx.raw.v}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          labels: timeLabels,
          title: { display: true, text: 'Time of Day' },
          offset: true,
          grid: { display: false }
        },
        y: {
          type: 'category',
          labels: dayLabels,
          title: { display: true, text: 'Day of Week' },
          offset: true,
          reverse: false,
          grid: { display: false }
        }
      },
    },
    plugins: ['matrix']
  };
  // Log config for debug
  console.log('Matrix heatmap chartConfig:', JSON.stringify(chartConfig, null, 2));
  // Add plugins=matrix to the URL
  const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&plugins=matrix`;
  console.log('Matrix heatmap chart URL:', url);
  return url;
}

// QuickChart.io Horizontal Stacked Bar Chart (simulated heatmap)
function getTimeOfDayHorizontalStackedBarUrl(matrix: number[][], timeLabels: string[], dayLabels: string[], colors: string[]) {
  // Each time of day is a dataset (one color per time)
  const datasets = timeLabels.map((time, i) => ({
    label: time,
    data: dayLabels.map((_, dayIdx) => matrix[dayIdx][i]),
    backgroundColor: colors[i % colors.length],
    stack: 'time',
    borderWidth: 1
  }));
  const maxCount = Math.max(...matrix.map(row => Math.max(...row)));
  const axisMax = Math.max(2, maxCount); // Force at least 2 to avoid 0.5 steps
  const chartConfig = {
    type: 'bar',
    data: {
      labels: dayLabels,
      datasets
    },
    options: {
      indexAxis: 'y',
      // plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Log Distribution by Day and Time', fontSize: 30 },
      // },
      responsive: true,
      scales: {
        x: {
          type: 'linear',
          stacked: true,
          title: { display: true, text: 'Count' },
          min: 0,
          max: axisMax,
          ticks: {
            stepSize: 1,
            min: 0,
            max: axisMax,
            beginAtZero: true,
            precision: 0
          }
        },
        yAxes: [{
          // type: 'category',
          // stacked: true,
          // title: { display: true, text: 'Day of Week' },
          // labels: dayLabels,
          ticks: {
            stepSize: 1
          }
        }]
      }
    }
  };
  // Log config for debug
  // console.log('Horizontal stacked bar chartConfig:', JSON.stringify(chartConfig, null, 2));
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

// --- Helper to fetch chart image as base64 ---
async function fetchChartImageBase64(url: string): Promise<string> {
  // Add quality parameter to reduce image size for faster loading
  const optimizedUrl = url.includes('?') ? `${url}&quality=85` : `${url}?quality=85`;
  const response = await fetch(optimizedUrl);
  const blob = await response.blob();
  // Read as base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// PDF generation using pdf-lib
async function generatePDF(logs: Log[], childName: string, duration: string): Promise<string> {
  // --- Chart color palette (editable) ---
  const chartColors = [
    '#5B9AA0', '#F6C85F', '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1', '#955251', '#B565A7', '#009B77'
  ];
  const moodColors = { before: '#FFA500', after: '#FF0000' };
  const barColor = '#5B9AA0';
  const scatterColor = '#FF6F61';

  // Helper to get date range for the selected duration
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfRollingWeek = new Date(today);
    startOfRollingWeek.setDate(today.getDate() - 6);

    const formatDate = (date: Date) => {
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    switch (duration) {
      case 'Today':
        return formatDate(today);
      case 'Yesterday':
        return formatDate(yesterday);
      case 'This Week':
        return `${formatDate(startOfRollingWeek)} to ${formatDate(today)}`;
      default:
        return duration;
    }
  };

  const dateRange = getDateRange();

  // --- Separate logs by sentiment ---
  const negativeLogs = logs.filter(log => log.responses?.whatDidTheyDo?.sentiment === 'negative');
  const positiveLogs = logs.filter(log => log.responses?.whatDidTheyDo?.sentiment === 'positive');

  function getUniquePositiveAntecedents(logs: Log[]) {
    const set = new Set<string>();
    logs.forEach(log => {
      const answers = log.responses?.whatHappenedBefore?.answers || [];
      answers.forEach((a: any) => {
        if (a.answer !== 'Other' && ALL_POSITIVE_ANTECEDENT_LABELS.includes(a.answer)) {
          set.add(a.answer);
        }
      });
    });
    return Array.from(set);
  }
  // --- Create PDF ---
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper to wrap text for captions
  function wrapCaption(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Helper to create a page with charts
  async function createPage(logs: Log[], pageTitle: string, behaviorType: 'negative' | 'positive') {
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    
    let y = height - 40;
    const leftMargin = 20;
    const chartWidth = 260;
    const chartHeight = 140;
    const colGap = 30;

    // Page title
    page.drawText(sanitizePdfText(`${childName}'s ${pageTitle} - ${dateRange}`), {
      x: leftMargin,
      y,
      size: 15,
      font: fontBold,
      color: rgb(0.24, 0.24, 0.42),
    });
    y -= 40;

    // Check if we have data
    if (logs.length === 0) {
      // No data message
      page.drawText(sanitizePdfText(`No ${behaviorType} behavior data available for ${duration.toLowerCase()}.`), {
        x: leftMargin,
        y,
        size: 14,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      return;
    }

    // --- Aggregate data ---
    const who = aggregateWhoWasInvolved(logs);
    const time = aggregateTimeOfDay(logs);
    const mood = aggregateMood(logs);
    const behaviors = aggregateBehaviors(logs);
    let antecedents: Record<string, number> = {};
    if (behaviorType === 'negative') {
      antecedents = aggregateAntecedents(logs, ALL_ANTECEDENT_LABELS);
    } else {
      // For positive, only show those that actually appear in the logs and are in the positive list
      const uniqueAntecedents = getUniquePositiveAntecedents(logs);
      if (uniqueAntecedents.length === 0) {
        antecedents = {}; // No data for chart
      } else {
        antecedents = aggregateAntecedents(logs, uniqueAntecedents);
      }
    }
    const consequences = aggregateConsequences(logs);

      // --- Generate chart images with optimization ---
  const chartImages: { base64?: string, type: string, caption?: string, tableRows?: [string, number][] }[] = [];

  // Calculate time matrix for log distribution chart
  const timeMatrix = aggregateTimeOfDayMatrix(logs);

  // Generate all chart URLs first (faster than sequential fetching)
  const chartUrls = [
    { url: getBarChartUrl('Antecedents', antecedents, barColor), type: 'antecedents', caption: `User-entered or selected reasons that occurred before ${behaviorType} behaviors throughout the week.` },
    { url: getBarChartUrl('What happened', behaviors, barColor, true), type: 'behaviors', caption: `Histogram showing how often each type of ${behaviorType} behavior occurred during the week.` },
    { url: getBarChartUrl('Consequences', consequences, barColor), type: 'consequences', caption: `Responses applied after ${behaviorType} behaviors during the week.` },
    { url: getWhoPieChartUrl(who.participantCounts, chartColors), type: 'who', caption: `Pie chart showing who was involved in ${behaviorType} incidents this week, with most common person combinations listed.` },
    { url: getMoodLineChartUrl(mood.moodByDay, mood.dayLabels, moodColors), type: 'mood', caption: `Average mood tracked over the week for all ${behaviorType} behaviors` },
    { url: getTimeOfDayHorizontalStackedBarUrl(timeMatrix.matrix, ['Morning', 'Afternoon', 'Evening', 'Night'], ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], chartColors), type: 'logdist', caption: `Heatmap of ${behaviorType} behavior logs by time of day across the week.` }
  ];

  // Fetch all chart images in parallel
  const chartPromises = chartUrls.map(async (chart) => {
    const base64 = await fetchChartImageBase64(chart.url);
    return { base64, type: chart.type, caption: chart.caption };
  });

  const chartResults = await Promise.all(chartPromises);
  chartImages.push(...chartResults);

    // 7. Most Common Combinations table (as a special type, not an image)
    const combos = Object.entries(who.comboCounts).map(([combo, count]) => [truncateLabel(combo), count] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    chartImages.push({ type: 'combos', tableRows: combos });

    // --- Draw charts in two columns, snaking order (first 6 items) ---
    for (let i = 0; i < 6; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = leftMargin + col * (chartWidth + colGap);
      const chartY = y - row * (chartHeight + 65);
      if (chartImages[i].base64 != null) {
        // Draw caption at the top left of the chart, with numbering
        if (typeof chartImages[i].caption === 'string') {
          const caption = `${i + 1}. ${chartImages[i].caption}`;
          const fontSize = 10;
          const lines = wrapCaption(caption, font, fontSize, chartWidth);
          let captionY = chartY + 8;
          for (const line of lines) {
            page.drawText(line, {
              x: x,
              y: captionY,
              size: fontSize,
              font,
              color: rgb(0.2, 0.2, 0.2),
            });
            captionY -= fontSize + 2;
          }
          // Move chart image further down to avoid overlap
          const chartYOffset = 8 - (fontSize + 2) * lines.length;
          const img = await pdfDoc.embedPng(chartImages[i].base64 as string);
          page.drawImage(img, {
            x,
            y: chartY - chartHeight + chartYOffset,
            width: chartWidth,
            height: chartHeight,
          });
          continue;
        }
        // Fallback: draw chart image without caption
        const img = await pdfDoc.embedPng(chartImages[i].base64 as string);
        page.drawImage(img, {
          x,
          y: chartY - chartHeight,
          width: chartWidth,
          height: chartHeight,
        });
      }
    }

    // --- Draw Most Common Combinations table below the grid, full width ---
    y -= (Math.ceil(6 / 2) * (chartHeight + 65)) + 10;
    const combosTable = chartImages[6];
    if (combosTable && combosTable.type === 'combos') {
      let tableY = y;
      page.drawText('Most Common Combinations:', {
        x: leftMargin,
        y: tableY,
        size: 13,
        font: fontBold,
        color: rgb(0.24, 0.24, 0.42),
      });
      tableY -= 18;
      // Table headers
      const tableCol1 = leftMargin + 10;
      const tableCol2 = leftMargin + 220;
      const tableHeaderHeight = 10;
      page.drawText('People combination', {
        x: tableCol1,
        y: tableY,
        size: tableHeaderHeight,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.3),
      });
      page.drawText('Frequency', {
        x: tableCol2,
        y: tableY,
        size: tableHeaderHeight,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.3),
      });
      tableY -= 15;
      // Table rows (reduced row height, reduced font size)
      for (const [combo, count] of combosTable.tableRows || []) {
        page.drawText(sanitizePdfText(truncateLabel(combo)), {
          x: tableCol1,
          y: tableY,
          size: 9,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        page.drawText(String(count), {
          x: tableCol2,
          y: tableY,
          size: 9,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        tableY -= 15;
      }
    }

    // --- Add footer with therapist contact and App Store link ---
    const footerY = 40; // Position from bottom of page
    const footerText = "Therapists, to have this report customized, email";
    const therapistEmail = "hello@sarthak.pro";
    const appStoreUrl = "https://apps.apple.com/us/app/glow-logs-that-light-the-way/id6748978131";
    
    // Calculate 50% width constraint for the links
    const maxLinkWidth = width * 0.5;
    const footerRightMargin = 20;
    const footerRightEdge = width - footerRightMargin;
    
    // Helper function to word-wrap URL at natural break points
    function wrapUrl(url: string, maxWidth: number, fontSize: number): string[] {
      const parts = url.split('/');
      const lines: string[] = [];
      let currentLine = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const testLine = currentLine ? currentLine + '/' + part : part;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = part;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    }
    
    // Add Glow logo (small size)
    // try {
    //   const logoAsset = Asset.fromModule(require('../assets/icon.png'));
    //   const logoUri = logoAsset.uri;
    //   const logoBase64 = await FileSystem.readAsStringAsync(logoUri, { encoding: FileSystem.EncodingType.Base64 });
    //   const logoImg = await pdfDoc.embedPng(logoBase64);
      
    //   // Draw logo (small size, positioned to the left of the text)
    //   const logoSize = 16;
    //   const logoX = footerRightEdge - 280; // Position logo to the left of text
    //   const logoY = footerY - 8;
      
    //   page.drawImage(logoImg, {
    //     x: logoX,
    //     y: logoY,
    //     width: logoSize,
    //     height: logoSize,
    //   });
    // } catch (error) {
    //   console.log('Could not load logo for PDF footer:', error);
    // }
    
    // Helper function to wrap text at word boundaries
    function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    }

    // ---------- Footer Layout Helpers ----------
    const footerStartX = 50; // Left margin for footer content
    const logoWidth = 16;
    const logoMargin = 8;
    const availableTextWidth = footerRightEdge - footerStartX - 10; // dynamic available width
    
    // Wrap the footer text (therapist message)
    const wrappedFooterLines = wrapText(footerText, availableTextWidth, 12, fontBold);
    const footerLineHeight = 14;

    wrappedFooterLines.forEach((line, index) => {
      const lineWidth = fontBold.widthOfTextAtSize(line, 7);
      page.drawText(sanitizePdfText(line), {
        x: footerRightEdge - lineWidth, // right-aligned
        y: footerY - (index * footerLineHeight),
        size: 7,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
    });

    // Place therapist email on the next line after wrapped text (also right-aligned)
    const emailY = footerY - (wrappedFooterLines.length * footerLineHeight);
    const emailWidthR = fontBold.widthOfTextAtSize(therapistEmail, 7);
    page.drawText(sanitizePdfText(therapistEmail), {
      x: footerRightEdge - emailWidthR,
      y: emailY,
      size: 7,
      font: fontBold,
      color: rgb(0, 0, 1),
    });
 
    // Draw "See Glow App" hyperlink text and add actual link annotation
    const appLinkText = "See Glow App";
    const appLinkWidth = font.widthOfTextAtSize(appLinkText, 10);
    const appLinkX = footerRightEdge - appLinkWidth; // right aligned
    const appLinkY = emailY - footerLineHeight;

    page.drawText(sanitizePdfText(appLinkText), {
      x: appLinkX,
      y: appLinkY,
      size: 10,
      font: font,
      color: rgb(0, 0, 1),
    });

    // ---------- Hyperlink annotation for "See Glow App" ----------
    // @ts-ignore - low-level annotation creation
    const linkAnnot = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [appLinkX, appLinkY, appLinkX + appLinkWidth, appLinkY + 12],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(appStoreUrl),
      },
    });

    // @ts-ignore - attach annotation to page
    const annots = page.node.lookup(PDFName.of('Annots')) || pdfDoc.context.obj([]);
    // @ts-ignore
    annots.push(linkAnnot);
    // @ts-ignore
    page.node.set(PDFName.of('Annots'), annots);
  }

  // Create both pages
  await createPage(negativeLogs, 'Negative Behavior Log Visualizations', 'negative');
  await createPage(positiveLogs, 'Positive Behavior Log Visualizations', 'positive');

  const pdfBytes = await pdfDoc.save();
  // Convert Uint8Array to base64 (Expo Go compatible)
  const base64String = uint8ToBase64(pdfBytes);
  const fileName = `${childName}_behavior_logs_${duration.replace(/\s/g, '_').toLowerCase()}.pdf`;
  const fileUri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(fileUri, base64String, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

// Function to merge behavior logs PDF and goals PDF
async function mergePDFs(behaviorLogsUri: string, goalsUri: string, childName: string, duration: string): Promise<string> {
  try {
    // Read both PDFs as binary data
    const behaviorLogsBytes = await FileSystem.readAsStringAsync(behaviorLogsUri, { encoding: FileSystem.EncodingType.Base64 });
    const goalsBytes = await FileSystem.readAsStringAsync(goalsUri, { encoding: FileSystem.EncodingType.Base64 });
    
    // Convert base64 to Uint8Array using atob and charCodeAt
    const behaviorLogsArray = atob(behaviorLogsBytes);
    const behaviorLogsUint8 = new Uint8Array(behaviorLogsArray.length);
    for (let i = 0; i < behaviorLogsArray.length; i++) {
      behaviorLogsUint8[i] = behaviorLogsArray.charCodeAt(i);
    }
    
    const goalsArray = atob(goalsBytes);
    const goalsUint8 = new Uint8Array(goalsArray.length);
    for (let i = 0; i < goalsArray.length; i++) {
      goalsUint8[i] = goalsArray.charCodeAt(i);
    }
    
    // Load both PDFs
    const behaviorLogsPdf = await PDFDocument.load(behaviorLogsUint8);
    const goalsPdf = await PDFDocument.load(goalsUint8);
    
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Copy all pages from behavior logs PDF
    const behaviorLogsPages = await mergedPdf.copyPages(behaviorLogsPdf, behaviorLogsPdf.getPageIndices());
    behaviorLogsPages.forEach((page) => mergedPdf.addPage(page));
    
    // Copy all pages from goals PDF
    const goalsPages = await mergedPdf.copyPages(goalsPdf, goalsPdf.getPageIndices());
    goalsPages.forEach((page) => mergedPdf.addPage(page));
    
    // Helper to get date range for filename
    const getDateRangeForFilename = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfRollingWeek = new Date(today);
      startOfRollingWeek.setDate(today.getDate() - 6);

      const formatDate = (date: Date) => {
        return `${date.getMonth() + 1}_${date.getDate()}_${date.getFullYear()}`;
      };

      switch (duration) {
        case 'Today':
          return formatDate(today);
        case 'Yesterday':
          return formatDate(yesterday);
        case 'This Week':
          return `${formatDate(startOfRollingWeek)}_to_${formatDate(today)}`;
        default:
          return duration.replace(/\s/g, '_').toLowerCase();
      }
    };

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const mergedBase64String = uint8ToBase64(mergedPdfBytes);
    const dateRange = getDateRangeForFilename();
    const mergedFileName = `${childName}_complete_report_${dateRange}.pdf`;
    const mergedFileUri = FileSystem.cacheDirectory + mergedFileName;
    await FileSystem.writeAsStringAsync(mergedFileUri, mergedBase64String, { encoding: FileSystem.EncodingType.Base64 });
    
    return mergedFileUri;
  } catch (error) {
    console.error('Error merging PDFs:', error);
    // If merging fails, return the behavior logs PDF as fallback
    return behaviorLogsUri;
  }
}

// Email providers and their deep link info
const EMAIL_APPS = [
  {
    key: 'gmail',
    name: 'Gmail',
    icon: 'logo-google',
    color: '#EA4335',
    getUrl: ({ to, subject, body }: any) =>
      `googlegmail://co?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    canOpen: Platform.OS === 'ios' || Platform.OS === 'android',
  },
  {
    key: 'outlook',
    name: 'Outlook',
    icon: 'logo-microsoft',
    color: '#0072C6',
    getUrl: ({ to, subject, body }: any) =>
      `ms-outlook://compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    canOpen: Platform.OS === 'ios' || Platform.OS === 'android',
  },
  {
    key: 'icloud',
    name: 'iCloud Mail',
    icon: 'cloud-outline',
    color: '#3693F3',
    getUrl: ({ to, subject, body }: any) =>
      `message://?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    canOpen: Platform.OS === 'ios',
  },
  {
    key: 'yahoo',
    name: 'Yahoo',
    icon: 'logo-yahoo',
    color: '#6001D2',
    getUrl: ({ to, subject, body }: any) =>
      `ymail://mail/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    canOpen: Platform.OS === 'ios' || Platform.OS === 'android',
  },
  {
    key: 'other',
    name: 'Other',
    icon: 'mail-outline',
    color: '#3E3E6B',
    getUrl: ({ to, subject, body }: any) =>
      `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    canOpen: true,
  },
];

function getProviderByKey(key: string) {
  return EMAIL_APPS.find(app => app.key === key) || EMAIL_APPS[EMAIL_APPS.length - 1];
}

export default function PastLogsScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [selectedDuration, setSelectedDuration] = useState('This Week');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [logs, setLogs] = useState<Log[]>([]);
  const [sending, setSending] = useState(false);
  const [affirmationModalVisible, setAffirmationModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [setDefault, setSetDefault] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { shareEmail } = useEmailShare();

  var AFFIRMATIONS = [
    "Every step you take helps your child grow.",
    "Remember to take care of yourself, too.",
    "Small wins are still wins!",
    "You’re doing an amazing job.",
    "Thank you for being a caring parent.",
    "Your presence means the world to your child.",
    "It’s okay to not have all the answers.",
    "You are enough, just as you are.",
    "Parenting is hard, and you’re showing up — that matters.",
    "You’re building something beautiful, one moment at a time.",
    "Your love is the greatest gift you give every day.",
    "You’re stronger than you think.",
    "It’s normal to feel overwhelmed — you’re not alone.",
    "Your effort is seen and appreciated.",
    "Even on tough days, your heart shines through.",
  ];
  function shuffleArray(array: string[]) {
    const shuffled = [...array]; // Create a copy to avoid mutating the original
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // swap
    }
    return shuffled;
  }
  AFFIRMATIONS = shuffleArray(AFFIRMATIONS);
  // Reload logs every time the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadLogs();
    }, [])
  );
  // Load default provider on mount
  React.useEffect(() => {
    AsyncStorage.getItem('default_email_provider').then(setDefaultProvider);
  }, []);

  // Helper to open email app
  const openEmailApp = async (providerKey: string, fileUri: string, subject: string, body: string) => {
    const provider = getProviderByKey(providerKey);
    let url = provider.getUrl({
      to: '', // therapist's email if available
      subject,
      body,
    });
    // Attachments are not supported in mailto: or deep links, so we fallback to MailComposer for attachment
    if (providerKey === 'other') {
      // Fallback to MailComposer for attachment
      try {
        await MailComposer.composeAsync({
          subject,
          body,
          recipients: [],
          attachments: [fileUri],
        });
        return true;
      } catch (e) {
        setEmailError('Could not open email composer.');
        return false;
      }
    } else {
      // Try to open the app
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        try {
          await Linking.openURL(url);
          return true;
        } catch (e) {
          setEmailError(`Could not open ${provider.name}.`);
          return false;
        }
      } else {
        setEmailError(`${provider.name} is not installed or cannot be opened.`);
        return false;
      }
    }
  };

  const loadLogs = async () => {
    try {
      // Get the current selected child
      const currentSelectedChildStr = await AsyncStorage.getItem('current_selected_child');
      if (!currentSelectedChildStr) return;
      
      let currentSelectedChild;
      try {
        currentSelectedChild = JSON.parse(currentSelectedChildStr);
      } catch (parseError) {
        console.error('JSON PARSE ERROR in PastLogsScreen - current_selected_child:', parseError);
        console.error('Raw value:', currentSelectedChildStr);
        return;
      }
      
      const childId = currentSelectedChild.id;
      if (!childId) return;
      
      // Get the full children data object
      const allDataStr = await AsyncStorage.getItem(childId);
      if (!allDataStr) return;
      
      let childData;
      try {
        childData = JSON.parse(allDataStr);
      } catch (parseError) {
        console.error('JSON PARSE ERROR in PastLogsScreen - child data:', parseError);
        console.error('Child ID:', childId);
        console.error('Raw value preview:', allDataStr.substring(0, 200));
        return;
      }
      // Get completed logs for this child - both positive and negative
      const positiveLogs = childData.completed_logs?.flow_basic_1_positive || [];
      const negativeLogs = childData.completed_logs?.flow_basic_1_negative || [];
      const allLogs = [...positiveLogs, ...negativeLogs];
      setLogs(allLogs);
      // Process logs for calendar marking
      const marked: MarkedDates = {};
      allLogs.forEach((log: Log) => {
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
    // Rolling 7-day window: today + previous 6 days
    const startOfRollingWeek = new Date(today);
    startOfRollingWeek.setDate(today.getDate() - 6);

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
          return logDay >= startOfRollingWeek && logDay <= today;
        default:
          return false;
      }
    });
  };

  const sendLogs = async () => {
    try {
      setSending(true);
      setAffirmationModalVisible(true);
      const selectedLogs = getLogsForDuration();
      // Get current selected child's name
      const currentSelectedChild = await AsyncStorage.getItem('current_selected_child');
      let childName = 'Child';
      let childId = '';
      if (currentSelectedChild) {
        try {
          const selectedChild = JSON.parse(currentSelectedChild);
          childName = selectedChild.child_name || 'Child';
          childId = selectedChild.id || '';
        } catch (parseError) {
          console.error('JSON PARSE ERROR in sendLogs - current_selected_child:', parseError);
          console.error('Raw value:', currentSelectedChild);
        }
      }
      
      // Generate both PDFs
      const behaviorLogsUri = await generatePDF(selectedLogs, childName, selectedDuration);
      const goalsUri = await generateGoalsPDF(childName, childId, selectedDuration);
      
      // Merge the PDFs
      const mergedFileUri = await mergePDFs(behaviorLogsUri, goalsUri, childName, selectedDuration);
      
      const subject = `${childName}'s Complete Report - ${selectedDuration}`;
      const body = `Attached is the complete report for ${childName} from ${selectedDuration.toLowerCase()}, including behavior logs and goals tracking.`;
      await shareEmail({ fileUri: mergedFileUri, subject, body });
      setAffirmationModalVisible(false);
      setSending(false);
      // Optionally show a success message here
    } catch (error) {
      setAffirmationModalVisible(false);
      setSending(false);
      setEmailError('Failed to generate and send logs. Please try again.');
      console.error('Error sending logs:', error);
    }
  };

   // Handler for selecting provider
   const handleProviderSelect = async (providerKey: string) => {
    setSelectedProvider(providerKey);
    setEmailError(null);
    setSending(true);
    setAffirmationModalVisible(true);
    try {
      // Get current selected child's name
      const currentSelectedChild = await AsyncStorage.getItem('current_selected_child');
      let childName = 'Child';
      let childId = '';
      if (currentSelectedChild) {
        try {
          const selectedChild = JSON.parse(currentSelectedChild);
          childName = selectedChild.child_name || 'Child';
          childId = selectedChild.id || '';
        } catch (parseError) {
          console.error('JSON PARSE ERROR in handleProviderSelect - current_selected_child:', parseError);
          console.error('Raw value:', currentSelectedChild);
        }
      }
      const selectedLogs = getLogsForDuration();
      
      // Generate both PDFs
      const behaviorLogsUri = await generatePDF(selectedLogs, childName, selectedDuration);
      const goalsUri = await generateGoalsPDF(childName, childId, selectedDuration);
      
      // Merge the PDFs
      const mergedFileUri = await mergePDFs(behaviorLogsUri, goalsUri, childName, selectedDuration);
      
      const subject = `${childName}'s Complete Report - ${selectedDuration}`;
      const body = `Attached is the complete report for ${childName} from ${selectedDuration.toLowerCase()}, including behavior logs and goals tracking.`;
      const ok = await openEmailApp(providerKey, mergedFileUri, subject, body);
      if (ok) {
        setEmailModalVisible(false);
        if (setDefault) {
          await AsyncStorage.setItem('default_email_provider', providerKey);
          setDefaultProvider(providerKey);
        }
      }
    } catch (error) {
      setEmailError('Failed to generate and send logs. Please try again.');
      console.error('Error sending logs:', error);
    } finally {
      setAffirmationModalVisible(false);
      setSending(false);
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
    <SafeAreaView style={[styles.container, { paddingBottom: 125 + insets.bottom }]}>
      <AffirmationModal
        visible={affirmationModalVisible}
        affirmations={AFFIRMATIONS}
        onRequestClose={() => {
          setAffirmationModalVisible(false);
          setSending(false);
        }}
      />
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
        style={[styles.sendButton, sending && { opacity: 0.6 }]}
        onPress={sendLogs}
        disabled={sending}
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
      <Modal
        visible={emailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEmailModalVisible(false)}
        >
          <View style={styles.emailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Email App</Text>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            {EMAIL_APPS.filter(app => app.canOpen).map(app => (
              <TouchableOpacity
                key={app.key}
                style={styles.providerOption}
                onPress={() => handleProviderSelect(app.key)}
              >
                <Ionicons name={app.icon as any} size={28} color={app.color} style={{ marginRight: 16 }} />
                <Text style={styles.providerName}>{app.name}</Text>
                {defaultProvider === app.key && (
                  <Ionicons name="star" size={20} color="#FFD700" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            ))}
            <View style={styles.setDefaultRow}>
              <Text style={styles.setDefaultText}>Set as default</Text>
              <Switch
                value={setDefault}
                onValueChange={setSetDefault}
                thumbColor={setDefault ? '#4CAF50' : '#ccc'}
                trackColor={{ false: '#ccc', true: '#A5D6A7' }}
              />
            </View>
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  durationPicker: {
    marginTop: screenHeight < 700 ? 15 : 25, // Less top margin on smaller screens
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
    marginBottom: screenHeight < 700 ? 0 : 10,
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
    // Make calendar height responsive to screen size
    height: screenHeight < 700 ? 490 : 490, // Even smaller height for iPhone SE and similar devices
  },
  dayContainer: {
    width: screenHeight < 700 ? 44 : 52, // Smaller day containers on smaller screens
    height: screenHeight < 700 ? 44 : 52,
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
    fontSize: screenHeight < 700 ? 16 : 18, // Smaller text on smaller screens
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
    bottom: screenHeight < 700 ? 2 : 4, // Adjust position for smaller screens
    right: screenHeight < 700 ? 2 : 4,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 1,
    minWidth: screenHeight < 700 ? 14 : 16, // Smaller badge on smaller screens
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: screenHeight < 700 ? 10 : 12, // Smaller text on smaller screens
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
  emailModalContent: {
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
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  providerName: {
    fontSize: 18,
    color: '#3E3E6B',
    fontWeight: '500',
  },
  setDefaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  setDefaultText: {
    fontSize: 16,
    color: '#3E3E6B',
  },
  errorText: {
    color: '#EA4335',
    marginTop: 10,
    fontSize: 15,
    textAlign: 'center',
  },
});