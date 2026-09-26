import * as Haptics from 'expo-haptics';

export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light'): void => {
  try {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  } catch (error) {
    console.error('Haptic feedback error:', error);
  }
};

export const hapticSuccess = (): void => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.error('Haptic success error:', error);
  }
};

export const hapticError = (): void => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.error('Haptic error:', error);
  }
};