// утилиты для работы с геолокацией и расчета расстояний

// вычисляем расстояние между двумя точками на Земле по формуле Хаверсина
export const calculateDistance = (
    lat1: number, // широта первой точки в градусах
    lon1: number, // долгота первой точки в градусах
    lat2: number, // широта второй точки в градусах
    lon2: number // долгота второй точки в градусах
): number => {
    // радиус Земли в метрах
    const R = 6371000;

    // конвертируем градусы в радианы
    const f1 = (lat1 * Math.PI) / 180;
    const f2 = (lat2 * Math.PI) / 100;
    const deltaF = ((lat2 - lat1) * Math.PI) / 180;
    const deltaL = ((lon2 - lon1) * Math.PI) / 180;

    // формула Хаверсина
    const a = 
        Math.sin(deltaF / 2) * Math.sin(deltaF / 2) +
        Math.cos(f1) * Math.cos(f2) * Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // расстояние в метрах
    const distance = R * c;

    return Math.round(distance);
};

// проверка находится ли точка в пределах заданного радиуса
export const isWithinRadius = (
    centerLat: number, // широта центра
    centerLon: number, // долгота центра
    pointLat: number, // широта точки
    pointLon: number, // долгота точки 
    radius: number // радиус в метрах
): boolean => {
    const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
    return distance <= radius;
}; 

// форматирует расстояние для отображения пользователю
export const formatDistance = (distance: number): string => {
    if (distance < 1000) {
        return `${distance} м`;
    } else {
        const km = (distance / 1000).toFixed(1);
        return `${km} км` // отформатированная строка
    }
};

// вычисляет подходящий регион карты для отображения всех маркеров
export const calculateMapRegion = (
    locations: { latitude: number, longitude: number }[], // массив координат
    padding: number = 0.01 // отступ в градусах
) => {
    if (locations.length === 0) {
        return {
            latitude: 55.7558,
            longitude: 37.6173,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        };
    }

    if (locations.length === 1) {
        return {
            latitude: locations[0].latitude,
            longitude: locations[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    }

    const latitudes = locations.map(loc => loc.latitude);
    const longitudes = locations.map(loc => loc.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    const latDelta = (maxLat - minLat) + padding;
    const lonDelta = (maxLon - minLon) + padding;

    return {
        latitude: centerLat,
        longitude: centerLon,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lonDelta, 0.01),
    };
}

// проверяет валидность координат
export const isValidCoordinate = (latitude: number, longitude: number): boolean => {
    return (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
};

// константы для работы с расстояниями
export const DISTANCE_CONSTANTS = {
    DEFAULT_PROXIMITY_THRESHOLD: 100, // 100 метров
    MIN_PROXIMITY_THRESHOLD: 50, // 50 метров
    MAX_PROXIMITY_THRESHOLD: 1000, // 1км
    DEFAULT_COOLDOWN_PERIOD: 300000, // 5 минут в мс
    LOCATION_UPDATE_INTERVAL: 5000, // 5 секунд
    LOCATION_DISTANCE_FILTER: 5, // 5 метров
} as const;