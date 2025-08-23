import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Dimensions, Platform, ActivityIndicator} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ImageData } from '../../types';
import { useMarkers } from '../../contexts/MarkerContext';
import { useDatabase } from '../../contexts/DatabaseContext';

const { width } = Dimensions.get("window");
const imageSize = width / 1.5;

export default function MarkerDetailScreen() {
    const params = useLocalSearchParams();
    const { id, latitude, longitude, title } = params;
    const {
        getMarker,
        addImageToMarker,
        removeImageFromMarker,
        refreshMarkerImages,
        isLoading: markersLoading,
        error
    } = useMarkers();
    const { isInitialized } = useDatabase();
    const [ isImageLoading, setIsImageLoading ] = useState(false);

    const markerId = Array.isArray(id) ? id[0]: id;
    const marker = markerId ? getMarker(markerId): undefined;

    useEffect(() => {
        requestPermissions();

        // обновляем изображения при входе в экран
        if (markerId && isInitialized ) {
            refreshMarkerImages(markerId);
        }
    }, [markerId, isInitialized]);

    const requestPermissions = async () => {
        if (Platform.OS !== "web") {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Разрешение", "Необходимо разрешение для доступа к галерее"
                );
            }
        }
    };

    const showImageSourceOptions = () => {
        Alert.alert (
            "Добавить изображение", "Выберите изображение",
            [
                {
                    text: "Отмена",
                    style: "cancel",
                },
                {
                    text: "Галерея",
                    onPress: pickImageFromGallery,
                },
            ]
        );
    };

    const pickImageFromGallery = async () => {
        try {
            setIsImageLoading(true);
            const result = await ImagePicker.launchImageLibraryAsync ({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                await addImage(result.assets[0]);
            }
        } catch (error) {
            console.error ("Ошибка выбора изображения", error);
            Alert.alert("Ошибка", "Не удалось выбрать изображение");
        } finally {
            setIsImageLoading(false);
        }
    };

    const addImage = async ( asset: ImagePicker.ImagePickerAsset) => {
        if (!markerId) return;

        try {
            await addImageToMarker(markerId, asset.uri);
        } catch (error) {
            console.error("Ошибка удаления изображения", error);
            Alert.alert("Ошибка", "Не удалось удалить изображение");
        }
    };

    const removeImage = (imageId: string) => {
        Alert.alert (
            "Удаление изображение", "Вы уверены, что хотите удалить изображение?",
            [
                {
                    text: "Отмена",
                    style: "cancel",
                },
                {
                    text: "Удалить",
                    style: "destructive",
                    onPress: async () => {
                        if (markerId) {
                            try {
                                await removeImageFromMarker(markerId, imageId);
                            } catch (error) {
                                console.error ("Ошибка удаления изображения", error);
                                Alert.alert("Ошибка", "Не удалось удалить изображение");
                            }
                        }
                    },
                },
            ]
        );
    };

    const formatCoordinate = (coord: string | string[] | undefined) => {
        if (!coord) return "0";
        const coordStr = Array.isArray(coord) ? coord[0]: coord;
        return parseFloat(coordStr).toFixed(6);
    };

    return (
        <ScrollView style = { styles.container }>
            <View style = {styles.header}>
                <Text style = {styles.title}>{marker?.title}</Text>
                <Text style = {styles.coordinates}>
                    {formatCoordinate(latitude)}, {formatCoordinate(longitude)}
                </Text>
            </View>

            <View style = {styles.section}>
                <View style = {styles.sectionHeader}>
                    <Text style = {styles.sectionTitle}>Изображения</Text>
                    <TouchableOpacity
                        style = {[
                            styles.addButton, 
                            (isImageLoading || markersLoading) && styles.addButtonDisabled
                        ]}
                        onPress= {showImageSourceOptions}
                        disabled = {isImageLoading || markersLoading}
                    >
                        {(isImageLoading || markersLoading) ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                        <Ionicons name = "add" size = {22} color = "#fff"/>
                        )}
                        <Text style={styles.addButtonText}>
                            {(isImageLoading || markersLoading) ? 'Загрузка...' : 'Добавить'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {(!marker?.images || marker.images.length === 0) ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="images-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Нет изображений</Text>
                    </View>
                ) : (
                    <View style={styles.imageGrid}>
                        {marker?.images.map((image) => (
                            <View key={image.id} style={styles.imageContainer}>
                                <Image source={{ uri: image.uri }} style={styles.image} />
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => removeImage(image.id)}
                                >
                                    <Ionicons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                ))}
            </View>
        )}
        </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create ({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    header: {
        backgroundColor: "#fff",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    coordinates: {
        fontSize: 16,
        color: "#666",
        fontFamily: "Menlo",
    },
    section: {
        backgroundColor: "#fff",
        margin: 20,
        borderRadius: 12,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 600,
        color: "#333"
    },
    addButton: {
        backgroundColor: "#007AFF",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 30,
    },
    addButtonText: {
        color: "#fff",
        fontWeight: 600,
        marginLeft: 4,
    },
    addButtonDisabled: {
        opacity: 0.6,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 600,
        color: "#999",
        marginTop: 15,
    },
    imageGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
    },
    imageContainer: {
        position: "relative",
        marginBottom: 16,
    },
    image: {
        width: imageSize,
        height: imageSize,
        borderRadius: 14,
        backgroundColor: "#f0f0f0",
    },
    deleteButton: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "#ff3b30",
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: "center",
        alignItems: "center",
    }
})