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