import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clientObservability } from '@/services/observability';
import { colors } from '@/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    clientObservability.captureException(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle" size={44} color="#f59e0b" />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              We encountered an unexpected issue while loading this screen. Our engineering team has been notified.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={this.handleReset} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color="#0f172a" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.devCard}>
                <Text style={styles.devTitle}>Developer Diagnostics:</Text>
                <Text style={styles.devError}>{this.state.error.toString()}</Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.devStack}>{this.state.errorInfo.componentStack}</Text>
                )}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#fef3c7',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    maxWidth: 340,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary || '#ffc400',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  devCard: {
    marginTop: 28,
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  devTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
    marginBottom: 4,
  },
  devError: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
    marginBottom: 6,
  },
  devStack: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
