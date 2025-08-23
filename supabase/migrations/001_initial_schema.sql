-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create conversations table
CREATE TABLE conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    telnyx_message_id VARCHAR(100) UNIQUE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_conversations_phone_number ON conversations(phone_number);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_telnyx_id ON messages(telnyx_message_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users for now)
CREATE POLICY "Enable all operations for authenticated users" ON conversations
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON messages
    FOR ALL USING (auth.role() = 'authenticated');

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NOW(), updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when message is inserted
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();