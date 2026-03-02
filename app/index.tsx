import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Pressable,
  Animated,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThingsStore, type GridItemKey } from '../src/store/thingsStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { rescheduleAllNotifications, configureNotificationHandler } from '../src/utils/notifications';
import ThingCard from '../src/components/ThingCard';
import GroupCard from '../src/components/GroupCard';
import BottomNav from '../src/components/BottomNav';
import SearchBar from '../src/components/SearchBar';
import SettingsModal from '../src/components/SettingsModal';
import TimePickerField from '../src/components/TimePickerField';
import { ThingToTrackGroup } from '../src/types';
type GridItem =
  | { kind: 'thing'; id: string }
  | { kind: 'group'; id: string };

export default function HomeScreen() {
  const router = useRouter();
  const { things, groups, lastTracked, addGroup, deleteThing, deleteGroup, homeOrder, setHomeOrder } = useThingsStore();
  const { showSearchBar, viewGroupedThingsInHome } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupDialogVisible, setGroupDialogVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTime, setNewGroupTime] = useState('20:00');
  const [newGroupInterval, setNewGroupInterval] = useState('1');
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<GridItem[]>([]);
  const allSetOpacity = useRef(new Animated.Value(0)).current;

  // Notification setup on mount
  useEffect(() => {
    configureNotificationHandler();
    rescheduleAllNotifications(things, groups, lastTracked);
  }, []);

  // Show "All Set" banner if navigated back with flash=true
  const showAllSet = () => {
    Animated.sequence([
      Animated.timing(allSetOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(allSetOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  // Build grid items (optionally ordered by homeOrder)
  const gridItems = useMemo<GridItem[]>(() => {
    const keyOf = (item: GridItem): GridItemKey =>
      item.kind === 'thing' ? `thing-${item.id}` : `group-${item.id}`;

    const q = searchQuery.toLowerCase();

    const groupItems: GridItem[] = groups
      .filter((g) => g.displayName.toLowerCase().includes(q))
      .map((g) => ({ kind: 'group', id: g.id }));

    const thingItems: GridItem[] = things
      .filter((t) => {
        if (!viewGroupedThingsInHome && t.groupId) return false;
        return t.displayName.toLowerCase().includes(q);
      })
      .map((t) => ({ kind: 'thing', id: t.id }));

    const all: GridItem[] = [...groupItems, ...thingItems];
    if (homeOrder.length === 0) return all;

    const byKey = new Map<GridItemKey, GridItem>();
    all.forEach((item) => byKey.set(keyOf(item), item));
    const ordered: GridItem[] = [];
    homeOrder.forEach((key) => {
      const item = byKey.get(key);
      if (item) {
        ordered.push(item);
        byKey.delete(key);
      }
    });
    byKey.forEach((item) => ordered.push(item));
    return ordered;
  }, [things, groups, searchQuery, viewGroupedThingsInHome, homeOrder]);

  // Toggle selection in group-creation mode
  const toggleSelect = (key: GridItemKey) => {
    setSelectedIds((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const selectKey = (item: GridItem): GridItemKey =>
    item.kind === 'thing' ? `thing-${item.id}` : `group-${item.id}`;

  const onLongPressCard = (item: GridItem) => {
    setSelectMode(true);
    setSelectedIds([selectKey(item)]);
  };

  const selectedThingIds = selectedIds
    .filter((k) => k.startsWith('thing-'))
    .map((k) => k.replace('thing-', ''));
  const selectedGroupIds = selectedIds.filter((k) => k.startsWith('group-')).map((k) => k.replace('group-', ''));
  const canMakeGroup = selectedThingIds.length >= 2 && selectedIds.length === selectedThingIds.length;
  const canDelete = selectedIds.length > 0;

  const handleDeleteSelected = () => {
    const count = selectedIds.length;
    Alert.alert(
      'Delete selected?',
      `Delete ${count} item${count === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedIds.forEach((key) => {
              if (key.startsWith('group-')) deleteGroup(key.replace('group-', ''));
              else deleteThing(key.replace(/^thing-/, ''));
            });
            const state = useThingsStore.getState();
            rescheduleAllNotifications(state.things, state.groups, state.lastTracked);
            setSelectMode(false);
            setSelectedIds([]);
          },
        },
      ]
    );
  };

  const openReorderMode = () => {
    setReorderList([...gridItems]);
    setSelectMode(false);
    setSelectedIds([]);
    setReorderMode(true);
  };

  const handleReorderMove = (index: number, direction: 'up' | 'down') => {
    setReorderList((prev) => {
      const next = [...prev];
      const j = direction === 'up' ? index - 1 : index + 1;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const handleReorderDone = () => {
    setHomeOrder(reorderList.map((item) => selectKey(item)));
    setReorderMode(false);
  };

  const handleCreateGroupConfirm = () => {
    if (!newGroupName.trim()) {
      Alert.alert('Name required', 'Please enter a name for this group.');
      return;
    }
    if (selectedThingIds.length === 0) {
      Alert.alert('No trackers selected', 'Please select at least one tracker.');
      return;
    }
    const interval = parseInt(newGroupInterval, 10);
    const newGroup: ThingToTrackGroup = {
      id: `group-${Date.now()}`,
      displayName: newGroupName.trim(),
      reminderTime: newGroupTime,
      intervalDays: isNaN(interval) || interval < 1 ? 1 : interval,
      thingIds: selectedThingIds,
    };
    addGroup(newGroup);
    rescheduleAllNotifications(
      useThingsStore.getState().things,
      useThingsStore.getState().groups,
      lastTracked
    );
    setGroupDialogVisible(false);
    setSelectMode(false);
    setSelectedIds([]);
    setNewGroupName('');
    setNewGroupTime('20:00');
    setNewGroupInterval('1');
  };

  const renderItem = ({ item }: { item: GridItem }) => {
    const key = selectKey(item);
    if (item.kind === 'group') {
      const group = groups.find((g) => g.id === item.id);
      if (!group) return null;
      return (
        <GroupCard
          group={group}
          things={things}
          isSelectMode={selectMode}
          isSelected={selectedIds.includes(key)}
          onToggleSelect={(id) => toggleSelect('group-' + id)}
          onLongPress={() => onLongPressCard(item)}
        />
      );
    }
    const thing = things.find((t) => t.id === item.id);
    if (!thing) return null;
    return (
      <ThingCard
        thing={thing}
        isSelectMode={selectMode}
        isSelected={selectedIds.includes(key)}
        onToggleSelect={(id) => toggleSelect('thing-' + id)}
        onLongPress={() => onLongPressCard(item)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cuticle Tracker</Text>
      </View>

      {/* Search bar */}
      {showSearchBar && !selectMode && (
        <View style={styles.searchContainer}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      )}

      {/* Select mode banner */}
      {selectMode && (
        <>
          <View style={styles.selectBanner}>
            <Text style={styles.selectBannerText}>
              {selectedIds.length} selected
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectMode(false);
                setSelectedIds([]);
              }}
            >
              <Text style={styles.cancelSelectText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.selectActions}>
            <TouchableOpacity
              style={[styles.selectActionBtn, !canMakeGroup && styles.selectActionBtnDisabled]}
              onPress={() => canMakeGroup && setGroupDialogVisible(true)}
              disabled={!canMakeGroup}
            >
              <Text style={styles.selectActionBtnText}>Make Group</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectActionBtn, styles.selectActionBtnDanger]}
              onPress={handleDeleteSelected}
              disabled={!canDelete}
            >
              <Text style={styles.selectActionBtnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectActionBtn}
              onPress={openReorderMode}
            >
              <Text style={styles.selectActionBtnText}>Reorder</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Grid */}
      <FlatList
        data={gridItems}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No trackers match your search.' : 'Tap "New Tracker" to get started!'}
            </Text>
          </View>
        }
      />


      {/* Bottom nav */}
      {!selectMode && (
        <BottomNav
          onNewTracker={() => router.push('/new-tracker/details')}
          onCreateGroup={() => {
            setSelectMode(true);
            setSelectedIds([]);
          }}
          onSettings={() => setSettingsVisible(true)}
        />
      )}

      {/* "All Set" flash banner */}
      <Animated.View style={[styles.allSetBanner, { opacity: allSetOpacity }]}>
        <Text style={styles.allSetText}>✓ All Set!</Text>
      </Animated.View>

      {/* Settings modal */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {/* Reorder modal */}
      <Modal
        visible={reorderMode}
        transparent
        animationType="slide"
        onRequestClose={() => setReorderMode(false)}
      >
        <View style={styles.reorderModalContainer}>
          <View style={styles.reorderModalHeader}>
            <Text style={styles.reorderModalTitle}>Reorder</Text>
            <TouchableOpacity onPress={handleReorderDone}>
              <Text style={styles.reorderDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.reorderList} contentContainerStyle={styles.reorderListContent}>
            {reorderList.map((item, index) => {
              const label =
                item.kind === 'thing'
                  ? things.find((t) => t.id === item.id)?.displayName ?? item.id
                  : groups.find((g) => g.id === item.id)?.displayName ?? item.id;
              return (
                <View key={selectKey(item)} style={styles.reorderRow}>
                  <TouchableOpacity
                    style={[styles.reorderMoveBtn, index === 0 && styles.reorderMoveBtnDisabled]}
                    onPress={() => handleReorderMove(index, 'up')}
                    disabled={index === 0}
                  >
                    <Text style={styles.reorderMoveBtnText}>↑</Text>
                  </TouchableOpacity>
                  <Text style={styles.reorderRowLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.reorderMoveBtn,
                      index === reorderList.length - 1 && styles.reorderMoveBtnDisabled,
                    ]}
                    onPress={() => handleReorderMove(index, 'down')}
                    disabled={index === reorderList.length - 1}
                  >
                    <Text style={styles.reorderMoveBtnText}>↓</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.reorderCancelBtn}
            onPress={() => setReorderMode(false)}
          >
            <Text style={styles.reorderCancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Create Group details dialog */}
      <Modal
        visible={groupDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupDialogVisible(false)}
      >
        <Pressable style={styles.dialogBackdrop} onPress={() => setGroupDialogVisible(false)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={styles.dialogTitle}>New Group</Text>

            <Text style={styles.dialogLabel}>Group Name</Text>
            <TextInput
              style={styles.dialogInput}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="e.g. All Fingers"
              placeholderTextColor="#555"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <TimePickerField
              label="Reminder Time"
              value={newGroupTime}
              onValueChange={setNewGroupTime}
              inputStyle={styles.dialogInput}
            />

            <Text style={styles.dialogLabel}>Interval (days)</Text>
            <TextInput
              style={styles.dialogInput}
              value={newGroupInterval}
              onChangeText={setNewGroupInterval}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#555"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              selectTextOnFocus
            />

            <View style={styles.dialogBtns}>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogCancelBtn]}
                onPress={() => setGroupDialogVisible(false)}
              >
                <Text style={styles.dialogBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogConfirmBtn]}
                onPress={handleCreateGroupConfirm}
              >
                <Text style={[styles.dialogBtnText, styles.dialogConfirmBtnText]}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#e2e2e8',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  selectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1636',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#7c3aed44',
  },
  selectBannerText: {
    color: '#d4bbff',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelSelectText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '600',
  },
  selectActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  selectActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
  },
  selectActionBtnDisabled: {
    opacity: 0.5,
  },
  selectActionBtnDanger: {
    backgroundColor: '#3a1a1a',
  },
  selectActionBtnText: {
    color: '#e2e2e8',
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  row: {
    gap: 12,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#555',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmGroupBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmGroupBtnDisabled: {
    backgroundColor: '#3a2a5a',
  },
  confirmGroupBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  allSetBanner: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#22c55e',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  allSetText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  // Dialog
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  dialogTitle: {
    color: '#e2e2e8',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  dialogLabel: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  dialogInput: {
    backgroundColor: '#2a2a3a',
    color: '#e2e2e8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a3a4a',
  },
  dialogBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dialogCancelBtn: {
    backgroundColor: '#2a2a3a',
  },
  dialogConfirmBtn: {
    backgroundColor: '#7c3aed',
  },
  dialogBtnText: {
    color: '#ccc',
    fontSize: 15,
    fontWeight: '600',
  },
  dialogConfirmBtnText: {
    color: '#fff',
  },
  // Reorder modal
  reorderModalContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  reorderModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reorderModalTitle: {
    color: '#e2e2e8',
    fontSize: 20,
    fontWeight: '700',
  },
  reorderDoneText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '600',
  },
  reorderList: {
    flex: 1,
  },
  reorderListContent: {
    paddingBottom: 20,
    gap: 8,
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    gap: 12,
  },
  reorderMoveBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderMoveBtnDisabled: {
    opacity: 0.4,
  },
  reorderMoveBtnText: {
    color: '#e2e2e8',
    fontSize: 18,
  },
  reorderRowLabel: {
    flex: 1,
    color: '#e2e2e8',
    fontSize: 16,
  },
  reorderCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reorderCancelBtnText: {
    color: '#888',
    fontSize: 16,
  },
});
