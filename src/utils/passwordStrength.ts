// src/utils/passwordStrength.ts
export interface PasswordStrengthResult {
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  variant: 'danger' | 'warning' | 'info' | 'success';
  percent: number;
  suggestions: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const suggestions: string[] = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    suggestions.push('Use at least 8 characters.');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Add at least one uppercase letter.');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Add at least one lowercase letter.');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Add at least one number.');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Add at least one special character.');
  }

  if (password.length >= 12) {
    score += 1;
  }

  const cappedScore = Math.min(score, 5);

  if (cappedScore <= 1) {
    return {
      score: cappedScore,
      label: 'Weak',
      variant: 'danger',
      percent: 20,
      suggestions,
    };
  }

  if (cappedScore === 2) {
    return {
      score: cappedScore,
      label: 'Fair',
      variant: 'warning',
      percent: 40,
      suggestions,
    };
  }

  if (cappedScore === 3) {
    return {
      score: cappedScore,
      label: 'Good',
      variant: 'info',
      percent: 65,
      suggestions,
    };
  }

  return {
    score: cappedScore,
    label: 'Strong',
    variant: 'success',
    percent: 90,
    suggestions,
  };
}