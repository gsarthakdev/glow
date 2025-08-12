// screens/EmailTestScreen.tsx
import React, { useState, useEffect } from "react";
import { View, Text, Button, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import * as MailComposer from "expo-mail-composer";
import * as Linking from "expo-linking";

export default function EmailTestScreen() {
  const [clients, setClients] = useState<MailComposer.MailClient[]>([]);
  const [isMailAvailable, setIsMailAvailable] = useState(false);

  // Add EMAIL_APPS array with specific URL schemes for each app
  const EMAIL_APPS = [
    {
      key: 'gmail',
      name: 'Gmail',
      icon: 'logo-google',
      color: '#EA4335',
      getUrl: ({ to, subject, body }: any) =>
        `googlegmail://co?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      canOpen: true,
    },
    {
      key: 'outlook',
      name: 'Outlook',
      icon: 'logo-microsoft',
      color: '#0072C6',
      getUrl: ({ to, subject, body }: any) =>
        `ms-outlook://compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      canOpen: true,
    },
    {
      key: 'icloud',
      name: 'iCloud Mail',
      icon: 'cloud-outline',
      color: '#3693F3',
      getUrl: ({ to, subject, body }: any) =>
        `message://?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      canOpen: true,
    },
    {
      key: 'yahoo',
      name: 'Yahoo',
      icon: 'logo-yahoo',
      color: '#6001D2',
      getUrl: ({ to, subject, body }: any) =>
        `ymail://mail/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      canOpen: true,
    },
    {
      key: 'native',
      name: 'Native Mail',
      icon: 'mail',
      color: '#007AFF',
      canOpen: true,
    }
  ];

  useEffect(() => {
    refreshClients();
  }, []);

  async function refreshClients() {
    try {
      const available = await MailComposer.isAvailableAsync();
      setIsMailAvailable(available);

      const list = await MailComposer.getClients();
      console.log('list', list);
      setClients(list);
    } catch (err) {
      console.error("Error fetching mail clients", err);
    }
  }

  async function sendWithNativeMail() {
    try {
      await MailComposer.composeAsync({
        recipients: ["therapist123@gmail.com"],
        subject: "Alex's weekly logs export",
        body: `<a href="https://example.com">View Logs</a>`,
        isHtml: true,
      });
    } catch (err) {
      console.error("Error sending email", err);
    }
  }

  // Enhanced function to open specific email apps
  async function openWithClient(client: MailComposer.MailClient) {
    // For native mail composer
    if (client.label === "Apple Mail" && isMailAvailable) {
      await sendWithNativeMail();
      return;
    }
    
    // For other clients, try their specific URL schemes
    const subject = "Alex's weekly logs export";
    const body = "View Logs: https://glowboard.com/#d=eJztnG1v27oVx7-Klhd7ZfaSlCiSfjP0tuvtxdahaLwV23ARkNShLVQWPT3ECy7y3XckZ7nJEiWuHxKlKxAYssSHQ4r88X8O6fx64hZ5kZ1Mfz3J8fPEFPDvM-szlgKkhBmwJBFeEOOFIowblVDJZJaak8lJaZbwVVkuJyeZaeCTKefQ1eirsMQCOOWCUEVoMqPJlFL8e0Up_QdW0YQbzxmb0XgqNP690lp3z7sS3oVqaZoGOvM_hDJ63c4jmkRdrr6Em89P281zRjfP0SIXlqsC8PFZEeZ1b1YR1mfW1Lk7Y2erUOdNfo72_vOqizDZGZXUSogpkZ5rkkhpiYl9il8TCcxpRmPaVZ4voW7McnW7lZxNeXKjlRXUq1DW0Ne-XpjmbZ7NFnDxNnQ3_tViGXkosYzP-CxamNUKSsj-gDlNWa-hqnvjNteY6l0osAWQRXlZN1Xrusw1Js7rN23ddF3uTVHD5S9945dQNpgJn9d4lV99vW429tB6ASVa9HPzvq_5jk1QRlmOtf3XtEHD_pLPF809hkxupPnjOZR5Od_LXHNlKWQ_gg8V3NeLzrQ1dlGzgMjCwpznoRq0e1bhZd7ljtZYH34UxSPNeO0bqKJVZfIaDtSWvsiHBkRkuhSDrThtzAUmqmDeFqabDvuYFT6b-ufyPBTnkN2xKUSmKKK1qXEEbpIMdy0Yt8Crh3vzw0W0wdTuJi9D-F9D34d1b-RFaKtN-ZEHKHD0DZq7GU_TKJlE_euYRnJnmy67Jl4TRVDlJUOiKGUSkiQZI5olKYmtdZA5EwPoIaKIGadTkX4nyoshyjsomqhuV6tQ7TsTDweIN1CArTo09I1Y5-ULQsRHU3VGjAUQ6faA-KkCfEerKsxx1tZREzJz8bstqcGNBIi1JjpLkRo6RWoAyq7UWxo77mNpsyFqpDPGOzV1NGpcLTjOFMsoayvstshX2A84xLpiRoCPMaLhU2ibvIR-4Pkr7r4kQNxSQfWXLm2IstC9DTM3I2HKA4JishV6bpn8GSm-iMrQbMbS0xBGXhNGHUqCaBVLrhhJUW6QJE0c0UgR4mNqjVOguR90auSM8ylXI4LJ5CXolzEC6FFtMtmTVltOl4P6Psu8wEShiooQOibhctseztBDYekUh3M5HylwfvN5kgMBRzvGudFd7CTh6PMkMTHaKWKUcLFmSiN1hoHD9DRm_4c-zzAz7gQgyrCnzjo0Wx4Ji9xae7cLuoxWBz0vSbYUONsC58kgI64hw-iBKCNjp5iS6BRlmSUJjVOiLU0J9Tzmzhhg2g5RRs9YPOX0W5I1Ww_FI4do9pUET-pt7RrafQapM9IozgOkGXWkVxzczaIqS1RiBdEuNZ2bxYiOXUaUUtQJr6RO0wd4hG4W_656XoKaeQ5pMtqIy-iUhnyaCK2yGXXWc6K8QfWhFBDDNCfWeGlMFlsdJw_MdjFlR4zQvsDZPvnWpMV3SryM5V8cavkXXKYpAwJxlpKEKU505iQBoWRKmecsG4qyMtot_-yIQY_xb9l8CNXodMC350RsCYjJ3aEzruMl2_LkmXdw9jlEguluHVgrYW7uHljTyjMhtCaGU00SLmNiEp8SxaVxmbXaJ3KYOpxOE4Z-x6tYiCNQ50-5-9KhJuBsq75Wf1y392koc4gY622TD02j09x2ww9nb_jS5cgrvLx4pCkfAXG0wI4JSKW2XmwqWx6oYfvi6CdzDpGJzqGypkDELPMyQ3vR1rXZ5kV9COfdqtbPTrM2F1F3brTvTZxHbb-2_bDCWvd8k-OJlUzujoc9WnasozHxzjbdllROMJWplBOmTB_hlURRnRAnJVfgmU04H_KxRLePdEwf62-bQfvj1bStp9HfoegnKA7f2qFrudzv7YzR6XpS4N3YKepqHAmzZlhBhMJwFEQ5gA46HhB-21jmh4jEDFEiVqlhMZWEC-tIIgApkXpDvBQszrS3YjjuKmdMTekRHa-PiwuUb8iJ1_O-aZh3Gn3EhXgkbNjmoO2WrtmWY-wYB1tgI4zy6qvdk--UeG5KqJ03YoaAoLylWgggJrUUgeAcsbGzhHKdWgneghPDodnud0ryiJEYKDwxm4hs9EP0CVbQ9D7fTSXx3pTYgQWW9fi6fVeH_LXuZkNeYvYqrKocvfZoHaqs7p2AKnhT5s19jsOI3LFxkOV9u8PWxrGQ8sYUS0yUhfU4vJnBk_m7HER5FvTsHqgZQo9InBc880RaECSJnSZapopoLag3WmRewBB61Iwheo541PZb8Fiezxv5zoK9f8uz417x8QAgdj76OgQAAK6VtZakpvu5X5woYl3CcHaD98qmxvmhQ2mbXaDkiIfS7pEKZVu3eOs8dD5KHdoyuy9Oe9_J8N9Hp8HlmOvNAocJ4HvF8j6Bb3v1YSHr2ogKpwCsbHNnDGjZxuEZZ_z3K8MhO4imfan0Nq9d2_u4BzPuiQE1spCqPAiffkG76na5NNVFZ1oTGlP8uf-fCExMrvecNnf05Drr5kZ6efkfSFal5g==";
    const to = "therapist123@coolaba.com";
    
    // Try to find a matching app from our EMAIL_APPS
    const matchingApp = EMAIL_APPS.find(app => 
      app.name.toLowerCase().includes(client.label.toLowerCase()) ||
      client.label.toLowerCase().includes(app.name.toLowerCase())
    );
    
    if (matchingApp && matchingApp.key !== 'native' && matchingApp.getUrl) {
      try {
        const url = matchingApp.getUrl({ to, subject, body });
        await Linking.openURL(url);
      } catch (err) {
        console.error(`Error opening ${matchingApp.name}:`, err);
        // Fallback to mailto
        const mailtoURL = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        Linking.openURL(mailtoURL);
      }
    } else {
      // Fallback to mailto for unknown clients
      const mailtoURL = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      Linking.openURL(mailtoURL);
    }
  }

  // Function to open specific email apps directly
  async function openSpecificEmailApp(appKey: string) {
    const subject = "Alex's weekly logs export";
    // const body = "View Logs: https://example.com";
    const body = "View Logs: https://glowboard.com/#d=eJztnG1v27oVx7-Klhd7ZfaSlCiSfjP0tuvtxdahaLwV23ARkNShLVQWPT3ECy7y3XckZ7nJEiWuHxKlKxAYssSHQ4r88X8O6fx64hZ5kZ1Mfz3J8fPEFPDvM-szlgKkhBmwJBFeEOOFIowblVDJZJaak8lJaZbwVVkuJyeZaeCTKefQ1eirsMQCOOWCUEVoMqPJlFL8e0Up_QdW0YQbzxmb0XgqNP690lp3z7sS3oVqaZoGOvM_hDJ63c4jmkRdrr6Em89P281zRjfP0SIXlqsC8PFZEeZ1b1YR1mfW1Lk7Y2erUOdNfo72_vOqizDZGZXUSogpkZ5rkkhpiYl9il8TCcxpRmPaVZ4voW7McnW7lZxNeXKjlRXUq1DW0Ne-XpjmbZ7NFnDxNnQ3_tViGXkosYzP-CxamNUKSsj-gDlNWa-hqnvjNteY6l0osAWQRXlZN1Xrusw1Js7rN23ddF3uTVHD5S9945dQNpgJn9d4lV99vW429tB6ASVa9HPzvq_5jk1QRlmOtf3XtEHD_pLPF809hkxupPnjOZR5Od_LXHNlKWQ_gg8V3NeLzrQ1dlGzgMjCwpznoRq0e1bhZd7ljtZYH34UxSPNeO0bqKJVZfIaDtSWvsiHBkRkuhSDrThtzAUmqmDeFqabDvuYFT6b-ufyPBTnkN2xKUSmKKK1qXEEbpIMdy0Yt8Crh3vzw0W0wdTuJi9D-F9D34d1b-RFaKtN-ZEHKHD0DZq7GU_TKJlE_euYRnJnmy67Jl4TRVDlJUOiKGUSkiQZI5olKYmtdZA5EwPoIaKIGadTkX4nyoshyjsomqhuV6tQ7TsTDweIN1CArTo09I1Y5-ULQsRHU3VGjAUQ6faA-KkCfEerKsxx1tZREzJz8bstqcGNBIi1JjpLkRo6RWoAyq7UWxo77mNpsyFqpDPGOzV1NGpcLTjOFMsoayvstshX2A84xLpiRoCPMaLhU2ibvIR-4Pkr7r4kQNxSQfWXLm2IstC9DTM3I2HKA4JishV6bpn8GSm-iMrQbMbS0xBGXhNGHUqCaBVLrhhJUW6QJE0c0UgR4mNqjVOguR90auSM8ylXI4LJ5CXolzEC6FFtMtmTVltOl4P6Psu8wEShiooQOibhctseztBDYekUh3M5HylwfvN5kgMBRzvGudFd7CTh6PMkMTHaKWKUcLFmSiN1hoHD9DRm_4c-zzAz7gQgyrCnzjo0Wx4Ji9xae7cLuoxWBz0vSbYUONsC58kgI64hw-iBKCNjp5iS6BRlmSUJjVOiLU0J9Tzmzhhg2g5RRs9YPOX0W5I1Ww_FI4do9pUET-pt7RrafQapM9IozgOkGXWkVxzczaIqS1RiBdEuNZ2bxYiOXUaUUtQJr6RO0wd4hG4W_656XoKaeQ5pMtqIy-iUhnyaCK2yGXXWc6K8QfWhFBDDNCfWeGlMFlsdJw_MdjFlR4zQvsDZPvnWpMV3SryM5V8cavkXXKYpAwJxlpKEKU505iQBoWRKmecsG4qyMtot_-yIQY_xb9l8CNXodMC350RsCYjJ3aEzruMl2_LkmXdw9jlEguluHVgrYW7uHljTyjMhtCaGU00SLmNiEp8SxaVxmbXaJ3KYOpxOE4Z-x6tYiCNQ50-5-9KhJuBsq75Wf1y392koc4gY622TD02j09x2ww9nb_jS5cgrvLx4pCkfAXG0wI4JSKW2XmwqWx6oYfvi6CdzDpGJzqGypkDELPMyQ3vR1rXZ5kV9COfdqtbPTrM2F1F3brTvTZxHbb-2_bDCWvd8k-OJlUzujoc9WnasozHxzjbdllROMJWplBOmTB_hlURRnRAnJVfgmU04H_KxRLePdEwf62-bQfvj1bStp9HfoegnKA7f2qFrudzv7YzR6XpS4N3YKepqHAmzZlhBhMJwFEQ5gA46HhB-21jmh4jEDFEiVqlhMZWEC-tIIgApkXpDvBQszrS3YjjuKmdMTekRHa-PiwuUb8iJ1_O-aZh3Gn3EhXgkbNjmoO2WrtmWY-wYB1tgI4zy6qvdk--UeG5KqJ03YoaAoLylWgggJrUUgeAcsbGzhHKdWgneghPDodnud0ryiJEYKDwxm4hs9EP0CVbQ9D7fTSXx3pTYgQWW9fi6fVeH_LXuZkNeYvYqrKocvfZoHaqs7p2AKnhT5s19jsOI3LFxkOV9u8PWxrGQ8sYUS0yUhfU4vJnBk_m7HER5FvTsHqgZQo9InBc880RaECSJnSZapopoLag3WmRewBB61Iwheo541PZb8Fiezxv5zoK9f8uz417x8QAgdj76OgQAAK6VtZakpvu5X5woYl3CcHaD98qmxvmhQ2mbXaDkiIfS7pEKZVu3eOs8dD5KHdoyuy9Oe9_J8N9Hp8HlmOvNAocJ4HvF8j6Bb3v1YSHr2ogKpwCsbHNnDGjZxuEZZ_z3K8MhO4imfan0Nq9d2_u4BzPuiQE1spCqPAiffkG76na5NNVFZ1oTGlP8uf-fCExMrvecNnf05Drr5kZ6efkfSFal5g==";
    const to = "therapist123@coolaba.com";
    
    if (appKey === 'native') {
      await sendWithNativeMail();
      return;
    }
    
    const app = EMAIL_APPS.find(a => a.key === appKey);
    if (app && app.getUrl) {
      try {
        const url = app.getUrl({ to, subject, body });
        await Linking.openURL(url);
      } catch (err) {
        console.error(`Error opening ${app.name}:`, err);
        // Fallback to mailto
        const mailtoURL = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        Linking.openURL(mailtoURL);
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Email Client Test</Text>

      <Button title="Refresh Clients" onPress={refreshClients} />

      {isMailAvailable && (
        <Button title="Send via Native MailComposer" onPress={sendWithNativeMail} />
      )}

      <ScrollView>
        <Text style={styles.sectionTitle}>Available Mail Clients:</Text>
        {clients.map((client, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.clientBtn}
            onPress={() => openWithClient(client)}
          >
            <Text style={styles.clientLabel}>{client.label}</Text>
          </TouchableOpacity>
        ))}
        
        <Text style={styles.sectionTitle}>Open Specific Email Apps:</Text>
        {EMAIL_APPS.map((app) => (
          <TouchableOpacity
            key={app.key}
            style={[styles.clientBtn, { borderLeftWidth: 4, borderLeftColor: app.color }]}
            onPress={() => openSpecificEmailApp(app.key)}
          >
            <Text style={styles.clientLabel}>{app.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  clientBtn: {
    padding: 15,
    backgroundColor: "#eee",
    borderRadius: 6,
    marginVertical: 5,
  },
  clientLabel: { fontSize: 16 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginTop: 20, 
    marginBottom: 10,
    color: '#333'
  },
});
