import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MarkerData, MapRegion, MapPressEvent, Coordinate } from '../types';
import { useMarkers } from '../contexts/MarkerContext';
import * as Location from 'expo-location';
import { useDatabase } from '../contexts/DatabaseContext';
import { DatabaseInfo } from '../components/DatabaseInfo';

const INITIAL_REGION: MapRegion = {
    latitude: 55.7558,
    longitude: 37.6173,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
}

export default function MapScreen () {
    const { markers, addMarker, isLoading: markersLoading, error } = useMarkers();
    const { isInitialized } = useDatabase();
    const [ region, setRegion ] = useState<MapRegion>(INITIAL_REGION);
    const [ isLocationLoading, setIsLocationLoading] = useState(true);
    const [ showDatabaseInfo, setShowDatabaseInfo] = useState (false);

    useEffect(() => {
        getCurrentLocation();
    }, []);

    const getCurrentLocation = async () => {
        try {
            const {status} = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert (
                    'Разрешение на геолокацию',
                    'Для работы приложения необходимо разрешение на использование геолокации'
                );
                setIsLocationLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setRegion ({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });
        } catch (error) {
            console.error ("Ошибка получения геолокации: ", error);
            Alert.alert ("Ошибка", "Не удалось получить геолокацию");
        } finally {
            setIsLocationLoading(false);
        }
    };

    const handleMapLongPress = (event: MapPressEvent) => {
        const {coordinate} = event.nativeEvent;

        Alert.alert (
            "Добавление маркера",
            "Добавить маркер на карту?",
            [
                {
                    text: "Отмена",
                    style: 'cancel',
                },
                {
                    text: "Добавить",
                    onPress: () => handleAddMarker(coordinate),
                },
            ]
        );
    };

    const handleAddMarker = async (coordinate: Coordinate) => {
        try {
            await addMarker (coordinate.latitude, coordinate.longitude);
        } catch (error) {
            console.error("Ошибка добавления маркера", error);
            Alert.alert ("Ошибка", "Не удалось добавить маркер");
        }
    }

    const handleMarkerPress = (marker: MarkerData) => {
        router.push(`/marker/${marker.id}?latitude=${marker.latitude}&longitude=${marker.longitude}&title=${encodeURIComponent(marker.title || '')}`);
    };

    if (!isInitialized || isLocationLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>
                    {!isInitialized ? 'Инициализация базы данных...' : 'Получение местоположения...'}
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Ошибка: {error.message}</Text>
            </View>
        )
    }

    return (
        <View style = {styles.container}>
            <MapView 
            style = {styles.map}
            initialRegion={region}
            onLongPress={handleMapLongPress}
            showsUserLocation
            showsMyLocationButton
            loadingEnabled
            mapType="standard"
            onMapReady={() => console.log("Карта загружена")}
            >
                {markers.map((marker) => (
                    <Marker
                    key = {marker.id}
                    coordinate = {{
                        latitude: marker.latitude,
                        longitude: marker.longitude,
                    }}
                    title = {marker.title}
                    description = {marker.description}
                    onPress = {() => handleMarkerPress(marker)}
                    />
                ))}
            </MapView>
            {__DEV__ && (
                <TouchableOpacity
                style={styles.dbInfoButton}
                onPress={() => setShowDatabaseInfo(true)}
                >
                    <Ionicons name="information-circle" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            <DatabaseInfo
            visible={showDatabaseInfo}
            onClose={() => setShowDatabaseInfo(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create ({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#d32f2f',
        textAlign: 'center',
    },
    dbInfoButton: {
        position: 'absolute',
        top: 50,
        right: 16,
        backgroundColor: '#007AFF',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
        width: 0,
        height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
});