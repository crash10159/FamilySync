import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import Ionicons from '@expo/vector-icons/Ionicons';

const TAGS = ['personal','family','work','important','idea'];
const TAG_COLORS = { personal:'#FF9500', family:'#007AFF', work:'#34C759', important:'#FF3B30', idea:'#AF52DE' };

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [familyId, setFamilyId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('personal');
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then(snap => { if (snap.exists()) setFamilyId(snap.data().familyId); });
  }, [uid]);

  useEffect(() => {
    if (!familyId) return;
    const q = query(collection(db, 'notes'), where('familyId', '==', familyId));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotes(data.sort((a,b) => (b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0)));
    });
  }, [familyId]);

  const openNew = () => { setEditingNote(null); setTitle(''); setBody(''); setTag('personal'); setModalVisible(true); };
  const openEdit = (note) => { setEditingNote(note); setTitle(note.title); setBody(note.body||''); setTag(note.tag||'personal'); setModalVisible(true); };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Missing Title', 'Please add a title.'); return; }
    try {
      if (editingNote) {
        await updateDoc(doc(db, 'notes', editingNote.id), { title: title.trim(), body: body.trim(), tag, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'notes'), { title: title.trim(), body: body.trim(), tag, createdBy: uid, familyId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      setModalVisible(false);
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteDoc(doc(db, 'notes', id)); } catch(e) { Alert.alert('Error',e.message); } } }
    ]);
  };

  return (
    <View style={s.container}>
      <FlatList data={notes} keyExtractor={i=>i.id} numColumns={2} columnWrapperStyle={{gap:10}} contentContainerStyle={{gap:10}}
        renderItem={({item}) => (
          <TouchableOpacity style={s.card} onPress={()=>openEdit(item)}>
            <View style={[s.dot,{backgroundColor:TAG_COLORS[item.tag]||'#999'}]} />
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            {item.body ? <Text style={s.cardBody} numberOfLines={3}>{item.body}</Text> : null}
            <TouchableOpacity onPress={()=>handleDelete(item.id)} style={s.delBtn}>
              <Ionicons name='trash-outline' size={16} color='#FF3B30' />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={s.empty}><Ionicons name='document-text-outline' size={48} color='#ddd' /><Text style={s.emptyText}>No notes yet. Tap + to create one.</Text></View>}
      />
      <TouchableOpacity style={s.fab} onPress={openNew}><Ionicons name='add' size={28} color='#fff' /></TouchableOpacity>
      <Modal visible={modalVisible} animationType='slide' presentationStyle='pageSheet'>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={()=>setModalVisible(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{editingNote ? 'Edit Note' : 'New Note'}</Text>
            <TouchableOpacity onPress={handleSave}><Text style={s.save}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView>
            <TextInput style={s.titleInput} placeholder='Title' placeholderTextColor='#aaa' value={title} onChangeText={setTitle} />
            <View style={s.tagRow}>
              {TAGS.map(t => (
                <TouchableOpacity key={t} style={[s.tagChip,{backgroundColor:TAG_COLORS[t]},tag===t&&s.tagSel]} onPress={()=>setTag(t)}>
                  <Text style={s.tagText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.bodyInput} placeholder='Write your note here...' placeholderTextColor='#aaa' value={body} onChangeText={setBody} multiline textAlignVertical='top' />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f2f2f7',padding:16},
  card:{flex:1,backgroundColor:'#fff',borderRadius:12,padding:14,minHeight:120},
  dot:{width:8,height:8,borderRadius:4,marginBottom:8},
  cardTitle:{fontSize:15,fontWeight:'700',color:'#222',marginBottom:6},
  cardBody:{fontSize:13,color:'#666',lineHeight:18},
  delBtn:{marginTop:10,alignSelf:'flex-end'},
  empty:{alignItems:'center',marginTop:80,gap:12},
  emptyText:{color:'#aaa',fontSize:15,textAlign:'center'},
  fab:{position:'absolute',bottom:24,right:24,backgroundColor:'#007AFF',width:56,height:56,borderRadius:28,justifyContent:'center',alignItems:'center',elevation:6},
  modal:{flex:1,backgroundColor:'#fff',padding:16},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:8,marginBottom:20},
  modalTitle:{fontSize:17,fontWeight:'600',color:'#222'},
  cancel:{fontSize:16,color:'#666'},
  save:{fontSize:16,color:'#007AFF',fontWeight:'700'},
  titleInput:{fontSize:22,fontWeight:'700',color:'#222',marginBottom:16,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#eee'},
  tagRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16},
  tagChip:{paddingHorizontal:12,paddingVertical:5,borderRadius:20,opacity:0.5},
  tagSel:{opacity:1},
  tagText:{color:'#fff',fontSize:12,fontWeight:'600'},
  bodyInput:{fontSize:16,color:'#333',lineHeight:24,minHeight:300},
});
