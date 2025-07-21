// useEmailShare.ts
// Usage of this hook requires expo-sharing and expo-mail-composer to be installed.
// No special Info.plist or app.json tweaks are required for basic sharing, but if you want to restrict to mail extensions only, you may need to use a custom native module (not possible in Expo Go as of 2024). See Expo docs for updates.

import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { Platform, Alert, Share } from 'react-native';

interface ShareEmailOptions {
  fileUri: string;
  subject: string;
  body: string;
}

export function useEmailShare() {
  async function shareEmail({ fileUri, subject, body }: ShareEmailOptions) {
    // iOS: Prefer expo-sharing (native share sheet)
    if (Platform.OS === 'ios') {
      if (await Sharing.isAvailableAsync()) {
        try {
          // Note: expo-sharing does not support pre-filling subject/body in all mail apps.
          // The 'message' param is used as the body for some apps, but not all.
          // The 'subject' param is not supported by expo-sharing as of 2024, but we pass it for future compatibility.
          await Sharing.shareAsync(fileUri, {
            dialogTitle: subject,
            UTI: 'com.adobe.pdf', // helps iOS recognize as PDF
            mimeType: 'application/pdf',
            // @ts-ignore: message is not in the type but is supported by some apps
            message: body,
            // @ts-ignore: subject is not in the type but may be supported in the future
            subject: subject,
          });
          // Show a reminder after the share sheet
        //   Alert.alert(
        //     'Reminder',
        //     'You may need to add recipients and subject manually in your mail app.'
        //   );
          return;
        } catch (e) {
          // Fallback to MailComposer
        }
      }
      // Fallback: MailComposer
      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject,
          body,
          recipients: [],
          attachments: [fileUri],
        });
        return;
      }
      Alert.alert('Error', 'No compatible mail or share apps found.');
    } else {
      // Android: MailComposer is more reliable for attachments
      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          subject,
          body,
          recipients: [],
          attachments: [fileUri],
        });
        return;
      }
      // Fallback: try generic share
      try {
        await Share.share({
          url: fileUri,
          message: body,
          title: subject,
          // subject: subject, // Not a valid property for ShareContent, so omitted
        });
      } catch (e) {
        Alert.alert('Error', 'No compatible mail or share apps found.');
      }
    }
  }
  return { shareEmail };
}

/*
Example usage:

import { useEmailShare } from '../utils/useEmailShare';

const { shareEmail } = useEmailShare();

<TouchableOpacity onPress={() => shareEmail({
  fileUri: myPdfUri,
  subject: 'Report',
  body: 'See attached.'
})}>
  <Text>Send Report</Text>
</TouchableOpacity>
*/ 