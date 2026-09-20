import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface CheckoutStepperProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { id: 1, title: 'Address', icon: 'location-outline' as const },
  { id: 2, title: 'Payment', icon: 'card-outline' as const },
  { id: 3, title: 'Confirmed', icon: 'checkmark-circle-outline' as const },
];

export default function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle & Label */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isActive && styles.circleActive,
                    step.id === 3 && isActive && { backgroundColor: '#10b981', borderColor: '#10b981' },
                  ]}
                >
                  {isCompleted || (step.id === 3 && isActive) ? (
                    <Ionicons name="checkmark" size={14} color={step.id === 3 && isActive ? '#fff' : '#000'} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isActive && styles.stepNumberActive,
                      ]}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    isActive && styles.stepTitleActive,
                    isCompleted && styles.stepTitleCompleted,
                  ]}
                >
                  {step.title}
                </Text>
              </View>

              {/* Connecting Line */}
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    step.id < currentStep && styles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: '#000',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  circleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#64748b',
  },
  stepNumberActive: {
    color: colors.primary,
  },
  stepTitle: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: fontWeight.medium,
  },
  stepTitleActive: {
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
  stepTitleCompleted: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
    marginHorizontal: 8,
  },
  connectorCompleted: {
    backgroundColor: colors.primary,
  },
});
