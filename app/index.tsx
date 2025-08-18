import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { router } from 'expo-router';
import { MarkerData, MapRegion, MapPressEvent, Coordinate } from '../types';
import { useMarkers } from '../contexts/MarkerContext';
import * as Location from 'expo-location';

const INITIAL_REGION: MapRegion = {
    latitude: 58.0092,
    longitude: 56.2270,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
}

export default function MapScreen () {
    const { markers, addMarker } = useMarkers();
    const [ region, setRegion ] = useState<MapRegion>(INITIAL_REGION);
    const [ isLoading, setIsLoading ] = useState(true);

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
                setIsLoading(false);
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
            setIsLoading(false);
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

    const handleAddMarker = (coordinate: Coordinate) => {
        const newMarker: MarkerData = {
            id: Date.now().toString(),
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            title: `Маркер ${markers.length + 1}`,
            description: 'Новый маркер',
            images: [],
            createdAt: new Date(),
        };

        addMarker(newMarker);
    };

    const handleMarkerPress = (marker: MarkerData) => {
        router.push(`/marker/${marker.id}?latitude=${marker.latitude}&longitude=${marker.longitude}&title=${encodeURIComponent(marker.title || '')}`);
    };

    if (isLoading) {
        return <View style = {styles.container} />
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
});