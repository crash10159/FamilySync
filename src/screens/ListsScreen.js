import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ListsScreen() {
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [familyId, setFamilyId] = useState(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then(snap => { if (snap.exists()) setFamilyId(snap.data().familyId); });
  }, [uid]);

  useEffect(() => {
    if (!familyId) return;
    const q = query(collection(db, 'lists'), where('familyId', '==', familyId));
    return onSnapshot(q, snap => setLists(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [familyId]);

  useEffect(() => {
    if (!selectedList) return;
    const q = query(collection(db, 'lists', selectedList.id, 'items'));
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [selectedList]);

  const handleCreateList = async () => {
    if (!newListName.trim() || !familyId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'lists'), { title: newListName.trim(), createdBy: uid, familyId, createdAt: serverTimestamp() });
      setNewListName('');
    } catch (e) { Alert.alert('Error', e.message); }
    setLoading(false);
  };

  const handleDeleteList = async (listId) => {
    Alert.alert('Delete List', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteDoc(doc(db, 'lists', listId)); } catch (e) { Alert.alert('Error', e.message); } } }
    ]);
  };

  const handleAddItem = async () => {
    if (!newItemText.trim() || !selectedList) return;
    try {
      await addDoc(collection(db, 'lists', selectedList.id, 'items'), { text: newItemText.trim(), checked: false, createdBy: uid, createdAt: serverTimestamp() });
      setNewItemText('');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleToggleItem = async (item) => {
    try { await updateDoc(doc(db, 'lists', selectedList.id, 'items', item.id), { checked: !item.checked }); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDeleteItem = async (itemId) => {
    try { await deleteDoc(doc(db, 'lists', selectedList.id, 'items', itemId)); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={s.container}>
      <View style={s.inputRow}>
        <TextInput style={s.input} placeholder='New list name...' placeholderTextColor='#aaa' value={newListName} onChangeText={setNewListName} onSubmitEditing={handleCreateList} returnKeyType='done' />
        <TouchableOpacity style={s.addButton} onPress={handleCreateList} disabled={loading}>
          {loading ? <ActivityIndicator color='#fff' size='small' /> : <Ionicons name='add' size={24} color='#fff' />}
        </TouchableOpacity>
      </View>
      <FlatList data={lists} keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.listItem} onPress={() => { setSelectedList(item); setModalVisible(true); }}>
            <View style={s.listLeft}><Ionicons name='list' size={22} color='#007AFF' /><Text style={s.listTitle}>{item.title}</Text></View>
            <TouchableOpacity onPress={() => handleDeleteList(item.id)}><Ionicons name='trash-outline' size={20} color='#FF3B30' /></TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.emptyText}>No lists yet!</Text>}
      />
      <Modal visible={modalVisible} animationType='slide' presentationStyle='pageSheet'>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{selectedList?.title}</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); setSelectedList(null); }}><Ionicons name='close' size={28} color='#333' /></TouchableOpacity>
          </View>
          <View style={s.inputRow}>
            <TextInput style={s.input} placeholder='Add item...' placeholderTextColor='#aaa' value={newItemText} onChangeText={setNewItemText} onSubmitEditing={handleAddItem} returnKeyType='done' />
            <TouchableOpacity style={s.addButton} onPress={handleAddItem}><Ionicons name='add' size={24} color='#fff' /></TouchableOpacity>
          </View>
          <FlatList data={items} keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={s.itemRow}>
                <TouchableOpacity onPress={() => handleToggleItem(item)} style={s.itemLeft}>
                  <Ionicons name={item.checked ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.checked ? '#34C759' : '#ccc'} />
                  <Text style={[s.itemText, item.checked && s.itemChecked]}>{item.text}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)}><Ionicons name='trash-outline' size={18} color='#FF3B30' /></TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={s.emptyText}>No items yet.</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7', padding: 16 },
  inputRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#fff', fontSize: 15, color: '#222' },
  addButton: { backgroundColor: '#007AFF', borderRadius: 10, width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listTitle: { fontSize: 16, fontWeight: '500', color: '#222' },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 15, marginTop: 40 },
  modal: { flex: 1, backgroundColor: '#f2f2f7', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 8 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemText: { fontSize: 15, color: '#222', flex: 1 },
  itemChecked: { textDecorationLine: 'line-through', color: '#aaa' },
});
