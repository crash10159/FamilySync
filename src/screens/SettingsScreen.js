import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
export default function SettingsScreen() {
  const handleLogout = () => { Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) }]); };
  return <View style={styles.container}><Text style={styles.email}>{auth.currentUser?.email}</Text><TouchableOpacity style={styles.btn} onPress={handleLogout}><Text style={styles.btnText}>Sign Out</Text></TouchableOpacity></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f7', gap: 20 }, email: { fontSize: 16, color: '#666' }, btn: { backgroundColor: '#FF3B30', borderRadius: 10, padding: 14, paddingHorizontal: 30 }, btnText: { color: '#fff', fontWeight: '700', fontSize: 16 } });
