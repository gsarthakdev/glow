import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Defs, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
const { width, height } = Dimensions.get('window');

const colors = [
    '#FFE3D1', // peach top
    '#F9D1E3', // soft pink
    '#EAD8F7', // lavender
    '#D8E1FA', // light bluish lavender
    '#C9E5FF', // sky blue
    '#B8E1F3', // blue bottom
];

const generateWave = (y: number, amplitude: number, flip: boolean = false) => {
    const wavelength = width;
    const control = amplitude * 1.5;

    const path = `
    M 0 ${y}
    C ${wavelength / 4} ${y + (flip ? -control : control)},
      ${wavelength * 3 / 4} ${y + (flip ? control : -control)},
      ${wavelength} ${y}
    V ${height}
    H 0
    Z
  `;
    return path;
};

const WavyBackground = () => {
    return (
        <Svg
            height={height}
            width={width}
            style={StyleSheet.absoluteFill}
        >
            {colors.map((color, i) => {
                const y = height * 0.30 + i * 50;
                const amp = 30 + (i % 3) * 10;
                return (
                    <Path
                        key={i}
                        d={generateWave(y, amp, i % 2 === 0)}
                        fill={color}
                    />
                );
            })}
        </Svg>
    );
};


export default function TestScreen() {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8D3DD', '#FED1CE', '#FFDACC']}
                style={{
                    position: 'absolute',
                    top: 0,
                    height: height,
                    width: '100%',
                    zIndex: -1,
                }}
            />
            <WavyBackground />

            <Text style={styles.greeting}>Hi Sarah, how’s{'\n'}Emma today?</Text>

            <TouchableOpacity style={styles.logButton}>
                <Feather name="edit" size={32} color="#B06C44" />
                <Text style={styles.logText}>Log Today</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>One step at a time 🌟</Text>

            <View style={styles.navBar}>
                <TouchableOpacity>
                    <Feather name="file-text" size={24} color="#3D3A4E" />
                    <Text style={styles.navText}>Past Logs</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Feather name="settings" size={24} color="#3D3A4E" />
                    <Text style={styles.navText}>Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Feather name="bar-chart-2" size={24} color="#3D3A4E" />
                    <Text style={styles.navText}>Summary</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 40,
        // backgroundColor: '#FFE3D1',
    },
    greeting: {
        fontSize: 26,
        fontWeight: '600',
        textAlign: 'center',
        color: '#3D3A4E',
    },
    logButton: {
        backgroundColor: '#FFEBD9',
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    logText: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '500',
        color: '#3D3A4E',
    },
    footer: {
        fontSize: 16,
        fontWeight: '500',
        color: '#3D3A4E',
        marginBottom: 20,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 30,
    },
    navText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
        color: '#3D3A4E',
    },
});
