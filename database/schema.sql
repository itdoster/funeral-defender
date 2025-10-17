-- Create database (run this manually first)
-- CREATE DATABASE funeral_defender;

-- Create table for tracking IP addresses
CREATE TABLE IF NOT EXISTS ip_tracking (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_visit TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    visit_count INTEGER DEFAULT 1,
    is_banned BOOLEAN DEFAULT FALSE,
    banned_at TIMESTAMP WITH TIME ZONE,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip_address)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ip_tracking_ip_address ON ip_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_is_banned ON ip_tracking(is_banned);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_banned_at ON ip_tracking(banned_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ip_tracking_updated_at 
    BEFORE UPDATE ON ip_tracking 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Redirect chains are logged only to console, not stored in database
-- This reduces database load and simplifies the system
