export interface MarkerData {
    id: string;
    latitude: number;
    longtitude: number;
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
    longtitude: number;
    latitudeDelta: number;
    longtitudeDelta: number;
}

export interface Coordinate {
    latitude: number;
    longtitude: number;
}

export interface MapPressEvent {
    nativeEvent: {
        coordinate: Coordinate;
    };
}