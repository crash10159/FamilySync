import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'lists'), where('members', 'array-contains', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLists(data);
    });
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!selectedList) return;
    const q = query(collection(db, 'lists', selectedList.id, 'items'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [selectedList]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'lists'), { title: newListName.trim(), createdBy: uid, members: [uid], createdAt: serverTimestamp() });
      setNewListName('');
    } catch (e) { Alert.alert('Error', e.message); } finally { setLoading(false); }
  };

  const handleDeleteList = (listId) => {
    Alert.alert('Delete List', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text
