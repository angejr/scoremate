// ============================================
// app/report.tsx - Report Screen
// ============================================

import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
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
import { useAuth } from '../context/AuthContext';
import { auth, db, storage } from '../firebase.config';
import { DeedItem, TriggerItem } from '../types';
import { COLORS, GOOD_DEEDS, TRIGGERS } from '../utils/constants';
import { getWeekNumber } from '../utils/helpers';

export default function ReportScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'trigger' | 'deed' }>();
  const { userData } = useAuth();
  
  const [items, setItems] = useState<(TriggerItem | DeedItem)[]>([]);
  const [selectedItem, setSelectedItem] = useState<TriggerItem | DeedItem | null>(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Combine default items with custom items if premium
    let baseItems = type === 'trigger' ? [...TRIGGERS] : [...GOOD_DEEDS];
    
    if (userData?.isPremium) {
      const customItems = type === 'trigger' 
        ? (userData.customTriggers || [])
        : (userData.customDeeds || []);
      baseItems = [...baseItems, ...customItems];
    }
    
    setItems(baseItems);
  }, [type, userData]);

  const pickImage = async () => {
    if (!userData?.isPremium) {
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

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `reports/${auth.currentUser?.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const submitReport = async (item: TriggerItem | DeedItem) => {
    if (!userData?.partnerId && type === 'trigger') {
      Alert.alert('Error', 'You need to link with a partner first!');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setLoading(true);

    try {
      let photoUrl = null;
      if (photo && userData?.isPremium) {
        photoUrl = await uploadPhoto(photo);
      }

      const currentWeek = getWeekNumber(new Date());
      const reportData = {
        userId: auth.currentUser.uid,
        targetId: type === 'trigger' ? userData?.partnerId : auth.currentUser.uid,
        type: type,
        itemId: item.id,
        itemName: item.name,
        points: item.points,
        photoUrl: photoUrl,
        notes: userData?.isPremium ? notes : '',
        timestamp: new Date(),
        weekNumber: currentWeek,
        year: new Date().getFullYear(),
        isCustom: item.isCustom || false,
      };

      await addDoc(collection(db, 'reports'), reportData);

      const message = type === 'trigger' 
        ? `Your partner lost ${Math.abs(item.points)} points for: ${item.name}`
        : `You gained ${item.points} points for: ${item.name}`;

      Alert.alert('Success!', message, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: TriggerItem | DeedItem) => {
    if (!userData?.isPremium || (!notes && !photo)) {
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Submitting...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {userData?.isPremium && (
          <View style={styles.premiumSection}>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoIcon}>📸</Text>
                  <Text style={styles.photoText}>Add Photo Evidence</Text>
                </>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.notesInput}
              placeholder="Add notes (optional)..."
              placeholderTextColor={COLORS.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        <View style={styles.itemsContainer}>
          <Text style={styles.sectionTitle}>
            {type === 'trigger' ? '😤 Select Mistake' : '✨ Select Good Deed'}
          </Text>
          
          {items.map((item) => (
            <TouchableOpacity
              key={`${item.isCustom ? 'custom-' : ''}${item.id}`}
              style={[styles.itemCard, item.isCustom && styles.itemCardCustom]}
              onPress={() => handleItemPress(item)}
            >
              <View style={styles.itemContent}>
                {item.emoji && <Text style={styles.itemEmoji}>{item.emoji}</Text>}
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.isCustom && <Text style={styles.customBadge}>Custom</Text>}
                </View>
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

        {!userData?.isPremium && (
          <View style={styles.upsellCard}>
            <Text style={styles.upsellTitle}>⭐ Upgrade to Premium ⭐</Text>
            <Text style={styles.upsellText}>
              Add custom {type === 'trigger' ? 'triggers' : 'deeds'}, photos, and notes!
            </Text>
            <TouchableOpacity
              style={styles.upsellButton}
              onPress={() => router.push('/premium')}
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
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.text,
    marginTop: 10,
    fontSize: 16,
  },
  premiumSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textTertiary,
  },
  photoButton: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.secondary,
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
    color: COLORS.secondary,
    fontSize: 16,
  },
  notesInput: {
    backgroundColor: COLORS.cardBackground,
    color: COLORS.text,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.textTertiary,
  },
  itemsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  itemCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCardCustom: {
    borderWidth: 1,
    borderColor: COLORS.accent,
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
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 16,
  },
  customBadge: {
    color: COLORS.accent,
    fontSize: 12,
    marginTop: 2,
  },
  itemPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  pointsPositive: {
    color: COLORS.success,
  },
  pointsNegative: {
    color: COLORS.error,
  },
  upsellCard: {
    backgroundColor: `${COLORS.accent}30`,
    padding: 20,
    margin: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
  },
  upsellTitle: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  upsellText: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  upsellButton: {
    backgroundColor: COLORS.accent,
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
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.textTertiary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
