import * as Location from 'expo-location';
import { LocationConfig, LocationState } from '../types';
import { DISTANCE_CONSTANTS } from '../utils/distance';

export class LocationService {
    private isTracking: boolean = false;
    private locationSubscription: Location.LocationSubscription | null = null;
    private config: LocationConfig;
    private onLocationUpdate?: (location: Location.LocationObject) => void;
    private onError?: (error: Error) => void;

    constructor() {
        this.config = {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: DISTANCE_CONSTANTS.LOCATION_UPDATE_INTERVAL,
            distanceInterval: DISTANCE_CONSTANTS.LOCATION_DISTANCE_FILTER,
        };
    }

    // pапрашивает разрешение на доступ к местоположению
    async requestPermissions(): Promise<boolean> {
        try {
            const {status} = await Location.requestForegroundPermissionsAsync();

            if (status !== "granted") {
                console.warn ("Разрешение на доступ к местоположению не получено");
                return false;
            }

            console.log("Разрешение на доступ к местоположению получено");
            return true;
        } catch (error) {
            console.error("Ошибка запроса разрешений на местоположение", error);
            return false;
        }
    }

    // проверка статуса разрешений
    async getPermissionStatus(): Promise<Location.PermissionStatus> {
        try {
            const {status} = await Location.getForegroundPermissionsAsync();
            return status;
        } catch (error) {
            console.error("Ошибка проверки статуса разрешений", error);
            return Location.PermissionStatus.UNDETERMINED;
        }
    }

    // получает текущее местоположение 
    async getCurrentLocation(): Promise<Location.LocationObject | null> {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                throw new Error("Нет разрешения на доступ к местоположению");
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: this.config.accuracy,
            });

            console.log("Получено текущее местоположение:", {
                lat: location.coords.latitude.toFixed(6),
                lng: location.coords.longitude.toFixed(6),
                accuracy: location.coords.accuracy,
            });

            return location;
        } catch (error) {
            console.error("Ошибка получения текущего местоположения", error);
            this.onError?.(error as Error);
            return null;
        }
    }

    // запускает отслеживание местоположения
    async startTracking (
        onLocationUpdate: (location: Location.LocationObject) => void,
        onError?: (error: Error) => void
    ): Promise<boolean> {
        try {
            if (this.isTracking) {
                console.log("Отслеживание местоположения уже активно");
                return true;
            }

            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                throw new Error("Нет разрешения на доступ к местоположению");
            }

            this.onLocationUpdate = onLocationUpdate;
            this.onError = onError;

            // проверка доступности служб местоположения
            const isEnabled = await Location.hasServicesEnabledAsync();
            if (!isEnabled) {
                throw new Error ("Службы местоположения отключены");
            }

            // начинаем отслеживание
            this.locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: this.config.accuracy,
                    timeInterval: this.config.timeInterval,
                    distanceInterval: this.config.distanceInterval,
                },
                (location) => {
                    console.log("Обновление местоположения", {
                        lat: location.coords.latitude.toFixed(6),
                        lng: location.coords.longitude.toFixed(6),
                        timestamp: new Date(location.timestamp).toLocaleTimeString(),
                    });

                    this.onLocationUpdate?.(location);
                }
            );

            this.isTracking = true;
            console.log("Отслеживание местоположения запущено");
            return true;
        } catch (error) {
            console.error("Ошибка запуска отслеживания местоположения", error);
            this.onError?.(error as Error);
            return false;
        }
    }

    // останавливает отслеживание
    stopTracking(): void {
        try {
            if (this.locationSubscription) {
                this.locationSubscription.remove();
                this.locationSubscription = null;
            }

            this.isTracking = false;
            this.onLocationUpdate = undefined;
            this.onError = undefined;

            console.log("Отслеживание местоположения остановлено");
        } catch (error) {
            console.error("Ошибка остановки отслеживания местоположения", error);
        }
    }

    // проверяет активно ли отслеживание
    getTrackingStatus(): boolean {
        return this.isTracking;
    }

    // обновляет конфигурацию отслеживания
    updateConfig(newConfig: Partial<LocationConfig>): void {
        this.config = { ...this.config, ...newConfig};

        // если отслеживание активно, то перезапускаем с новой конфигурацией
        if (this.isTracking && this.onLocationUpdate) {
            const callback = this.onLocationUpdate;
            const errorCallback = this.onError;

            this.stopTracking();
            setTimeout(() => {
                this.startTracking(callback, errorCallback);
            }, 100);
        }
    }

    // получает текущую конфигурацию
    getConfig(): LocationConfig {
        return { ...this.config };
    }

    // проверяет доступность служб местоположения
    async checkLocationServices(): Promise<boolean> {
        try {
            return await Location.hasServicesEnabledAsync();
        } catch (error) {
            console.error("Ошибка проверки служб местоположения", error);
            return false;
        }
    }

    // получает информацию о провайдере местоположения
    async getProviderStatus(): Promise<Location.LocationProviderStatus | null> {
        try {
            return await Location.getProviderStatusAsync();
        } catch (error) {
            console.error("Ошибка получения статуса провайдера", error);
            return null;
        }
    }

    // получает последнее известное местоположение
    async getLastKnownLocation(): Promise<Location.LocationObject | null> {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                return null;
            }

            return await Location.getLastKnownPositionAsync();
        } catch (error) {
            console.error("Ошибка получения последнего местоположения", error);
            return null;
        }
    }

    // очистка ресурсов
    cleanup(): void {
        this.stopTracking();
        console.log("LocationService очищен");
    }
}

// создаем единственный экземпляр
export const locationService = new LocationService();