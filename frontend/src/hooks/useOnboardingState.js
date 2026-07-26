const ONBOARDING_SEEN_KEY = 'paymatrix_onboarding_seen_v1';

export const hasSeenOnboarding = () => {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markOnboardingSeen = () => {
  try {
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
  } catch {
    // Onboarding should remain usable when storage is unavailable.
  }
};

export const useOnboardingState = () => ({ hasSeenOnboarding, markOnboardingSeen });

export default useOnboardingState;
