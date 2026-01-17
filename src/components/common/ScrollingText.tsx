import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Text, LayoutChangeEvent } from 'react-native';

interface ScrollingTextProps {
    text: string;
    style?: any;
    speed?: number;
    delay?: number;
}

export const ScrollingText: React.FC<ScrollingTextProps> = ({
    text,
    style,
    speed = 50,
    delay = 1000
}) => {
    const scrollAnim = useRef(new Animated.Value(0)).current;
    const [containerWidth, setContainerWidth] = React.useState(0);
    const [textWidth, setTextWidth] = React.useState(0);

    const onContainerLayout = (event: LayoutChangeEvent) => {
        setContainerWidth(event.nativeEvent.layout.width);
    };

    const onTextLayout = (event: LayoutChangeEvent) => {
        setTextWidth(event.nativeEvent.layout.width);
    };

    useEffect(() => {
        if (textWidth > containerWidth && containerWidth > 0) {
            const distance = textWidth - containerWidth + 50; // 50px spacing
            const duration = (distance / speed) * 1000;

            const animation = Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(scrollAnim, {
                        toValue: -distance,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                    Animated.delay(delay),
                    Animated.timing(scrollAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            );

            animation.start();

            return () => animation.stop();
        } else {
            scrollAnim.setValue(0);
        }
    }, [textWidth, containerWidth, speed, delay, text]);

    return (
        <View style={[styles.container, style]} onLayout={onContainerLayout}>
            <Animated.View
                style={{
                    transform: [{ translateX: scrollAnim }],
                }}
            >
                <Text
                    onLayout={onTextLayout}
                    style={style}
                    numberOfLines={1}
                >
                    {text}
                </Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
});
