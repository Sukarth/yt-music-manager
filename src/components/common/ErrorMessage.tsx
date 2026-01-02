import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
      <Text style={[styles.message, { color: theme.colors.error }]}>{message}</Text>
      {onRetry && (
        <Button mode="contained" onPress={onRetry} style={styles.button}>
          Retry
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  button: {
    marginTop: 8,
  },
});

export default ErrorMessage;
