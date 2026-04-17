import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function NotesScreen() {
  return <View style={styles.container}><Text style={styles.text}>Notes Coming Soon</Text></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f7' }, text: { fontSize: 18, color: '#999' } });
