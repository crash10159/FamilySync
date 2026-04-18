import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) { Alert.alert('Missing Info', 'Please fill in all fields.'); return; }
    if (password !== confirmPassword) { Alert.alert('Password Mismatch', 'Passwords do not match.'); return; }
    if (password.length < 6) { Alert.alert('Weak Password', 'At least 6 characters.'); return; }
    setLoading(true);
    try {
      const uc = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const { uid } = uc.user;
      await updateProfile(uc.user, { displayName: name.trim() });
      const code = generateCode();
      const fRef = await addDoc(collection(db, 'families'), { name: name.trim() + "'s Family", createdBy: uid, members: [uid], inviteCode: code, createdAt: serverTimestamp() });
      await setDoc(doc(db, 'users', uid), { uid, name: name.trim(), email: email.trim(), familyId: fRef.id, inviteCode: code, createdAt: serverTimestamp() });
    } catch (error) {
      let msg = 'Something went wrong.';
      if (error.code === 'auth/email-already-in-use') msg = 'Email already registered.';
      else if (error.code === 'auth/invalid-email') msg = 'Invalid email.';
      else if (error.code === 'auth/weak-password') msg = 'Password too weak.';
      Alert.alert('Signup Failed', msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps='handled'>
        <View style={s.header}>
          <Text style={s.title}>FamilySync</Text>
          <Text style={s.subtitle}>Create your account</Text>
        </View>
        <View style={s.form}>
          <Text style={s.label}>Full Name</Text>
          <TextInput style={s.input} placeholder='Jane Smith' placeholderTextColor='#aaa' value={name} onChangeText={setName} editable={!loading} />
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder='you@example.com' placeholderTextColor='#aaa' value={email} onChangeText={setEmail} autoCapitalize='none' keyboardType='email-address' editable={!loading} />
          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} placeholder='At least 6 characters' placeholderTextColor='#aaa' value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
          <Text style={s.label}>Confirm Password</Text>
          <TextInput style={s.input} placeholder='Repeat your password' placeholderTextColor='#aaa' value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={!loading} />
          <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color='#fff' /> : <Text style={s.buttonText}>Create Account</Text>}
          </TouchableOpacity>
        </View>
        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text style={s.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 36 },
  title: { fontSize: 34, fontWeight: 'bold', color: '#007AFF', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#666' },
  form: { marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, backgroundColor: '#f9f9f9', color: '#222' },
  button: { backgroundColor: '#007AFF', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 6 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#666', fontSize: 14 },
  linkText: { color: '#007AFF', fontSize: 14, fontWeight: '700' },
});
