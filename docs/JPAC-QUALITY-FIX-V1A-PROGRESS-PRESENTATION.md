# JPAC Quality Fix v1A: Progress Presentation

## Purpose

Student progress percentages represent the published learning currently available to the student. They do not necessarily represent completion of an entire JPAC program. This frontend-only fix makes that scope explicit wherever student course progress appears.

## Presentation rules

- A completed Singing pilot with one published module displays **Pilot module complete**.
- Partial Singing pilot progress displays its percentage as **published pilot module progress**.
- Other known values display as **published learning progress**.
- Missing, invalid, or empty published scope displays **Progress syncing** without a numeric percentage.
- A progress bar may remain full when the published pilot scope is complete.

## Safety boundary

The shared presentation helper receives existing values and returns display text and bar presentation only. It does not query or write data, recalculate authoritative progress, call RPCs, modify XP or unlock behavior, update enrollment or lesson state, affect submissions or certificates, change curriculum, or alter Teacher Studio.
