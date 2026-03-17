import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { ArrowLeft, Save } from 'lucide-react-native';
import { saveFuelLog } from '../database/db';

interface Props {
  onNavigate: (screen: 'Dashboard' | 'FuelEntry' | 'SyncHistory') => void;
}

export default function FuelEntry({ onNavigate }: Props) {
  const [volume, setVolume] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!volume || isNaN(Number(volume)) || Number(volume) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid fuel volume in liters.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Request Location Permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location is required to log fuel dispenses.');
        setIsSaving(false);
        return;
      }

      // 2. Get Current Location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      // 3. Save to local SQLite database (userId is mocked as 1 for now)
      saveFuelLog(Number(volume), latitude, longitude, 1);

      // 4. Alert & Navigate
      Alert.alert('Success', 'Fuel log saved locally! It will sync when online.', [
        { text: 'OK', onPress: () => onNavigate('Dashboard') }
      ]);
    } catch (error) {
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
        <Text className="text-xl font-bold text-gray-900">Log Fuel Dispensed</Text>
        <View className="w-10" /> {/* Spacer for centering */}
      </View>
      
      {/* Input Form */}
      <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Volume (Liters)</Text>
        <TextInput 
          className="text-5xl font-black text-gray-900 h-20 tracking-tighter"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={volume}
          onChangeText={setVolume}
          editable={!isSaving}
          placeholderTextColor="#cbd5e1"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity 
        className={`mt-auto mb-12 p-5 rounded-2xl flex-row justify-center items-center shadow-md ${isSaving || !volume ? 'bg-gray-400' : 'bg-green-600 active:bg-green-700'}`}
        onPress={handleSave}
        disabled={isSaving || !volume}
      >
        {isSaving ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Save size={24} color="white" />
            <Text className="text-white text-lg font-bold ml-2">Save Log Offline</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
