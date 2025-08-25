import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import { LocationContextType, LocationState, ProximitySettings, MarkerData } from '../types';
import { locationService } from '../services/locationService';
import { notificationManager } from '../services/notificationManager';
import { calculateDistance, isWithinRadius, DISTANCE_CONSTANTS } from '../utils/distance';
import { useMarkers } from './MarkerContext';

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
    children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
    const [locationState, setLocationState] = useState<LocationState>({
        location: null,
        errorMsg: null,
        isTracking: false,
        lastUpdate: null,
    });

    const [proximitySettings, setProximitySettings] = useState<ProximitySettings>({
        threshold: DISTANCE_CONSTANTS.DEFAULT_PROXIMITY_THRESHOLD,
        enabled: true,
        cooldownPeriod: DISTANCE_CONSTANTS.DEFAULT_COOLDOWN_PERIOD,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null> (null);

    const {markers} = useMarkers();

    useEffect(() => {
        // инициализируем менеджер уведомлений
        notificationManager.initialize();

        // получаем последнее известное местоположение при запуске
        getLastKnownLocation();

        // очистка при размонтировании
        return () => {
            stopTracking();
            notificationManager.cleanup();
        };
    }, []);

    useEffect(() => {
        // проверяем приближение к маркерам при изменении местоположения или списка маркеров
        if (locationState.location && proximitySettings.enabled && markers.length > 0) {
            checkProximityToMarkers();
        }
    }, [locationState.location, markers, proximitySettings.enabled, proximitySettings.threshold]);

    const getLastKnownLocation = async () => {
        try {
            const lastLocation = await locationService.getLastKnownLocation();
            if (lastLocation) {
                setLocationState(prev => ({
                    ...prev, 
                    location: lastLocation,
                    lastUpdate: new Date(),
                }));
            }
        } catch (error) {
            console.log ("Последнее местоположение недоступно");
        }
    };

    const startTracking = async (): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            const success = await locationService.startTracking(
                (location: Location.LocationObject) => {
                    setLocationState(prev => ({
                        ...prev,
                        location,
                        errorMsg: null,
                        isTracking: true,
                        lastUpdate: new Date(),
                    }));
                },
                (error: Error) => {
                    setLocationState(prev => ({
                        ...prev,
                        errorMsg: error.message,
                        isTracking: false,
                    }));
                    setError(error);
                }
            );

            if (success) {
                setLocationState(prev => ({ ...prev, isTracking: true}));
            } else {
                throw new Error ("Не удалось запустить отслеживание местоположения");
            }

        } catch (error) {
            console.error("Ошибка запуска отслеживания", error);
            setError(error as Error);
            setLocationState(prev => ({
                ...prev,
                errorMsg: (error as Error).message,
                isTracking: false,
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const stopTracking = (): void => {
        try {
            locationService.stopTracking();
            setLocationState(prev => ({ ...prev, isTracking: false }));

            // очищаем все активные уведомления
            notificationManager.clearAllNotifications();
        } catch (error) {
            console.error("Ошибка остановки отслеживания:", error);
            setError (error as Error);
        }
    };

    const checkProximityToMarkers = (): void => {
        if (!locationState.location) return;

        const userLat = locationState.location.coords.latitude;
        const userLng = locationState.location.coords.longitude;

        markers.forEach((marker: MarkerData) => {
            const distance = calculateDistance(
                userLat,
                userLng,
                marker.latitude,
                marker.longitude
            );

            const isNearby = isWithinRadius (
                userLat,
                userLng,
                marker.latitude,
                marker.longitude,
                proximitySettings.threshold
            );

            if (isNearby) {
                // пользователь рядом с маркером – отправляем уведомление
                notificationManager.showProximityNotification(marker, distance);
            } else {
                // пользователь далеко – удаляем уведомление если есть
                if (notificationManager.hasActiveNotification(marker.id)) {
                    notificationManager.removeNotification(marker.id);
                }
            }
        });
    };

    const setProximityEnabled = (enabled: boolean): void => {
        setProximitySettings( prev => ({ ...prev, enabled }));

        if (!enabled) {
            // очищаем все уведомления при отключении
            notificationManager.clearAllNotifications();
        }
    };

    const setProximityThreshold = (threshold: number): void => {
        // проверяем границы
        const clampedThreshold = Math.max(
            DISTANCE_CONSTANTS.MIN_PROXIMITY_THRESHOLD,
            Math.min(DISTANCE_CONSTANTS.MAX_PROXIMITY_THRESHOLD, threshold)
        );

        setProximitySettings( prev => ({ ...prev, threshold: clampedThreshold }));
    };

    const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
        try {
            setIsLoading(true);
            setError(null);

            const location = await locationService.getCurrentLocation();

            if (location) {
                setLocationState( prev => ({
                    ...prev,
                    location,
                    errorMsg: null,
                    lastUpdate: new Date(),
                }));
            }

            return location;
        } catch (error) {
            console.error("Ошибка получения местоположения: ", error);
            setError(error as Error);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const getPermissionStatus = async (): Promise<string> => {
        try {
            const status = await locationService.getPermissionStatus();
            return status;
        } catch (error) {
            console.error("Ошибка проверки разрешений", error);
            return "undetermined";
        }
    };

    const testNotification = async (): Promise<void>
}