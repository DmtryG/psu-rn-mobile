import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ActiveNotification, MarkerData } from '../types';
import { formatDistance, DISTANCE_CONSTANTS } from '../utils/distance';

// настройка поведения уведомлений
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export class NotificationManager {
    private activeNotifications: Map<string, ActiveNotification>;
    private isInitialized: boolean = false;

    constructor() {
        this.activeNotifications = new Map();
    }

    // инциализация системы уведомлений
    async initialize(): Promise<boolean> {
        try {
            if (this.isInitialized) {
                return true;
            }

            // запрашиваем разрешения
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== "granted") {
                const {status} = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== "granted") {
                console.warn("Разрешение на отправку уведомлений не получено");
                return false;
            }

            // настроить для андройда

            this.isInitialized = true;
            console.log("NotificationManager инициализирован");
            return true;
        } catch (error) {
            console.error ("Ошибка инициализации NotificationManager");
            return false;
        }
    }

    // показывает уведомление о приближении к маркеру
    async showProximityNotification(
        marker: MarkerData,
        distance: number
    ): Promise<void> {
        try {
            if (!this.isInitialized) {
                const initialized = await this.initialize();
                if (!initialized) {
                    return;
                }
            }

            // проверяем, есть ли уже активное уведомление для маркера
            if (this.activeNotifications.has(marker.id)) {
                const existing = this.activeNotifications.get(marker.id)!;

                // проверяем период кулдауна
                const timeSinceLastNotification = Date.now() - existing.timestamp;
                if (timeSinceLastNotification < DISTANCE_CONSTANTS.DEFAULT_COOLDOWN_PERIOD) {
                    return; // слишком рано для нового уведомления
                }

                // удаляем старое уведомление
                await this.removeNotification(marker.id);
            }

            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "🧭 Вы рядом с маркером!",
                    body: `Вы находитесь в ${formatDistance(distance)} от "${marker.title || 'маркера'}"`,
                    data: {
                        markerId: marker.id,
                        distance: distance,
                        type: "proximity"
                    },
                    sound: "default",
                },
                trigger: null, // отправляется сразу
                ...(Platform.OS === 'android' && {
                    identifier: `proximity_${marker.id}`,
                }),
            });

            // сохраняем информацию об активном уведомлении
            this.activeNotifications.set(marker.id, {
                markerId: marker.id,
                notificationId,
                timestamp: Date.now(),
                distance: distance,
            });

            console.log(`Уведомление отправлено для маркера ${marker.id} (${formatDistance(distance)})`);
        } catch (error) {
            console.error("Ошибка отправки уведомления:", error);
        }
    }

    // удаляет уведомление для конкретного маркера
    async removeNotification(markerId: string): Promise<void> {
        try {
            const notification = this.activeNotifications.get(markerId);
            if (notification) {
                await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
                this.activeNotifications.delete(markerId);
                console.log(`Уведомление удалено для маркера ${markerId}`);
            }
        } catch (error) {
            console.error("Ошибка удаления уведомления: ", error);
        }
    }

    // удаляет все активные уведомления
    async clearAllNotifications(): Promise<void> {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            this.activeNotifications.clear();
            console.log("Все уведомления очищены");
        } catch (error) {
            console.error("Ошибка очистки уведомлений: ", error);
        }
    }
    
    // возвращает список активных уведомлений
    getActiveNotifications(): ActiveNotification[] {
        return Array.from(this.activeNotifications.values());
    }

    // проверяет, есть ли активное уведомление для маркера
    hasActiveNotification(markerId: string): boolean {
        return this.activeNotifications.has(markerId);
    }

    // тест
    async sendTestNotification(): Promise<void> {
        try {
            if (!this.isInitialized) {
                const initialized = await this.initialize();
                if (!initialized) {
                    console.warn("Не удалось инициализировать уведомление");
                    return;
                }
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Тест",
                    body: "Body тест",
                    data: { type: "test" },
                },
                trigger: null,
            });

            console.log("Тестовое уведомление отправлено");
        } catch (error) {
            console.error("Ошибка отправки тестового уведомления: ", error);
        }
    }

    // получаем статус разрешения
    async getPermissionsStatus(): Promise<string> {
        try {
            const {status} = await Notifications.getPermissionsAsync();
            return status;
        } catch (error) {
            console.error("Ошибка получения статуса разрешения:", error);
            return "undetermined";
        }
    }

    // настройка обработчиков уведомлений
    setupNotificationListeners() {
        // обработчик нажатия на уведомление
        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log("Уведомление получено:", notification);
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log ("Пользователь взаимодействовал с уведомлением: ", response);

            const data = response.notification.request.content.data;
            if (data?.type === 'proximity' && data?.markerId) {
                console.log("Переход к маркеру: ", data.markerId);
            }
        });

        return {
            notificationListener,
            responseListener,
            remove: () => {
                notificationListener.remove();
                responseListener.remove();
            }
        };
    }

    // очистка ресурсов
    async cleanup(): Promise<void> {
        try {
            await this.clearAllNotifications();
            this.activeNotifications.clear();
            this.isInitialized = false;
            console.log("NotificationManager очищен");
        } catch (error) {
            console.error("Ошибка очистки NotificationManager:", error);
        }
    }
}

// создаем единственный экземпляр
export const notificationManager = new NotificationManager();