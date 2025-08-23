import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DatabaseContextType, DBMarker, DBMarkerImage } from '../types';
import { databaseService, DatabaseError } from '../services/database';

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
    children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        initializeDatabase();

        // клинап при размонтировании
        return () => {
            databaseService.close();
        };
    }, []);

    const initializeDatabase = async () => {
        try {
            setIsLoading(true);
            setError(null);

            await databaseService.initialize();
            setIsInitialized(true);

            console.log("DatabaseContext: База данных инициализирована");
        } catch (error) {
            console.error("DatabaseContext: Ошибка инициализации: ", error);
            setError(error as Error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDatabaseOperation = async <T,>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> => {
        try {
            setError (null);
            const result = await operation();
            console.log(`DatabaseContext: ${operationName} выполнена успешно`);
            return result;
        } catch (error) {
            console.error(`DatabaseContext: Ошибка в ${operationName}: `, error);
            const dbError = error instanceof DatabaseError 
            ? error
            : new DatabaseError(`Ошибка выполнения операции: ${operationName}`);
            setError(dbError);
            throw dbError;
        }
    };

    // операции с маркерами
    const addMarker = async (latitude: number, longitude: number): Promise<number> => {
        return handleDatabaseOperation(
            () => databaseService.addMarker(latitude, longitude),
            'добавление маркера'
        );
    };

    const deleteMarker= async (id: number): Promise<void> => {
        return handleDatabaseOperation(
            () => databaseService.deleteMarker(id),
            'удаление маркера'
        );
    };

    const getMarkers = async (): Promise<DBMarker[]> => {
        return handleDatabaseOperation(
            () => databaseService.getMarkers(),
            'получение маркеров'
        );
    };

    // операции с изображениями
    const addImage = async (markerId: number, uri: string): Promise<void> => {
        return handleDatabaseOperation(
            () => databaseService.addImage(markerId, uri),
            'добавление изображений'
        );
    };

    const deleteImage = async (id: number): Promise<void> => {
        return handleDatabaseOperation(
            () => databaseService.deleteImage(id),
            'удаление изображений'
        );
    };

    const getMarkerImages = async (markerId: number): Promise<DBMarkerImage[]> => {
        return handleDatabaseOperation(
            () => databaseService.getMarkerImages(markerId),
            'получение изображений маркера'
        );
    };

    // утилитарные методы
    const clearError = () => {
        setError(null);
    };

    const retryLastOperation = async () => {
        if (error) {
            await initializeDatabase();
        }
    };

    const value: DatabaseContextType = {
        // операции с бд
        addMarker,
        deleteMarker,
        getMarkers,
        addImage,
        deleteImage,
        getMarkerImages,

        // статусы
        isLoading,
        error,
        isInitialized,
    };

    return (
        <DatabaseContext.Provider value = {value}>
            { children }
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    const context = useContext(DatabaseContext);
    if (context === undefined) {
        throw new Error ("useDatabase должен использоваться внутри DatabaseProvider")
    }
    return context;
}

// хук для обработки ошибок бд
export function useDatabaseError() {
    const { error } = useDatabase();

    const getErrorMessage = (error: Error | null): string => {
        if (!error) return '';

        if (error instanceof DatabaseError) {
            switch (error.code) {
                case 'SQLITE_CONSTRAINT':
                    return "Нарушение ограничений базы данных";
                case 'SQLITE_BUSY':
                    return "База данных занята, попробуйте позже";
                case 'SQLITE_CORRUPT':
                    return "База данных повреждена";
                default:
                    return error.message || "Ошибка базы данных";
            }
        }

        return error.message || "Неизвестная ошибка";
    };

    const isNetworkError = (error: Error | null): boolean => {
        return error?.message.includes("network") || error?.message.includes("connection") || false;
    };

    const isRecoverableError = (error: Error | null): boolean => {
        if (!error) return false;

        if (error instanceof DatabaseError) {
            return error.code === "SQLITE_BUSY" || error.code === "SQLITE_LOCKED";
        }

        return isNetworkError(error);
    };

    return {
        error,
        errorMessage: getErrorMessage(error),
        isNetworkError: isNetworkError(error),
        isRecoverableError: isRecoverableError(error),
    };
}