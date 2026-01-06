// ============================================
// screens/ReportScreen.js
// ============================================

import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db, storage } from '../firebase.config';
import { GOOD_DEEDS, TRIGGERS } from '../utils/constants';
import { getWeekNumber } from '../utils/helpers';

export default function ReportScreen({ route, navigation }) {
  const { type } = route.params;
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [partnerId, setPartnerId] = useState(null);

  useEffect(() => {
    loadUserData();
    setItems(type === 'trigger' ? TRIGGERS : GOOD_DEEDS);
  }, []);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setIsPremium(data.isPremium || false);
        setPartnerId(data.partnerId);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const pickImage = async () => {
    if (!isPremium) {
      Alert.alert('Premium Feature', 'Upgrade to premium to add photos to your reports!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `reports/${auth.currentUser.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const submitReport = async (item) => {
    if (!partnerId && type === 'trigger') {
      Alert.alert('Error', 'You need to link with a partner first!');
      return;
    }

    setLoading(true);

    try {
      let photoUrl = null;
      if (photo && isPremium) {
        photoUrl = await uploadPhoto(photo);
      }

      const currentWeek = getWeekNumber(new Date());
      const reportData = {
        userId: auth.currentUser.uid,
        partnerId: type === 'trigger' ? partnerId : auth.currentUser.uid,
        type: type,
        itemId: item.id,
        itemName: item.name,
        points: item.points,
        photoUrl: photoUrl,
        notes: isPremium ? notes : '',
        timestamp: new Date(),
        weekNumber: currentWeek,
        year: new Date().getFullYear(),
      };

      await addDoc(collection(db, 'reports'), reportData);

      if (type === 'trigger') {
        await updateDoc(doc(db, 'users', partnerId), {
          currentWeekScore: increment(item.points)
        });
      } else {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          currentWeekScore: increment(item.points)
        });
      }

      const message = type === 'trigger' 
        ? `Your partner lost ${Math.abs(item.points)} points for: ${item.name}`
        : `You gained ${item.points} points for: ${item.name}`;

      Alert.alert('Success!', message, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item) => {
    if (!isPremium || (!notes && !photo)) {
      Alert.alert(
        'Confirm Report',
        `Report: ${item.name} (${item.points > 0 ? '+' : ''}${item.points} points)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => submitReport(item) }
        ]
      );
    } else {
      setSelectedItem(item);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Submitting...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {isPremium && (
          <View style={styles.premiumSection}>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoIcon}>📸</Text>
                  <Text style={styles.photoText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.notesInput}
              placeholder="Add notes (optional)..."
              placeholderTextColor="#888"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        <View style={styles.itemsContainer}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemCard}
              onPress={() => handleItemPress(item)}
            >
              <View style={styles.itemContent}>
                {item.emoji && <Text style={styles.itemEmoji}>{item.emoji}</Text>}
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Text style={[
                styles.itemPoints,
                item.points > 0 ? styles.pointsPositive : styles.pointsNegative
              ]}>
                {item.points > 0 ? '+' : ''}{item.points}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!isPremium && (
          <View style={styles.upsellCard}>
            <Text style={styles.upsellTitle}>⭐ Upgrade to Premium ⭐</Text>
            <Text style={styles.upsellText}>
              Add custom {type === 'trigger' ? 'triggers' : 'deeds'}, photos, and notes!
            </Text>
            <TouchableOpacity
              style={styles.upsellButton}
              onPress={() => navigation.navigate('Premium')}
            >
              <Text style={styles.upsellButtonText}>Upgrade Now - $5</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {selectedItem && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => submitReport(selectedItem)}
          >
            <Text style={styles.submitButtonText}>
              Submit: {selectedItem.name} ({selectedItem.points > 0 ? '+' : ''}{selectedItem.points})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  premiumSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  photoButton: {
    backgroundColor: '#16213e',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#00d9ff',
    borderStyle: 'dashed',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  photoIcon: {
    fontSize: 40,
    marginBottom: 5,
  },
  photoText: {
    color: '#00d9ff',
    fontSize: 16,
  },
  notesInput: {
    backgroundColor: '#16213e',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333',
  },
  itemsContainer: {
    padding: 20,
  },
  itemCard: {
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  itemPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  pointsPositive: {
    color: '#00ff88',
  },
  pointsNegative: {
    color: '#ff6b6b',
  },
  upsellCard: {
    backgroundColor: '#ffd70030',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffd700',
    alignItems: 'center',
  },
  upsellTitle: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  upsellText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  upsellButton: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upsellButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitContainer: {
    padding: 20,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  submitButton: {
    backgroundColor: '#e94560',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
