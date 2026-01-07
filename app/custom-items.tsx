// ============================================
// app/custom-items.tsx - Custom Items Screen (Premium)
// ============================================

import { useRouter } from 'expo-router';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase.config';
import { DeedItem, TriggerItem } from '../types';
import { COLORS } from '../utils/constants';

const EMOJI_OPTIONS = ['😤', '😡', '🙄', '😒', '💢', '🤦', '😠', '👎', '✨', '🌟', '💪', '🎉', '👏', '🏆', '💝', '🙌'];

export default function CustomItemsScreen() {
  const router = useRouter();
  const { userData, refreshUserData } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<'trigger' | 'deed'>('trigger');
  const [itemName, setItemName] = useState('');
  const [itemPoints, setItemPoints] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('😤');
  const [loading, setLoading] = useState(false);

  if (!userData?.isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedEmoji}>🔒</Text>
          <Text style={styles.lockedTitle}>Premium Feature</Text>
          <Text style={styles.lockedText}>
            Upgrade to premium to create custom triggers and deeds!
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/premium')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now - $5</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const customTriggers = userData.customTriggers || [];
  const customDeeds = userData.customDeeds || [];

  const openAddModal = (type: 'trigger' | 'deed') => {
    setEditingType(type);
    setItemName('');
    setItemPoints(type === 'trigger' ? '-5' : '5');
    setSelectedEmoji(type === 'trigger' ? '😤' : '✨');
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const points = parseInt(itemPoints);
    if (isNaN(points)) {
      Alert.alert('Error', 'Please enter valid points');
      return;
    }

    if (editingType === 'trigger' && points > 0) {
      Alert.alert('Error', 'Triggers must have negative points');
      return;
    }

    if (editingType === 'deed' && points < 0) {
      Alert.alert('Error', 'Good deeds must have positive points');
      return;
    }

    setLoading(true);

    try {
      const newItem: TriggerItem | DeedItem = {
        id: Date.now(),
        name: itemName.trim(),
        points: points,
        emoji: selectedEmoji,
        isCustom: true,
        createdBy: auth.currentUser?.uid,
      };

      const fieldName = editingType === 'trigger' ? 'customTriggers' : 'customDeeds';
      
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        [fieldName]: arrayUnion(newItem),
      });

      await refreshUserData();
      setModalVisible(false);
      Alert.alert('Success', `Custom ${editingType} added!`);
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = (item: TriggerItem | DeedItem, type: 'trigger' | 'deed') => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const fieldName = type === 'trigger' ? 'customTriggers' : 'customDeeds';
              
              await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
                [fieldName]: arrayRemove(item),
              });

              await refreshUserData();
              Alert.alert('Success', 'Item deleted');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>😤 Custom Triggers</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openAddModal('trigger')}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          
          {customTriggers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No custom triggers yet</Text>
              <Text style={styles.emptySubtext}>Add triggers specific to your relationship!</Text>
            </View>
          ) : (
            customTriggers.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemEmoji}>{item.emoji}</Text>
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.itemPointsNegative}>{item.points}</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteItem(item, 'trigger')}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✨ Custom Good Deeds</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openAddModal('deed')}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          
          {customDeeds.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No custom deeds yet</Text>
              <Text style={styles.emptySubtext}>Add good deeds unique to your household!</Text>
            </View>
          ) : (
            customDeeds.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemEmoji}>{item.emoji}</Text>
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.itemPointsPositive}>+{item.points}</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteItem(item, 'deed')}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips</Text>
          <Text style={styles.tipsText}>
            • Triggers should have negative points (-1 to -10){'\n'}
            • Good deeds should have positive points (+1 to +15){'\n'}
            • Be specific - "Left wet towel on bed" is better than "Was messy"{'\n'}
            • Have fun with it! This is meant to be playful competition
          </Text>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add Custom {editingType === 'trigger' ? 'Trigger' : 'Good Deed'}
            </Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder={editingType === 'trigger' ? "e.g., Left the toilet seat up" : "e.g., Made coffee in the morning"}
              placeholderTextColor={COLORS.textTertiary}
              value={itemName}
              onChangeText={setItemName}
            />

            <Text style={styles.inputLabel}>Points</Text>
            <TextInput
              style={styles.input}
              placeholder={editingType === 'trigger' ? "-5" : "5"}
              placeholderTextColor={COLORS.textTertiary}
              value={itemPoints}
              onChangeText={setItemPoints}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              <View style={styles.emojiContainer}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiButton,
                      selectedEmoji === emoji && styles.emojiButtonSelected
                    ]}
                    onPress={() => setSelectedEmoji(emoji)}
                  >
                    <Text style={styles.emojiButtonText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSaveItem}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save'}
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
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockedEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  lockedText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: COLORS.cardBackground,
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: 5,
  },
  emptySubtext: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  itemCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 16,
  },
  itemPointsNegative: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  itemPointsPositive: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  tipsCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    margin: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  tipsTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tipsText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.textTertiary,
  },
  emojiScroll: {
    marginBottom: 20,
  },
  emojiContainer: {
    flexDirection: 'row',
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  emojiButtonSelected: {
    backgroundColor: COLORS.secondary,
  },
  emojiButtonText: {
    fontSize: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
