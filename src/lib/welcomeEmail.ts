export function welcomeEmail(firstName: string) {
  return `Subject: Welcome to JPAC Academy

Welcome to JPAC Academy, ${firstName.trim() || 'Creative Member'}!

Your JPAC Academy profile has been started. Please log in at:
https://jpac-academy.vercel.app

When you log in for the first time, you will be asked to choose your Career Path. This is an important part of your JPAC Academy journey because it helps guide your course recommendations, creative tools, portfolio direction, and creative development.

Your course access will become available after JPAC staff verifies your enrollment and grants access.

Before beginning coursework, please complete the required Policies & Parent Consent section if it applies to you.

Welcome to the Academy!

JPAC Academy`;
}
