import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MarkerData, MapRegion, MapPressEvent, Coordinate } from '../types';
import { useMarkers } from '../contexts/MarkerContext';
import * as Location from 'expo-location';
import { useDatabase } from '../contexts/DatabaseContext';
import { DatabaseInfo } from '../components/DatabaseInfo';
import { useLocation, useProximity } from '../contexts/LocationContext';
import { calculateMapRegion } from '../utils/distance';

const INITIAL_REGION: MapRegion = {
    latitude: 55.7558,
    longitude: 37.6173,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
}

export default function MapScreen () {
    const { markers, addMarker, isLoading: markersLoading, error } = useMarkers();
    const { isInitialized } = useDatabase();
    const {
        locationState,
        startTracking,
        stopTracking,
        isLoading: locationLoading
    } = useLocation();
    const { settings: proximitySettings, isEnabled: proximityEnabled } = useProximity();

    const [ region, setRegion ] = useState<MapRegion>(INITIAL_REGION);
    const [ showDatabaseInfo, setShowDatabaseInfo] = useState (false);
    const [ showProximityCircles, setShowProximityCircles] = useState(false);

    useEffect(() => {
        // запускаем отслеживание местоположения при загрузке
        if (isInitialized) {
            initializeLocation();
        }
    }, [isInitialized]);

    useEffect(() => {
        // обновляем регион карты при изменении местоположения
        if (locationState.location) {
            const newRegion = {
                latitude: locationState.location.coords.latitude,
                longitude: locationState.location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            setRegion(newRegion);
        }
    }, [locationState.location]);

    const initializeLocation = async () => {
        try {
            await startTracking();
        } catch (error) {
            console.error("Ошибка инициализации местоположения", error);
            Alert.alert(
                "Ошибка местоположения",
                "Не удалось запустить трекинг местоположения"
            );
        }
    };

    const toggleLocationTracking = async () => {
        if (locationState.isTracking) {
            stopTracking();
            Alert.alert("Отслеживание остановлено", "GPS-трекинг был отключен");
        } else {
            try {
                await startTracking();
                Alert.alert("Отслеживание запущено", "GPS-трекинг активирован");
            } catch (error) {
                Alert.alert("Ошибка", "Не удалось запустить трекинг местоположения");
            }
        }
    };

    const centerOnUser = () => {
        if (locationState.location) {
            setRegion({
                latitude: locationState.location.coords.latitude,
                longitude: locationState.location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        } else {
            Alert.alert ("Местоположение недоступно", "Включите GPS и разрешите доступ к местоположению");
        }
    };

    const fitAllMarkers = () => {
        if (markers.length === 0) {
            Alert.alert("Нет маркеров", "Добавьте маркеры на карту");
            return;
        }

        const locations = markers.map(m=> ({ latitude: m.latitude, longitude: m.longitude }));

        // добавляем текущее местоположение если доступно
        if (locationState.location) {
            locations.push({
                latitude: locationState.location.coords.latitude,
                longitude: locationState.location.coords.longitude,
            });
        }

        const newRegion = calculateMapRegion(locations, 0.02);
        setRegion(newRegion);
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

    // показываем загрузку, пока инициализируется база данных
    if (!isInitialized) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style = {styles.loadingText}>Инициализация базы данных</Text>
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
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            region = {region}
            onLongPress={handleMapLongPress}
            showsUserLocation={locationState.isTracking}
            showsMyLocationButton={false}
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
                {showProximityCircles && proximityEnabled && markers.map((marker) => (
                    <Circle
                        key={`circle-${marker.id}`}
                        center={{
                        latitude: marker.latitude,
                        longitude: marker.longitude,
                        }}
                        radius={proximitySettings.threshold}
                        strokeColor="rgba(33, 150, 243, 0.5)"
                        fillColor="rgba(33, 150, 243, 0.1)"
                        strokeWidth={2}
                    />
                    ))}
            </MapView>
            <View style={styles.controlPanel}>
                {/* Кнопка отслеживания местоположения */}
                <TouchableOpacity
                style={[
                    styles.controlButton,
                    locationState.isTracking && styles.controlButtonActive
                ]}
                onPress={toggleLocationTracking}
                disabled={locationLoading}
                >
                {locationLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Ionicons 
                    name={locationState.isTracking ? "locate" : "locate-outline"} 
                    size={24} 
                    color="#fff" 
                    />
                )}
                </TouchableOpacity>

                {/* Кнопка центрирования на пользователе */}
                <TouchableOpacity
                style={styles.controlButton}
                onPress={centerOnUser}
                disabled={!locationState.location}
                >
                <Ionicons name="navigate" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Кнопка показа всех маркеров */}
                <TouchableOpacity
                style={styles.controlButton}
                onPress={fitAllMarkers}
                disabled={markers.length === 0}
                >
                <Ionicons name="resize" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Кнопка показа кругов приближения */}
                <TouchableOpacity
                style={[
                    styles.controlButton,
                    showProximityCircles && styles.controlButtonActive
                ]}
                onPress={() => setShowProximityCircles(!showProximityCircles)}
                >
                <Ionicons name="radio-button-on" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
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
    controlPanel: {
        position: 'absolute',
        top: 120,
        right: 16,
        flexDirection: 'column',
        gap: 8,
    },
    controlButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    controlButtonActive: {
        backgroundColor: '#007AFF',
    },
});