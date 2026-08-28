# JPAC Aria Avatar Guide v1.1: Approved Image Asset

## Approved asset

Aria now uses the provided character image at `public/images/aria/aria-guide.png`. The browser-facing path is `/images/aria/aria-guide.png`.

The approved PNG is the primary avatar in both the floating student guide button and the Guided Pop-Up Coach header. CSS uses a circular crop, `object-fit: cover`, and a purple-and-gold JPAC border/glow without stretching or altering the source image.

## Fallback behavior

The v1 inline SVG remains only as an in-component fallback if the approved image cannot load. The avatar container retains the accessible label “Aria, your JPAC Guide” for both the image and fallback states.

## Preserved behavior

- Student-only visibility
- Click-to-open behavior
- “Need help? I can guide you.” speech bubble
- Page-specific deterministic guidance
- Full six-step pathway
- Back, Next, Close, and Take me there controls
- Reduced-motion support
- Academic safety copy

## Safety boundaries

This update adds no AI, image generation, voice, speech synthesis, API, Supabase, database, upload, or browser-storage behavior. It does not change XP, progress, mastery, certificates, enrollments, submissions, reviews, curriculum, or any other protected academic logic.
