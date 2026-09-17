import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PrivacyDashboardProps {
  visible: boolean;
  darkMode: boolean;
  onClose: () => void;
}

const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({ visible, darkMode, onClose }) => {
  const stats = [
    { label: 'Trackers Blocked', value: '0', icon: 'shield-checkmark', color: '#34C759' },
    { label: 'HTTPS Upgrades', value: '100%', icon: 'lock-closed', color: '#8B5CF6' },
    { label: 'Data Saved', value: '2.4MB', icon: 'server', color: '#007AFF' },
    { label: 'Cookies Blocked', value: '0', icon: 'eye-off', color: '#FF9500' },
  ];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.container, darkMode && styles.darkContainer]}>
          <View style={styles.handle} />
          <Text style={[styles.title, darkMode && styles.darkText]}>Privacy Dashboard</Text>
          <Text style={styles.subtitle}>Your privacy at a glance</Text>
          
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={[styles.statCard, darkMode && styles.darkCard]}>
                <Ionicons name={stat.icon} size={28} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={[styles.statLabel, darkMode && styles.darkText]}>{stat.label}</Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  darkContainer: {
    backgroundColor: '#1C1C1E',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  darkText: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
  },
  darkCard: {
    backgroundColor: '#2C2C2E',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrivacyDashboard;