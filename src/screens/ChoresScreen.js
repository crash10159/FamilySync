import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import Ionicons from '@expo/vector-icons/Ionicons';

const FREQS = ['Daily','Weekly','Bi-weekly','Monthly','Once'];
const PRI = {low:'#34C759',medium:'#FF9500',high:'#FF3B30'};

export default function ChoresScreen() {
  const [chores, setChores] = useState([]);
  const [modal, setModal] = useState(false);
  const [choreName, setChoreName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [freq, setFreq] = useState('Weekly');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('all');
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db,'chores'),where('members','array-contains',uid));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      setChores(data.sort((a,b)=>a.done===b.done?0:a.done?1:-1));
    });
  }, [uid]);

  const handleAdd = async () => {
    if (!choreName.trim()) { Alert.alert('Missing','Enter a chore name'); return; }
    try {
      await addDoc(collection(db,'chores'),{name:choreName.trim(),assignedTo:assignedTo.trim()||'Unassigned',frequency:freq,priority,done:false,createdBy:uid,members:[uid],createdAt:serverTimestamp()});
      setChoreName(''); setAssignedTo(''); setFreq('Weekly'); setPriority('medium'); setModal(false);
    } catch(e){Alert.alert('Error',e.message);}
  };

  const handleToggle = async (c) => {
    try { await updateDoc(doc(db,'chores',c.id),{done:!c.done}); }
    catch(e){Alert.alert('Error',e.message);}
  };

  const handleDelete = (id) => {
    Alert.alert('Delete','Remove this chore?',[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:async()=>{try{await deleteDoc(doc(db,'chores',id));}catch(e){Alert.alert('Error',e.message);}}}
    ]);
  };

  const filtered = chores.filter(c => filter==='all'?true:filter==='pending'?!c.done:c.done);
  const pending = chores.filter(c=>!c.done).length;

  return (
    <View style={s.container}>
      <View style={s.stats}>
        <View style={s.stat}><Text style={s.statN}>{chores.length}</Text><Text style={s.statL}>Total</Text></View>
        <View style={s.statD} />
        <View style={s.stat}><Text style={[s.statN,{color:'#FF9500'}]}>{pending}</Text><Text style={s.statL}>Pending</Text></View>
        <View style={s.statD} />
        <View style={s.stat}><Text style={[s.statN,{color:'#34C759'}]}>{chores.length-pending}</Text><Text style={s.statL}>Done</Text></View>
      </View>
      <View style={s.filters}>
        {['all','pending','done'].map(f=>(
          <TouchableOpacity key={f} style={[s.filterTab,filter===f&&s.filterActive]} onPress={()=>setFilter(f)}>
            <Text style={[s.filterText,filter===f&&s.filterTextActive]}>{f.charAt(0).toUpperCase()+f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={filtered} keyExtractor={i=>i.id}
        renderItem={({item})=>(
          <View style={[s.card,item.done&&{opacity:0.6}]}>
            <TouchableOpacity onPress={()=>handleToggle(item)} style={{marginRight:12}}>
              <Ionicons name={item.done?'checkmark-circle':'ellipse-outline'} size={26} color={item.done?'#34C759':'#ccc'} />
            </TouchableOpacity>
            <View style={{flex:1}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4}}>
                <View style={[s.priDot,{backgroundColor:PRI[item.priority]}]} />
                <Text style={[s.choreName,item.done&&{textDecorationLine:'line-through',color:'#aaa'}]}>{item.name}</Text>
              </View>
              <Text style={s.meta}>{item.assignedTo} · {item.frequency}</Text>
            </View>
            <TouchableOpacity onPress={()=>handleDelete(item.id)}><Ionicons name='trash-outline' size={18} color='#FF3B30' /></TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<View style={s.empty}><Ionicons name='checkmark-circle-outline' size={48} color='#ddd' /><Text style={s.emptyText}>No chores yet!</Text></View>}
        contentContainerStyle={{paddingBottom:100}}
      />
      <TouchableOpacity style={s.fab} onPress={()=>setModal(true)}><Ionicons name='add' size={28} color='#fff' /></TouchableOpacity>
      <Modal visible={modal} animationType='slide' presentationStyle='formSheet'>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={()=>setModal(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>New Chore</Text>
            <TouchableOpacity onPress={handleAdd}><Text style={s.save}>Add</Text></TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={s.label}>Chore Name</Text>
            <TextInput style={s.input} placeholder='e.g. Wash dishes' placeholderTextColor='#aaa' value={choreName} onChangeText={setChoreName} />
            <Text style={s.label}>Assigned To</Text>
            <TextInput style={s.input} placeholder='e.g. Mom, Dad...' placeholderTextColor='#aaa' value={assignedTo} onChangeText={setAssignedTo} />
            <Text style={s.label}>Frequency</Text>
            <View style={s.chipRow}>{FREQS.map(f=>(<TouchableOpacity key={f} style={[s.chip,freq===f&&s.chipActive]} onPress={()=>setFreq(f)}><Text style={[s.chipText,freq===f&&{color:'#fff'}]}>{f}</Text></TouchableOpacity>))}</View>
            <Text style={s.label}>Priority</Text>
            <View style={s.chipRow}>{Object.entries(PRI).map(([p,c])=>(<TouchableOpacity key={p} style={[s.chip,{borderColor:c},priority===p&&{backgroundColor:c}]} onPress={()=>setPriority(p)}><Text style={[s.chipText,priority===p&&{color:'#fff'}]}>{p.charAt(0).toUpperCase()+p.slice(1)}</Text></TouchableOpacity>))}</View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f2f2f7'},
  stats:{flexDirection:'row',backgroundColor:'#fff',padding:16,justifyContent:'space-around',borderBottomWidth:1,borderBottomColor:'#eee'},
  stat:{alignItems:'center'},
  statN:{fontSize:22,fontWeight:'700',color:'#222'},
  statL:{fontSize:12,color:'#aaa',marginTop:2},
  statD:{width:1,backgroundColor:'#eee'},
  filters:{flexDirection:'row',backgroundColor:'#fff',paddingHorizontal:16,paddingBottom:12,gap:8},
  filterTab:{flex:1,paddingVertical:7,borderRadius:8,alignItems:'center',backgroundColor:'#f2f2f7'},
  filterActive:{backgroundColor:'#007AFF'},
  filterText:{fontSize:13,fontWeight:'600',color:'#888'},
  filterTextActive:{color:'#fff'},
  card:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',marginHorizontal:16,marginTop:10,borderRadius:12,padding:14,elevation:2},
  priDot:{width:8,height:8,borderRadius:4},
  choreName:{fontSize:15,fontWeight:'600',color:'#222',flex:1},
  meta:{fontSize:12,color:'#aaa'},
  empty:{alignItems:'center',marginTop:80,gap:12},
  emptyText:{color:'#aaa',fontSize:15,textAlign:'center'},
  fab:{position:'absolute',bottom:24,right:24,backgroundColor:'#34C759',width:56,height:56,borderRadius:28,justifyContent:'center',alignItems:'center',elevation:6},
  modal:{flex:1,backgroundColor:'#fff',padding:16},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:8,marginBottom:24},
  modalTitle:{fontSize:17,fontWeight:'600',color:'#222'},
  cancel:{fontSize:16,color:'#666'},
  save:{fontSize:16,color:'#007AFF',fontWeight:'700'},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8,marginTop:8},
  input:{borderWidth:1,borderColor:'#ddd',borderRadius:10,padding:12,fontSize:15,color:'#222',backgroundColor:'#f9f9f9',marginBottom:16},
  chipRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16},
  chip:{paddingHorizontal:14,paddingVertical:7,borderRadius:20,borderWidth:1,borderColor:'#ddd',backgroundColor:'#f9f9f9'},
  chipActive:{backgroundColor:'#007AFF',borderColor:'#007AFF'},
  chipText:{fontSize:13,color:'#666',fontWeight:'500'},
});