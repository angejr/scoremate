// ============================================
// app/report.tsx - Report Screen with Confirmation Modal
// ============================================

import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { COLORS, FREE_TIER_LIMITS, GOOD_DEEDS, TRIGGERS } from '../utils/constants';
import { getWeekNumber } from '../utils/helpers';
import { sendReportNotification } from '../utils/notifications';

export default function ReportScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'trigger' | 'deed' }>();
  const { userData } = useAuth();

  const [items, setItems] = useState<(TriggerItem | DeedItem)[]>([]);
  const [selectedItem, setSelectedItem] = useState<TriggerItem | DeedItem | null>(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [weeklyUsage, setWeeklyUsage] = useState({ photos: 0, notes: 0 });

  useEffect(() => {
    let baseItems = type === 'trigger' ? [...TRIGGERS] : [...GOOD_DEEDS];

    // Add custom items (limited for free users)
    const customItems =
      type === 'trigger' ? userData?.customTriggers || [] : userData?.customDeeds || [];
    
    if (userData?.isPremium) {
      // Premium: all custom items
      baseItems = [...baseItems, ...customItems];
    } else {
      // Free: only first N custom items within limit
      const limit = type === 'trigger' ? FREE_TIER_LIMITS.customTriggers : FREE_TIER_LIMITS.customDeeds;
      baseItems = [...baseItems, ...customItems.slice(0, limit)];
    }

    setItems(baseItems);
  }, [type, userData]);

  useEffect(() => {
    // Fetch weekly usage for non-premium users
    if (!userData?.isPremium) {
      fetchWeeklyUsage();
    }
  }, [userData]);

  const fetchWeeklyUsage = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const currentWeek = getWeekNumber(new Date());
      const currentYear = new Date().getFullYear();

      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef,
        where('userId', '==', currentUser.uid),
        where('weekNumber', '==', currentWeek),
        where('year', '==', currentYear)
      );

      const snapshot = await getDocs(q);
      
      let photosUsed = 0;
      let notesUsed = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.photoUrl) photosUsed++;
        if (data.notes && data.notes.trim() !== '') notesUsed++;
      });

      setWeeklyUsage({ photos: photosUsed, notes: notesUsed });
    } catch (error) {
      console.error('Error fetching weekly usage:', error);
    }
  };

  const canAddPhoto = userData?.isPremium || weeklyUsage.photos < FREE_TIER_LIMITS.photosPerWeek;
  const canAddNote = userData?.isPremium || weeklyUsage.notes < FREE_TIER_LIMITS.notesPerWeek;
  const photosRemaining = FREE_TIER_LIMITS.photosPerWeek - weeklyUsage.photos;
  const notesRemaining = FREE_TIER_LIMITS.notesPerWeek - weeklyUsage.notes;

  const pickImage = async () => {
    if (!canAddPhoto) {
      Alert.alert(
        'Weekly Limit Reached',
        `You've used all ${FREE_TIER_LIMITS.photosPerWeek} free photos this week. Upgrade to Premium for unlimited photos!`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/premium') },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleNotesChange = (text: string) => {
    if (!canAddNote && text.length > 0 && notes.length === 0) {
      Alert.alert(
        'Weekly Limit Reached',
        `You've used all ${FREE_TIER_LIMITS.notesPerWeek} free notes this week. Upgrade to Premium for unlimited notes!`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/premium') },
        ]
      );
      return;
    }
    setNotes(text);
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

  const submitReport = async () => {
    if (!selectedItem) return;

    if (!userData?.partnerId && type === 'trigger') {
      setShowModal(false);
      setTimeout(() => {
        router.push('/link-partner');
      }, 300);
      return;
    }

    if (!auth.currentUser) {
      return;
    }

    setLoading(true);

    try {
      let photoUrl = null;
      if (photo && canAddPhoto) {
        photoUrl = await uploadPhoto(photo);
      }

      const currentWeek = getWeekNumber(new Date());
      const reportData = {
        userId: auth.currentUser.uid,
        targetId: type === 'trigger' ? userData?.partnerId : auth.currentUser.uid,
        type: type,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        points: selectedItem.points,
        photoUrl: photoUrl,
        notes: canAddNote ? notes : '',
        timestamp: new Date(),
        weekNumber: currentWeek,
        year: new Date().getFullYear(),
        isCustom: selectedItem.isCustom || false,
      };

      await addDoc(collection(db, 'reports'), reportData);

      // Send push notification to partner (now free for everyone)
      if (userData?.partnerId) {
        const reporterName = userData.name || 'Your partner';
        await sendReportNotification(
          userData.partnerId,
          reporterName,
          type as 'trigger' | 'deed',
          selectedItem.name,
          selectedItem.points
        );
      }

      setShowModal(false);
      setSelectedItem(null);
      setNotes('');
      setPhoto(null);

      router.back();
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: TriggerItem | DeedItem) => {
    setSelectedItem(item);
    setNotes('');
    setPhoto(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setNotes('');
    setPhoto(null);
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
              <Text
                style={[
                  styles.itemPoints,
                  item.points > 0 ? styles.pointsPositive : styles.pointsNegative,
                ]}
              >
                {item.points > 0 ? '+' : ''}
                {item.points}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Selected Item Preview */}
            {selectedItem && (
              <View style={styles.selectedItemPreview}>
                <Text style={styles.selectedItemEmoji}>{selectedItem.emoji}</Text>
                <View style={styles.selectedItemInfo}>
                  <Text style={styles.selectedItemName}>{selectedItem.name}</Text>
                  <Text
                    style={[
                      styles.selectedItemPoints,
                      selectedItem.points > 0 ? styles.pointsPositive : styles.pointsNegative,
                    ]}
                  >
                    {selectedItem.points > 0 ? '+' : ''}
                    {selectedItem.points} points
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            {/* Photo Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>📸 Photo Evidence</Text>
              {!userData?.isPremium && (
                <Text style={[styles.limitBadge, !canAddPhoto && styles.limitReached]}>
                  {photosRemaining}/{FREE_TIER_LIMITS.photosPerWeek} left
                </Text>
              )}
            </View>
            <TouchableOpacity 
              style={[styles.photoButton, !canAddPhoto && !photo && styles.disabledField]} 
              onPress={pickImage}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoIcon}>{canAddPhoto ? '📷' : '🔒'}</Text>
                  <Text style={[styles.photoText, !canAddPhoto && styles.disabledText]}>
                    {canAddPhoto ? 'Tap to add photo' : 'Weekly limit reached'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Notes Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>📝 Notes</Text>
              {!userData?.isPremium && (
                <Text style={[styles.limitBadge, !canAddNote && styles.limitReached]}>
                  {notesRemaining}/{FREE_TIER_LIMITS.notesPerWeek} left
                </Text>
              )}
            </View>
            <TextInput
              style={[styles.notesInput, !canAddNote && notes.length === 0 && styles.disabledField]}
              placeholder={canAddNote ? 'Add a note (optional)...' : 'Weekly limit reached'}
              placeholderTextColor={COLORS.textTertiary}
              value={notes}
              onChangeText={handleNotesChange}
              multiline
              numberOfLines={3}
              editable={canAddNote || notes.length > 0}
            />

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  type === 'trigger' ? styles.submitButtonTrigger : styles.submitButtonDeed,
                ]}
                onPress={submitReport}
              >
                <Text style={styles.submitButtonText}>
                  {type === 'trigger' ? '😤 Report' : '✨ Log It'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  itemsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  itemCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 12,
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
    fontSize: 28,
    marginRight: 12,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  selectedItemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedItemEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  selectedItemPoints: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.textTertiary,
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  limitBadge: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  limitReached: {
    color: COLORS.error,
  },
  photoButton: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    borderStyle: 'dashed',
    minHeight: 100,
    justifyContent: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  photoIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  photoText: {
    color: COLORS.secondary,
    fontSize: 14,
  },
  disabledField: {
    borderColor: COLORS.textTertiary,
    opacity: 0.6,
  },
  disabledText: {
    color: COLORS.textTertiary,
  },
  notesInput: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.textTertiary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.textTertiary,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDeed: {
    backgroundColor: COLORS.success,
  },
  submitButtonTrigger: {
    backgroundColor: COLORS.error,
  },
  submitButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
