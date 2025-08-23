import * as SQLite from 'expo-sqlite';

export interface Migration {
    version: number;
    description: string;
    up: (db: SQLite.SQLiteDatabase) => Promise<void>;
    down?: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

// миграция базы данных
export const migrations: Migration[] = [
    {
        version: 1,
        description: 'Создание базовых таблиц markers и marker_images',
        up: async (db: SQLite.SQLiteDatabase) => {
            // создание таблицы маркеров
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS markers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            `);
            
            // создание таблицы изображений
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS marker_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marker_id INTEGER NOT NULL,
                uri TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (marker_id) REFERENCES markers (id) ON DELETE CASCADE
            );
            `)

            // создание индексов
            await db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_marker_images_marker_id
                ON marker_images (marker_id);
            `);

            console.log ("Миграция v1: Базовые таблицы созданы");
        },
        down: async (db: SQLite.SQLiteDatabase) => {
            await db.execAsync('DROP INDEX IF EXISTS idx_marker_images_marker_id;');
            await db.execAsync('DROP TABLE IF EXISTS marker_images;');
            await db.execAsync('DROP TABLE IF EXISTS markers;');
            console.log('Миграция v1: Таблицы удалены');
        }
    },
];

export class MigrationManager {
    private db: SQLite.SQLiteDatabase;

    constructor (database: SQLite.SQLiteDatabase) {
        this.db = database;
    }

    async getCurrentVersion(): Promise<number> {
        try {
            const result = await this.db.getFirstAsync<{ user_version: number }> (
                'PRAGMA user_version'   
            );
            return result?.user_version || 0;
        } catch (error) {
            console.error ("Ошибка получения версии БД:", error);
            return 0;
        }
    }

    async setVersion (version: number): Promise<void> {
        try {
            await this.db.execAsync (`PRAGMA user_version = ${version}`);
            console.log (`Версия БД установлена: ${version}`);
        } catch (error) {
            console.error('Ошибка установки версии БД:', error);
            throw error;
        }
    }

    async migrate (targetVersion?: number): Promise<void> {
        const currentVesion = await this.getCurrentVersion();
        const finalVersion = targetVersion || this.getLatestVersion();

        console.log (`Миграция с версии ${currentVesion} до версии ${finalVersion}`);

        if (currentVesion === finalVersion) {
            console.log("База данных уже актуальна");
            return;
        }

        if (currentVesion > finalVersion) {
            await this.migrateDown (currentVesion, finalVersion);
        } else {
            await this.migrateUp (currentVesion, finalVersion);
        }

        await this.setVersion (finalVersion);
        console.log (`Миграция успешно завершена. Текущая версия: ${finalVersion}`);
    }

    private async migrateUp (fromVersion: number, toVersion: number): Promise<void> {
        const applicableMigrations = migrations.filter(
            m => m.version > fromVersion && m.version <= toVersion
        ).sort ((a, b) => a.version - b.version);

        for (const migration of applicableMigrations) {
            console.log (`Применение миграции v${migration.version}: ${migration.description}`);

            try {
                await this.db.withTransactionAsync (async () => {
                    await migration.up(this.db);
                });
                console.log(`Миграция v${migration.version} применена успешно`);
            } catch (error) {
                console.error (`Ошибка применения миграции v${migration.version}: `, error);
                throw new Error (`Не удалось применить миграцию v${migration.version}: ${error}`);
            }
        }
    }
    
    private async migrateDown (fromVersion: number, toVersion: number): Promise<void> {
        const applicableMigrations = migrations.filter(
            m => m.version <= fromVersion && m.version > toVersion && m.down
        ).sort((a, b) => b.version - a.version);

        for (const migration of applicableMigrations) {
            console.log(`Откат миграции v${migration.version}: ${migration.description}`);

            try {
                await this.db.withTransactionAsync (async () => {
                    await migration.down!(this.db);
                });
                console.log(`Миграция v${migration.version} успешно отменена`);
            } catch (error) {
                console.error(`Ошибка отката миграции v${migration.version}:`, error);
                throw new Error(`Не удалось отменить миграцию v${migration.version}: ${error}`);
            }
        }
    }

    private getLatestVersion (): number {
        return Math.max(...migrations.map(m => m.version), 0);
    }

    async validateDatabase(): Promise<boolean> {
        try {
            // проверяем, что все необходимые таблицы существуют
            const tables = await this.db.getAllAsync<{ name: string }>(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            );

            const tableNames = tables.map(t => t.name);
            const requiredTables = ['markers', 'marker_images'];

            const missingTables = requiredTables.filter(t => !tableNames.includes(t));

            if (missingTables.length > 0) {
                console.error('Отсутствуют таблицы:', missingTables);
                return false;
            }

            console.log("Валидация БД прошла успешно");
            return true;
        } catch (error) {
            console.error('Ошибка валидации БД:', error);
            return false;
        }
    }

    async getSchema(): Promise<string[]> {
        try {
            const schema = await this.db.getAllAsync<{ sql: string }>(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            );

            return schema.map(s => s.sql).filter(Boolean);
        } catch (error) {
            console.error("Ошибка получения схемы БД:", error);
            return [];
        }
    }
}