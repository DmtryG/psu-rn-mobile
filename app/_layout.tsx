import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MarkerProvider } from '../contexts/MarkerContext';
import { DatabaseProvider } from '../contexts/DatabaseContext';
import { LocationProvider } from '../contexts/LocationContext';

export default function RootLayout() {
    return (
        <DatabaseProvider>
            <MarkerProvider>
                <LocationProvider>
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
                </LocationProvider>
            </MarkerProvider>
        </DatabaseProvider>
    );
}