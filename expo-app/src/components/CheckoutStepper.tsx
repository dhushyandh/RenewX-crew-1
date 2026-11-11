import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '@/theme';
import { renewxColors, renewxTextStyle } from '@/design-system';

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
                    step.id === 3 && isActive && styles.circleConfirmed,
                  ]}
                >
                  {isCompleted || (step.id === 3 && isActive) ? (
                    <Ionicons name="checkmark" size={14} color={renewxColors.white} />
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
    backgroundColor: renewxColors.surface,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: renewxColors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: renewxColors.yellow,
    borderColor: renewxColors.yellowDark,
    borderWidth: 2,
  },
  circleCompleted: {
    backgroundColor: renewxColors.emerald,
    borderColor: renewxColors.emerald,
  },
  circleConfirmed: {
    backgroundColor: renewxColors.emerald,
    borderColor: renewxColors.emerald,
  },
  stepNumber: {
    fontSize: 12,
    ...renewxTextStyle('bold'),
    color: renewxColors.textMuted,
  },
  stepNumberActive: {
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  stepTitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    ...renewxTextStyle('medium'),
  },
  stepTitleActive: {
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  stepTitleCompleted: {
    color: renewxColors.emerald,
    ...renewxTextStyle('bold'),
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: renewxColors.border,
    marginBottom: 18,
    marginHorizontal: 8,
  },
  connectorCompleted: {
    backgroundColor: renewxColors.emerald,
  },
});
