import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../contexts/DatabaseContext';
import { databaseService } from '../services/database';

interface DatabaseInfoProps {
    visible: boolean;
    onClose: () => void;
}

export function DatabaseInfo({ visible, onClose }: DatabaseInfoProps ) {
    const [dbVersion, setDbVersion] = useState<number>(0);
    const [dbSchema, setDbSchema] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const {isInitialized, error} = useDatabase();

    useEffect(() => {
        if (visible && isInitialized) {
            loadDatabaseInfo();
        }
    }, [visible, isInitialized]);

    const loadDatabaseInfo = async () => {
        try {
            setIsLoading(true);
            const version = await databaseService.getDatabaseVersion();
            const schema = await databaseService.getDatabaseSchema();

            setDbVersion(version);
            setDbSchema(schema);
        } catch (error) {
            console.error("Ошибка загрузки информации о БД: ", error)
            Alert.alert ("Ошибка", "Не удалось загрузить информацию о базе данных");
        } finally {
            setIsLoading(false);
        }
    };

    const handleForceMigration = () => {
        Alert.alert (
            "Принудительная миграция",
            "Вы уверены, что хотите выполнить принудительную миграцию? Это может привести к потере данных",
            [
                {
                    text: "Отмена",
                    style: "cancel",
                },
                {
                    text: "Выполнить",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            await databaseService.forceMigration();
                            await loadDatabaseInfo();
                            Alert.alert("Успех", "Миграция выполнена успешно");
                        } catch (error) {
                            console.error ("Ошибка миграции", error);
                            Alert.alert("Ошибка", "Не удалось выполнить миграцию");
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Информация о базе данных</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    {/* статус бд */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Статус</Text>
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Инициализирована:</Text>
                            <View style={[styles.statusIndicator, { backgroundColor: isInitialized ? '#4CAF50' : '#F44336' }]}>
                                <Text style={styles.statusText}>
                                    {isInitialized ? 'Да' : 'Нет'}
                                </Text>
                             </View>
                        </View>

                        {error && (
                            <View style={styles.statusItem}>
                                <Text style={styles.statusLabel}>Ошибка:</Text>
                                <Text style={styles.errorText}>{error.message}</Text>
                            </View>
                        )}
                    </View>

                    {/* версия бд */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Версия</Text>
                        <Text style={styles.versionText}>v{dbVersion}</Text>
                    </View>

                    {/* схема бд */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Схема базы данных</Text>
                        {dbSchema.length > 0 ? (
                            dbSchema.map((sql, index) => (
                                <View key={index} style={styles.schemaItem}>
                                    <Text style={styles.schemaText}>{sql}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>Схема не загружена</Text>
                        )}
                    </View>

                    {/* операции */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Действия</Text>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.refreshButton]}
                            onPress={loadDatabaseInfo}
                            disabled={isLoading || !isInitialized}
                        >
                            <Ionicons name="refresh" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Обновить информацию</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.migrationButton]}
                            onPress={handleForceMigration}
                            disabled={isLoading || !isInitialized}
                        >
                            <Ionicons name="build" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Принудительная миграция</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>              
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    flex: 1,
  },
  versionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  schemaItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  schemaText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
  },
  migrationButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});