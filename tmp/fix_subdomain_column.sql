-- Make desired_subdomain column nullable in onboarding_requests table
-- Run this in your Supabase SQL Editor

ALTER TABLE onboarding_requests 
ALTER COLUMN desired_subdomain DROP NOT NULL;

-- Optionally, set a default value for existing rows
UPDATE onboarding_requests 
SET desired_subdomain = NULL 
WHERE desired_subdomain IS NULL;
