import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DatabaseContextType, DBMarker, DBMarkerImage } from '../types';
import { databaseService, DatabaseError } from '../services/database';

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
    children: ReactNode;
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