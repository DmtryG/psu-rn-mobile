import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MarkerProvider } from '../contexts/MarkerContext';
import { DatabaseProvider } from '../contexts/DatabaseContext';

export default function RootLayout() {
    return (
        <DatabaseProvider>
            <MarkerProvider>
                <StatusBar style = "auto" />
                <Stack>
                    <Stack.Screen
                    name = "index"
                    options = {{
                        title: "Карта",
                        headerStyle: {
                            backgroundColor: "#fff",
                        },
                        headerTintColor: "#000",
                        headerTitleStyle: {
                            fontWeight: "bold",
                        },
                    }}
                    />
                    <Stack.Screen
                    name = "marker/[id]"
                    options = {{
                        title: "Детали маркера",
                        headerStyle: {
                            backgroundColor: "#fff",
                        },
                        headerTintColor: "#000",
                        headerTitleStyle: {
                            fontWeight: "bold",
                        },
                    }}
                    />
                </Stack>
            </MarkerProvider>
        </DatabaseProvider>
    );
}