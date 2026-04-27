-- ============================================================
-- Step 1: Authentication & Role-Based Access
-- Users table for AIML Recruitment Platform
-- PostgreSQL
-- ============================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom auth user table (extends Django's auth if you use custom user model)
-- This schema reflects the Django model; Django migrations will create tables.
-- Use this as reference for DB admins or manual inspection.

CREATE TABLE IF NOT EXISTS auth_user (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(254) NOT NULL UNIQUE,
    password        VARCHAR(128) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('CANDIDATE', 'RECRUITER', 'ADMIN')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_staff        BOOLEAN NOT NULL DEFAULT FALSE,
    is_superuser    BOOLEAN NOT NULL DEFAULT FALSE,
    date_joined     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login      TIMESTAMP WITH TIME ZONE NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_user_email ON auth_user(email);
CREATE INDEX idx_auth_user_role ON auth_user(role);
CREATE INDEX idx_auth_user_user_id ON auth_user(user_id);

COMMENT ON TABLE auth_user IS 'Step 1: Users for authentication and RBAC (CANDIDATE, RECRUITER, ADMIN)';
