import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import Ionicons from '@expo/vector-icons/Ionicons';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const COLORS = ['#007AFF','#FF3B30','#34C759','#FF9500','#AF52DE','#00C7BE'];

export default function CalendarScreen() {
  const [events, setEvents] = useState([]);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventColor, setEventColor] = useState(COLORS[0]);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'events'), where('members','array-contains',uid));
    return onSnapshot(q, snap => setEvents(snap.docs.map(d => ({id:d.id,...d.data()}))));
  }, [uid]);

  const toStr = (y,m,d) => y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  const todayStr = toStr(today.getFullYear(),today.getMonth(),today.getDate());
  const daysInMonth = new Date(year,month+1,0).getDate();
  const firstDay = new Date(year,month,1).getDay();
  const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const eventsForDate = (d) => events.filter(e=>e.date===d);

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const handleAdd = async () => {
    if (!eventTitle.trim()) { Alert.alert('Missing','Enter event title'); return; }
    try {
      await addDoc(collection(db,'events'), { title:eventTitle.trim(), date:selected, color:eventColor, createdBy:uid, members:[uid], createdAt:serverTimestamp() });
      setModal(false); setEventTitle('');
    } catch(e) { Alert.alert('Error',e.message); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete','Remove this event?',[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:async()=>{ try{await deleteDoc(doc(db,'events',id));}catch(e){Alert.alert('Error',e.message);} }}
    ]);
  };

  const selEvents = selected ? eventsForDate(selected) : [];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth}><Ionicons name='chevron-back' size={24} color='#007AFF' /></TouchableOpacity>
        <Text style={s.monthTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth}><Ionicons name='chevron-forward' size={24} color='#007AFF' /></TouchableOpacity>
      </View>
      <View style={s.dayLabels}>{DAYS.map(d=><Text key={d} style={s.dayLabel}>{d}</Text>)}</View>
      <View style={s.grid}>
        {cells.map((day,i) => {
          if (!day) return <View key={'e'+i} style={s.cell} />;
          const ds = toStr(year,month,day);
          const isToday = ds===todayStr;
          const isSel = ds===selected;
          const dots = eventsForDate(ds);
          return (
            <TouchableOpacity key={ds} style={[s.cell,isToday&&s.todayCell,isSel&&s.selCell]} onPress={()=>setSelected(ds)}>
              <Text style={[s.dayText,isToday&&s.todayText,isSel&&s.selText]}>{day}</Text>
              <View style={s.dotRow}>{dots.slice(0,3).map((e,j)=><View key={j} style={[s.dot,{backgroundColor:e.color}]} />)}</View>
            </TouchableOpacity>
          );
        })}
      </View>
      {selected && (
        <View style={s.evSection}>
          <View style={s.evHeader}>
            <Text style={s.evTitle}>{new Date(selected+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</Text>
            <TouchableOpacity style={s.addBtn} onPress={()=>setModal(true)}><Ionicons name='add' size={20} color='#fff' /></TouchableOpacity>
          </View>
          <FlatList data={selEvents} keyExtractor={i=>i.id}
            renderItem={({item})=>(
              <View style={[s.evCard,{borderLeftColor:item.color}]}>
                <Text style={s.evName}>{item.title}</Text>
                <TouchableOpacity onPress={()=>handleDelete(item.id)}><Ionicons name='trash-outline' size={18} color='#FF3B30' /></TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={s.noEv}>No events. Tap + to add.</Text>}
          />
        </View>
      )}
      <Modal visible={modal} animationType='slide' presentationStyle='formSheet'>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={()=>setModal(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>New Event</Text>
            <TouchableOpacity onPress={handleAdd}><Text style={s.save}>Add</Text></TouchableOpacity>
          </View>
          <TextInput style={s.input} placeholder='Event title' placeholderTextColor='#aaa' value={eventTitle} onChangeText={setEventTitle} />
          <View style={s.colorRow}>{COLORS.map(c=>(<TouchableOpacity key={c} style={[s.colorDot,{backgroundColor:c},eventColor===c&&s.colorSel]} onPress={()=>setEventColor(c)} />))}</View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f2f2f7'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:16,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#eee'},
  monthTitle:{fontSize:18,fontWeight:'700',color:'#222'},
  dayLabels:{flexDirection:'row',backgroundColor:'#fff',paddingHorizontal:8,paddingBottom:8},
  dayLabel:{flex:1,textAlign:'center',fontSize:12,fontWeight:'600',color:'#999'},
  grid:{flexDirection:'row',flexWrap:'wrap',backgroundColor:'#fff',paddingHorizontal:4,paddingBottom:8},
  cell:{width:'14.28%',alignItems:'center',paddingVertical:6,borderRadius:8},
  todayCell:{backgroundColor:'#E8F0FF'},
  selCell:{backgroundColor:'#007AFF'},
  dayText:{fontSize:14,color:'#222'},
  todayText:{color:'#007AFF',fontWeight:'700'},
  selText:{color:'#fff',fontWeight:'700'},
  dotRow:{flexDirection:'row',gap:2,marginTop:2},
  dot:{width:5,height:5,borderRadius:2.5},
  evSection:{flex:1,padding:16},
  evHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  evTitle:{fontSize:15,fontWeight:'600',color:'#444',flex:1},
  addBtn:{backgroundColor:'#007AFF',width:32,height:32,borderRadius:16,justifyContent:'center',alignItems:'center'},
  evCard:{backgroundColor:'#fff',borderRadius:10,padding:12,marginBottom:8,flexDirection:'row',alignItems:'center',borderLeftWidth:4,elevation:2},
  evName:{fontSize:15,fontWeight:'600',color:'#222',flex:1},
  noEv:{color:'#aaa',fontSize:14,textAlign:'center',marginTop:20},
  modal:{flex:1,backgroundColor:'#fff',padding:16},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:8,marginBottom:24},
  modalTitle:{fontSize:17,fontWeight:'600',color:'#222'},
  cancel:{fontSize:16,color:'#666'},
  save:{fontSize:16,color:'#007AFF',fontWeight:'700'},
  input:{borderWidth:1,borderColor:'#ddd',borderRadius:10,padding:12,fontSize:15,color:'#222',backgroundColor:'#f9f9f9',marginBottom:16},
  colorRow:{flexDirection:'row',gap:12,marginTop:4},
  colorDot:{width:32,height:32,borderRadius:16},
  colorSel:{borderWidth:3,borderColor:'#222'},
});