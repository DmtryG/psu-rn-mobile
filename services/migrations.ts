import * as SQLite from 'expo-sqlite';

export interface Migration {
    version: number;
    description: string;
    up: (db: SQLite.SQLiteDatabase) => Promise<void>;
    down?: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

// миграция базы данных


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
            m => m.version > fromVersion $$ m.version <= toVersion
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

}