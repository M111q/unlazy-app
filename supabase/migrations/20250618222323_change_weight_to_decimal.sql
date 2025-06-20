-- =====================================================
-- Unlazy Fitness App - Weight Column Type Migration
-- =====================================================
-- Purpose: Change weight column from INTEGER to NUMERIC to support decimal values
-- Affected tables: exercise_sets
-- Affected constraints: check_weight_range
-- Special considerations:
--   - Preserves existing data during type conversion
--   - Updates check constraint to work with decimal values
--   - NUMERIC(5,2) allows values up to 999.99 kg
-- Migration date: 2025-06-18
-- =====================================================

-- =====================================================
-- 1. ALTER WEIGHT COLUMN TYPE
-- =====================================================

-- -----------------------------------------------------
-- Drop existing check constraint before altering column
-- Purpose: Remove old constraint that works with INTEGER
-- -----------------------------------------------------
alter table public.exercise_sets drop constraint if exists check_weight_range;

-- -----------------------------------------------------
-- Change weight column from INTEGER to NUMERIC(5,2)
-- Purpose: Support decimal weights (e.g., 12.5 kg, 87.25 kg)
-- NUMERIC(5,2) specifications:
--   - Total digits: 5
--   - Decimal places: 2
--   - Range: 0.01 to 999.99
-- Using clause converts existing integer values to decimal automatically
-- -----------------------------------------------------
alter table public.exercise_sets
alter column weight type numeric(5,2) using weight::numeric(5,2);

-- =====================================================
-- 2. RECREATE CHECK CONSTRAINT
-- =====================================================

-- -----------------------------------------------------
-- Add updated check constraint for decimal weight values
-- Purpose: Enforce business rules for valid weight range
-- Range: 0.01 kg to 400.00 kg (same max as before, now with decimal precision)
-- Note: Minimum changed from 1 to 0.01 to allow lighter fractional weights
-- -----------------------------------------------------
alter table public.exercise_sets
add constraint check_weight_range
check (weight >= 0.01 and weight <= 400.00);

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

-- -----------------------------------------------------
-- Update column comment to reflect new decimal support
-- Purpose: Document the change for future developers
-- -----------------------------------------------------
comment on column public.exercise_sets.weight is 'Exercise weight in kilograms, supports decimal values (e.g., 12.5 kg)';

-- =====================================================
-- MIGRATION VALIDATION NOTES
-- =====================================================
--
-- This migration is safe because:
-- 1. INTEGER to NUMERIC conversion is automatic and lossless
-- 2. Existing integer values (e.g., 50) become decimal values (50.00)
-- 3. Check constraint is recreated with same maximum value
-- 4. Minimum value lowered from 1 to 0.01 for better flexibility
-- 5. No data loss occurs during the conversion
--
-- After migration:
-- - Old values: 50 (integer) → 50.00 (numeric)
-- - New values: Can store 12.5, 87.25, etc.
-- - Valid range: 0.01 to 400.00 kg
-- =====================================================
