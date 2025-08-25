import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MarkerData, ImageData, DBMarker, DBMarkerImage } from '../types';
import { useDatabase } from './DatabaseContext';

interface MarkerContextType {
    markers: MarkerData[];
    isLoading: boolean;
    error: Error | null;

    // операции с маркерами
    addMarker: (latitude: number, longitude: number) => Promise<MarkerData>;
    deleteMarker: (markerId: string) => Promise<void>;
    getMarker: (markerId: string) => MarkerData | undefined;
    refreshMarkers: () => Promise<void>;

    // операции с изображениями
    addImageToMarker: (markerId: string, uri: string) => Promise<void>;
    removeImageFromMarker: (markerId: string, imageId: string) => Promise<void>;
    refreshMarkerImages: (markerId: string) => Promise<void>;
}

const MarkerContext = createContext<MarkerContextType | undefined>(undefined);

interface MarkerProviderProps {
    children: ReactNode;
}

export function MarkerProvider ({ children }: MarkerProviderProps) {
    const [markers, setMarkers] = useState<MarkerData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null> (null);

    const database = useDatabase();

    useEffect(() => {
        if (database.isInitialized) {
            refreshMarkers();
        }
    }, [database.isInitialized]);
    
    // утилитарная функция для преобразования DB сущностей в UI модели
    const convertDBMarkerToMarkerData = async (dbMarker: DBMarker): Promise<MarkerData> => {
        const images = await database.getMarkerImages(dbMarker.id);
        return {
        id: dbMarker.id.toString(),
        latitude: dbMarker.latitude,
        longitude: dbMarker.longitude,
        title: `Маркер ${dbMarker.id}`,
        description: 'Маркер с базы данных',
        images: images.map(convertDBImageToImageData),
        createdAt: new Date(dbMarker.created_at),
        };
    };

    const convertDBImageToImageData = (dbImage: DBMarkerImage): ImageData => {
        return {
        id: dbImage.id.toString(),
        uri: dbImage.uri,
        name: `image_${dbImage.id}.jpg`,
        type: 'image/jpeg',
        addedAt: new Date(dbImage.created_at),
        };
    };

    // операции с маркерами
    const addMarker = async (latitude: number, longitude: number): Promise<MarkerData> => {
        try {
            setIsLoading(true);
            setError(null);

            const dbMarkerId = await database.addMarker(latitude, longitude);
            const dbMarker: DBMarker = {
                id: dbMarkerId,
                latitude,
                longitude,
                created_at: new Date().toISOString(),
            };

            const newMarker = await convertDBMarkerToMarkerData(dbMarker);
            setMarkers(prevMarkers => [...prevMarkers, newMarker]);

            return newMarker;
        } catch (error) {
            console.error("Ошибка добавления маркера: ", error);
            setError(error as Error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteMarker = async (markerId: string): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            const numericId = parseInt(markerId, 10);
            await database.deleteMarker(numericId);

            setMarkers(prevMarkers => prevMarkers.filter(marker => marker.id !== markerId));
        } catch (error) {
            console.error("Ошибка удаления маркера: ", error);
            setError(error as Error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const refreshMarkers = async (): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            const dbMarkers = await database.getMarkers();
            const markersWithImages = await Promise.all(
                dbMarkers.map(convertDBMarkerToMarkerData)
            );

            setMarkers(markersWithImages);
        } catch (error) {
            console.error("Ошибка загрузки маркеров: ", error);
            setError(error as Error);
        } finally {
            setIsLoading(false);
        }
    };

    const getMarker = (markerId: string): MarkerData | undefined => {
        return markers.find(marker => marker.id === markerId);
    };

    // операции с изображениями
    const addImageToMarker = async (markerId: string, uri: string): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            const numericId = parseInt(markerId, 10);
            await database.addImage(numericId, uri);

            // обновляем локальное состояние
            await refreshMarkerImages(markerId);
        } catch (error) {
            console.error("Ошибка добавления изображения: ", error);
            setError(error as Error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const removeImageFromMarker = async (markerId: string, imageId: string): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            const numericImageId = parseInt(imageId, 10);
            await database.deleteImage(numericImageId);

            // обновляем локальное состояние
            await refreshMarkerImages(markerId);
        } catch (error) {
            console.error("Ошибка удаления изображения:", error);
            setError(error as Error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const refreshMarkerImages = async (markerId: string): Promise<void> => {
        try {
            const numericId = parseInt(markerId, 10);
            const images = await database.getMarkerImages(numericId);

            setMarkers(prevMarkers =>
                prevMarkers.map(marker => 
                    marker.id === markerId
                    ? { ...marker, images: images.map(convertDBImageToImageData) }
                    : marker
                )
            );
        } catch (error) {
            console.error("Ошибка обновления изображений маркера: ", error);
            setError(error as Error);
        }
    };

    const value: MarkerContextType = {
        markers,
        isLoading,
        error,
        addMarker,
        deleteMarker,
        getMarker,
        refreshMarkers,
        addImageToMarker,
        removeImageFromMarker,
        refreshMarkerImages,
    };

    return (
        <MarkerContext.Provider value = {value}>
            {children}
        </MarkerContext.Provider>
    );
};

export function useMarkers() {
    const context = useContext(MarkerContext);
    if (context === undefined) {
        throw new Error ("useMarkers должен быть использован вместе с MarkerProvider");
    }
    return context;
}

