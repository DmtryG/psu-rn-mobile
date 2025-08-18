import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MarkerData, ImageData } from '../types';

interface MarkerContextType {
    markers: MarkerData[];

    addMarker: (marker: MarkerData) => void;
    updateMarker: (markerId: string, updates: Partial<MarkerData>) => void;
    deleteMarker: (markerId: string) => void;
    getMarker: (markerId: string) => MarkerData | undefined;
    addImageToMarker: (markerId: string, image: ImageData) => void;
    removeImageFromMarker: (markerId: string, imageId: string) => void;
}

const MarkerContext = createContext<MarkerContextType | undefined>(undefined);

interface MarkerProviderProps {
    children: ReactNode;
}

export function MarkerProvider ({ children }: MarkerProviderProps) {
    const [markers, setMarkers] = useState<MarkerData[]>([]);
    
    const addMarker = (marker: MarkerData) => {
        setMarkers (prevMarkers => [...prevMarkers, marker]);
    };

    const updateMarker = (markerId: string, updates: Partial<MarkerData>) => {
        setMarkers (prevMarkers => 
            prevMarkers.map(marker => 
                marker.id === markerId ? { ...marker, ...updates}: marker
            )
        );
    };

    const deleteMarker = (markerId: string) => {
        setMarkers (prevMarkers => prevMarkers.filter(marker => marker.id !== markerId));
    };

    const getMarker = (markerId: string) => {
        return markers.find (marker => marker.id === markerId);
    };

    const addImageToMarker = (markerId: string, image: ImageData) => {
        setMarkers (prevMarkers => 
            prevMarkers.map (marker =>
                marker.id === marker.id ? { ...marker, 
                    images: [...marker.images, image]
                }: marker
            )
        );
    };

    const removeImageFromMarker = (markerId: string, imageId: string) => {
        setMarkers (prevMarkers =>
            prevMarkers.map(marker =>
                marker.id === markerId ? { ...marker, 
                    images: marker.images.filter(img => img.id !== imageId)
                }: marker
            )
        );
    };

    const value: MarkerContextType = {
        markers,
        addMarker,
        updateMarker,
        deleteMarker,
        getMarker,
        addImageToMarker,
        removeImageFromMarker,
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

