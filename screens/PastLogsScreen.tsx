import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, SafeAreaView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as MailComposer from 'expo-mail-composer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useFocusEffect } from '@react-navigation/native';
import AffirmationModal from '../components/AffirmationModal';

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

// --- Chart Data Aggregation Helpers ---

// 1. Who Was Involved
function aggregateWhoWasInvolved(logs: Log[]) {
  const participantCounts: Record<string, number> = {};
  const comboCounts: Record<string, number> = {};
  logs.forEach(log => {
    const answers = log.responses?.whoWasInvolved?.answers || [];
    const labels = answers.map((a: any) => a.answer).sort();
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
      if (a.answer === 'Other') return; // Exclude literal 'Other'
      if (behaviorCounts[a.answer] !== undefined) {
        behaviorCounts[a.answer] += 1;
      } else {
        behaviorCounts[a.answer] = 1;
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
    antecedentCounts[label] = 0;
  });
  logs.forEach(log => {
    const answers = log.responses?.whatHappenedBefore?.answers || [];
    answers.forEach((a: any) => {
      if (a.answer === 'Other') return; // Exclude literal 'Other'
      if (antecedentCounts[a.answer] !== undefined) {
        antecedentCounts[a.answer] += 1;
      } else {
        antecedentCounts[a.answer] = 1; // add new custom label
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
      if (consequenceCounts[a.answer] !== undefined) {
        consequenceCounts[a.answer] += 1;
      } else {
        consequenceCounts[a.answer] = 1;
      }
    });
  });
  return consequenceCounts;
}

// --- QuickChart.io Chart URL Generators ---

// 1. Pie Chart for Who Was Involved
function getWhoPieChartUrl(participantCounts: Record<string, number>, colors: string[]) {
  const labels = Object.keys(participantCounts);
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
  const labels = Object.keys(counts);
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
  const response = await fetch(url);
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

  // --- Separate logs by sentiment ---
  const negativeLogs = logs.filter(log => log.responses?.whatDidTheyDo?.sentiment === 'negative');
  const positiveLogs = logs.filter(log => log.responses?.whatDidTheyDo?.sentiment === 'positive');

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
    page.drawText(sanitizePdfText(`${childName}'s ${pageTitle} - ${duration}`), {
      x: leftMargin,
      y,
      size: 18,
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
    const antecedents = aggregateAntecedents(logs, ALL_ANTECEDENT_LABELS);
    const consequences = aggregateConsequences(logs);

    // --- Generate chart images ---
    const chartImages: { base64?: string, type: string, caption?: string, tableRows?: [string, number][] }[] = [];

    // 1. Antecedents Bar
    const antecedentsBarUrl = getBarChartUrl('Antecedents', antecedents, barColor);
    const antecedentsBarBase64 = await fetchChartImageBase64(antecedentsBarUrl);
    chartImages.push({ 
      base64: antecedentsBarBase64, 
      type: 'antecedents', 
      caption: `User-entered or selected reasons that occurred before ${behaviorType} behaviors throughout the week.` 
    });

    // 2. What Was Involved (Behaviors Bar)
    const behaviorsBarUrl = getBarChartUrl('What happened', behaviors, barColor, true);
    const behaviorsBarBase64 = await fetchChartImageBase64(behaviorsBarUrl);
    chartImages.push({ 
      base64: behaviorsBarBase64, 
      type: 'behaviors', 
      caption: `Histogram showing how often each type of ${behaviorType} behavior occurred during the week.` 
    });

    // 3. Consequences Bar
    const consequencesBarUrl = getBarChartUrl('Consequences', consequences, barColor);
    const consequencesBarBase64 = await fetchChartImageBase64(consequencesBarUrl);
    chartImages.push({ 
      base64: consequencesBarBase64, 
      type: 'consequences', 
      caption: `Responses applied after ${behaviorType} behaviors during the week.` 
    });

    // 4. Who Was Involved Pie
    const whoPieUrl = getWhoPieChartUrl(who.participantCounts, chartColors);
    const whoPieBase64 = await fetchChartImageBase64(whoPieUrl);
    chartImages.push({ 
      base64: whoPieBase64, 
      type: 'who', 
      caption: `Pie chart showing who was involved in ${behaviorType} incidents this week, with most common person combinations listed.` 
    });

    // 5. Mood Line
    const moodLineUrl = getMoodLineChartUrl(mood.moodByDay, mood.dayLabels, moodColors);
    const moodLineBase64 = await fetchChartImageBase64(moodLineUrl);
    chartImages.push({ 
      base64: moodLineBase64, 
      type: 'mood', 
      caption: `Average mood tracked over the week for all ${behaviorType} behaviors` 
    });

    // 6. Log Distribution by Day and Time (Horizontal Stacked Bar)
    const timeMatrix = aggregateTimeOfDayMatrix(logs);
    const horizontalStackedUrl = getTimeOfDayHorizontalStackedBarUrl(timeMatrix.matrix, ['Morning', 'Afternoon', 'Evening', 'Night'], ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], chartColors);
    const horizontalStackedBase64 = await fetchChartImageBase64(horizontalStackedUrl);
    chartImages.push({ 
      base64: horizontalStackedBase64, 
      type: 'logdist', 
      caption: `Heatmap of ${behaviorType} behavior logs by time of day across the week.` 
    });

    // 7. Most Common Combinations table (as a special type, not an image)
    const combos = Object.entries(who.comboCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
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
        page.drawText(sanitizePdfText(combo), {
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

export default function PastLogsScreen({ navigation }: { navigation: any }) {
  const [selectedDuration, setSelectedDuration] = useState('This Week');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [logs, setLogs] = useState<Log[]>([]);
  const [sending, setSending] = useState(false);
  const [affirmationModalVisible, setAffirmationModalVisible] = useState(false);

  const AFFIRMATIONS = [
    "Every step you take helps your child grow.",
    "Remember to take care of yourself, too.",
    "Small wins are still wins!",
    "You’re doing an amazing job.",
    "Thank you for being a caring parent.",
  ];

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
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        setAffirmationModalVisible(false);
        setSending(false);
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
      setAffirmationModalVisible(false);
      setSending(false);
      // Optionally show a success message here
    } catch (error) {
      setAffirmationModalVisible(false);
      setSending(false);
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
      <AffirmationModal
        visible={affirmationModalVisible}
        affirmations={AFFIRMATIONS}
        onRequestClose={() => setAffirmationModalVisible(false)}
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