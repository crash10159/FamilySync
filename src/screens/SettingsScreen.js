import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Share } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, query, collection, where, getDocs, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function SettingsScreen() {
  const [userData, setUserData] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid;

  useEffect(() => { if (uid) fetchData(); }, [uid]);

  const fetchData = async () => {
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) return;
      const user = userSnap.data();
      setUserData(user);
      if (user.familyId) {
        const famSnap = await getDoc(doc(db, 'families', user.familyId));
        if (famSnap.exists()) {
          const fam = famSnap.data();
          setFamilyData(fam);
          const memberDocs = await Promise.all(fam.members.map(m => getDoc(doc(db, 'users', m))));
          setMembers(memberDocs.filter(d => d.exists()).map(d => d.data()));
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleShare = async () => {
    if (!userData?.inviteCode) return;
    await Share.share({ message: 'Join my family on FamilySync! Code: ' + userData.inviteCode });
  };

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 8) { Alert.alert('Invalid Code', 'Enter a valid 8-character code.'); return; }
    setJoining(true);
    try {
      const q = query(collection(db, 'families'), where('inviteCode', '==', code));
      const snap = await getDocs(q);
      if (snap.empty) { Alert.alert('Not Found', 'No family found with that code.'); return; }
      const famDoc = snap.docs[0];
      if (famDoc.data().members.includes(uid)) { Alert.alert('Already Joined', 'You are already in this family.'); return; }
      await updateDoc(doc(db, 'families', famDoc.id), { members: arrayUnion(uid) });
      await updateDoc(doc(db, 'users', uid), { familyId: famDoc.id });
      setInviteCode('');
      Alert.alert('Joined!', 'You are now connected with this family!');
      fetchData();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setJoining(false); }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) }
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size='large' color='#007AFF' /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Profile</Text>
        <View style={s.card}>
          <View style={s.avatar}><Text style={s.avatarText}>{userData?.name?.charAt(0)?.toUpperCase()||'?'}</Text></View>
          <View>
            <Text style={s.profileName}>{userData?.name}</Text>
            <Text style={s.profileEmail}>{auth.currentUser?.email}</Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Your Family</Text>
        <View style={s.card}>
          <Text style={s.familyName}>{familyData?.name || 'Your Family'}</Text>
          <Text style={s.codeLabel}>Invite Code</Text>
          <View style={s.codeRow}>
            <Text style={s.codeText}>{userData?.inviteCode}</Text>
            <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
              <Ionicons name='share-outline' size={18} color='#fff' />
              <Text style={s.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Family Members ({members.length})</Text>
        <View style={s.card}>
          {members.map((m, i) => (
            <View key={i} style={s.memberRow}>
              <View style={s.memberAvatar}><Text style={s.memberAvatarText}>{m.name?.charAt(0)?.toUpperCase()}</Text></View>
              <View>
                <Text style={s.memberName}>{m.name}{m.uid === uid ? ' (You)' : ''}</Text>
                <Text style={s.memberEmail}>{m.email}</Text>
              </View>
            </View>
          ))}
          {members.length === 0 && <Text style={s.noMembers}>No members yet. Share your code!</Text>}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Join a Family</Text>
        <View style={s.card}>
          <Text style={s.codeLabel}>Enter a family member's invite code</Text>
          <View style={s.joinRow}>
            <TextInput style={s.codeInput} placeholder='Enter code' placeholderTextColor='#aaa' value={inviteCode} onChangeText={setInviteCode} autoCapitalize='characters' maxLength={8} />
            <TouchableOpacity style={[s.joinBtn, joining && { opacity: 0.6 }]} onPress={handleJoin} disabled={joining}>
              {joining ? <ActivityIndicator color='#fff' size='small' /> : <Text style={s.joinBtnText}>Join</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name='log-out-outline' size={20} color='#FF3B30' />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.version}>FamilySync v1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700', color: '#222' },
  profileEmail: { fontSize: 13, color: '#888', marginTop: 2 },
  familyName: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 12 },
  codeLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeText: { fontSize: 26, fontWeight: '800', color: '#222', letterSpacing: 4 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  memberName: { fontSize: 15, fontWeight: '600', color: '#222' },
  memberEmail: { fontSize: 13, color: '#888' },
  noMembers: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  joinRow: { flexDirection: 'row', gap: 10 },
  codeInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, color: '#222', backgroundColor: '#f9f9f9', letterSpacing: 3, fontWeight: '700' },
  joinBtn: { backgroundColor: '#34C759', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 32 },
});
