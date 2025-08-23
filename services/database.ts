import * as SQLite from 'expo-sqlite';
import { DBMarker, DBMarkerImage } from '../types';
import { MigrationManager } from './migrations';

const DATABASE_NAME = "markers.db";
const DATABASE_VERSION = 1;

class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;
    private isInitialized = false;
    private migrationManager: MigrationManager | null = null;
    
    async initialize(): Promise<void> {
        try {
            if (this.isInitialized) return;

            this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
            this.migrationManager = new MigrationManager(this.db);

            await this.migrationManager.migrate();

            // валидация бд после миграции
            const isValid = await this.migrationManager.validateDatabase();
            if (!isValid) {
                throw new DatabaseError("База данных не прошла валидацию");
            }

            this.isInitialized = true;
            console.log("База данных успешно инициализирована");
        } catch (error) {
            console.error("Ошибка инициализации базы данных:", error);
            throw new DatabaseError("Не удалось инициализировать базу данных");
        }
    }

    // утилитарные методы для работы с миграциями
    async forceMigration(targetVersion?: number): Promise<void> {
        if (!this.migrationManager) {
            throw new DatabaseError("Менеджер миграций не инициализирован");
        }

        try {
            await this.migrationManager.migrate(targetVersion);
            console.log("Принудительная миграция завершена");
        } catch (error) {
            console.error("Ошибка принудительной миграции:", error);
            throw new DatabaseError("Не удалось выполнить принудительную миграцию");
        }
    }

    async getDatabaseSchema(): Promise<string[]> {
        if (!this.migrationManager) {
            throw new DatabaseError("Менеджер миграций не инициализирован");
        }

        return this.migrationManager.getSchema();
    }

    async getDatabaseVersion(): Promise<number> {
        if (!this.migrationManager) {
            throw new DatabaseError("Менеджер миграций не инициализирован");
        }

        return this.migrationManager.getCurrentVersion();
    }

    // CRUD операции для маркеров
    async addMarker(latitude: number, longitude: number): Promise<number> {
        if (!this.db) throw new DatabaseError("База данных не инициализирована");

        try {
            const result = await this.db.runAsync(
                'INSERT INTO markers (latitude, longitude) VALUES (?, ?)',
                [latitude, longitude]
            );

            console.log("Маркер добавлен с ID: ", result.lastInsertRowId);
            return result.lastInsertRowId;
        } catch (error) {
            console.error("Ошибка добавления маркера: ", error);
            throw new DatabaseError("Не удалось добавить маркер");
        }
    }

    async getMarkers(): Promise<DBMarker[]> {
        if (!this.db) throw new DatabaseError("База данных не инициализирована");

        try {
            const markers = await this.db.getAllAsync<DBMarker>(
                'SELECT * FROM markers ORDER BY created_at DESC'
            );

            console.log ("Получено маркеров: ", markers.length);
            return markers;
        } catch (error) {
            console.error("Ошибка получения маркеров: ", error);
            throw new DatabaseError("Не удалось получит маркеры");
        }
    }

    async deleteMarker (id: number): Promise<void> {
        if (!this.db) throw new DatabaseError("База данных не инициализирована");

        try {
            // используем транзакцию для удаления маркера и связанных изображений
            await this.db.withTransactionAsync(async() => {
                // сначала удаляем все изображения маркера
                await this.db!.runAsync('DELETE FROM marker_images WHERE marker_id = ?', [id]);

                // теперь удаляем сам маркер
                const result = await this.db!.runAsync('DELETE FROM markers WHERE id = ?', [id]);

                if (result.changes === 0) {
                    throw new DatabaseError("Маркер не найден");
                }
            });

            console.log ("Маркер удален с ID: ", id);
        } catch (error) {
            console.error ("Ошибка удаления маркера: ", error);
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError('Не удалось удалить маркер');
        }
    }

    // CRUD операции для изображений
    async addImage(markerId: number, uri: string): Promise<void> {
        if (!this.db) throw new DatabaseError("База данных не инициализирована");

        try {
            await this.db.runAsync(
                'INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)',
                [markerId, uri]
            );

            console.log("Изображение добавлено для маркера: ", markerId);
        } catch (error) {
            console.error ("Ошибка добавления изображения: ", error);
            throw new DatabaseError("Не удалось добавить изображение");
        }
    }

    async getMarkerImages(markerId: number): Promise<DBMarkerImage[]> {
        if (!this.db) throw new DatabaseError("База данных не инициализирована");

        try {
            const images = await this.db.getAllAsync<DBMarkerImage>(
                'SELECT * FROM marker_images WHERE marker_id = ? ORDER BY created_at DESC',
                [markerId]
            );

            console.log("Получено изображений для маркера: ", markerId, " : ", images.length);
            return images;
        } catch (error) {
            console.error("Ошибка получения изображений: ", error);
            throw new DatabaseError("Не удалось получить изображение");
        }
    }

    async deleteImage(id: number): Promise<void> {
        if (!this.db) throw new DatabaseError("База данных не инициализирована");

        try {
            const result = await this.db.runAsync('DELETE FROM marker_images WHERE id = ?', [id]);

            if (result.changes === 0) {
                throw new DatabaseError("Изображение не найдено");
            }

            console.log("Изображение удалено с ID:", id);
        } catch (error) {
            console.error("Ошибка удаления изображения: ", error);
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError("Не удалось удалить изображение");
        }
    }

    // утилитарные методы
    async close(): Promise<void> {
        try {
            if (this.db) {
                await this.db.closeAsync();
                this.db = null;
                this.isInitialized = false;
                console.log("Соединение с базой данных закрыто");
            }
        } catch (error) {
            console.error("Ошибка закрытия базы данных: ", error);
        }
    }

    getInitializationStatus(): boolean {
        return this.isInitialized;
    }
}

// класс ошибок бд
export class DatabaseError extends Error {
    public code?: string;
    public constraint?: string;

    constructor(message: string, code?: string, constraint?: string) {
        super(message);
        this.name = "DatabaseError";
        this.code = code;
        this.constraint = constraint;
    }
}

// создаем единственный экземпляр сервиса
export const databaseService = new DatabaseService();