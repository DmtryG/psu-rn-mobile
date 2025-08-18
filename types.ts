export interface MarkerData {
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
    images: ImageData[];
    createdAt: Date;
}

export interface ImageData {
    id: string;
    uri: string;
    name?: string;
    type?: string;
    size?: number;
    addedAt: Date;
}

export interface NavigationParams {
    markerId?: string;
}

export interface MapRegion {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

export interface Coordinate {
    latitude: number;
    longitude: number;
}

export interface MapPressEvent {
    nativeEvent: {
        coordinate: Coordinate;
    };
}

// сущности для бд
export interface DBMarker {
    id: number;
    latitude: number;
    longitude: number;
    created_at: string;
}

export interface DBMarkerImage {
    id: number;
    marker_id: number;
    uri: string;
    created_at: string;
}

export interface DatabaseContextType {
    // операции с бд
    addMarker: (latitude: number, longitude: number) => Promise<number>;
    deleteMarker: (id: number) => Promise<void>;
    getMarkers: () => Promise<DBMarker[]>;
    addImage: (markerId: number, uri: string) => Promise<void>;
    deleteImage: (id: number) => Promise<void>;
    getMarkerImages: (markerId: number) => Promise<DBMarkerImage[]>;

    // статусы
    isLoading: boolean;
    error: Error | null;
    isInitialized: boolean;
}