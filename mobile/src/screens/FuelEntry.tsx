import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Save } from 'lucide-react-native';
import { saveFuelLog } from '../db/sqlite';

interface Props {
  onNavigate: (screen: 'Dashboard' | 'FuelEntry' | 'SyncHistory') => void;
}

export default function FuelEntry({ onNavigate }: Props) {
  const [volume, setVolume] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load the driver's ID on mount so logs are attributed correctly
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem("user_profile");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUserId(user.id); // This will be the UUID string
      }
    };
    loadUser();
  }, []);

  const handleSave = async () => {
    if (!volume || isNaN(Number(volume)) || Number(volume) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid fuel volume in liters.');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Error', 'Driver identity not found. Please log in again.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Request Location Permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location is required to log fuel dispenses for compliance.');
        setIsSaving(false);
        return;
      }

      // 2. Get Current Location (Balanced accuracy to save battery in field)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      // 3. Save to local SQLite (Using the actual UUID string)
      // This ensures the backend sync won't fail due to type mismatch
      await saveFuelLog(
        Number(volume), 
        latitude, 
        longitude, 
        currentUserId 
      );

      // 4. Success feedback
      Alert.alert('Logged Locally', 'Volume saved! The background worker will sync this once you have network.', [
        { text: 'OK', onPress: () => onNavigate('Dashboard') }
      ]);
    } catch (error) {
      console.error("Manual Log Error:", error);
      Alert.alert('Error', 'Failed to save fuel log. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 pt-16 px-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-8">
        <TouchableOpacity 
          className="p-2 bg-white rounded-full shadow-sm border border-gray-100"
          onPress={() => onNavigate('Dashboard')}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Manual Entry</Text>
        <View className="w-10" />
      </View>
      
      {/* Input Form */}
      <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Liters Dispensed</Text>
        <TextInput 
          className="text-5xl font-black text-gray-900 h-20 tracking-tighter"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={volume}
          onChangeText={setVolume}
          editable={!isSaving}
          placeholderTextColor="#cbd5e1"
          autoFocus={true}
        />
      </View>

      <Text className="text-gray-400 text-center px-4 mb-4 text-xs">
        Your GPS coordinates will be attached automatically for audit purposes.
      </Text>

      {/* Save Button */}
      <TouchableOpacity 
        className={`mt-auto mb-12 p-5 rounded-2xl flex-row justify-center items-center shadow-md ${isSaving || !volume ? 'bg-gray-400' : 'bg-indigo-600 active:bg-indigo-700'}`}
        onPress={handleSave}
        disabled={isSaving || !volume}
      >
        {isSaving ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Save size={24} color="white" />
            <Text className="text-white text-lg font-bold ml-2">Save Offline</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}