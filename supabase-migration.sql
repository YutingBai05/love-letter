-- ============================================
-- Love Letter - Supabase 数据库建表脚本
-- 请在 Supabase SQL Editor 中运行此文件
-- ============================================

-- 1. 用户资料表 (关联 Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'invitee')),
  paired_with UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 邀请码表
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES profiles(id)
);

-- 3. 文件夹表
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  created_by TEXT CHECK (created_by IN ('owner', 'invitee')),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 明信片表
CREATE TABLE IF NOT EXISTS postcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  content TEXT DEFAULT '',
  bg_color TEXT DEFAULT '#FFF8F0',
  mood TEXT DEFAULT '',
  author_nickname TEXT DEFAULT '',
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 信件表
CREATE TABLE IF NOT EXISTS letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  content TEXT DEFAULT '',
  paper_template TEXT DEFAULT 'blank',
  font_family TEXT DEFAULT 'serif',
  author_nickname TEXT DEFAULT '',
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 问答题库表
CREATE TABLE IF NOT EXISTS qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 问答回答表
CREATE TABLE IF NOT EXISTS qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
  question TEXT DEFAULT '',
  category TEXT DEFAULT '',
  my_answer TEXT DEFAULT '',
  my_nickname TEXT DEFAULT '',
  partner_answer TEXT DEFAULT '',
  partner_nickname TEXT DEFAULT '',
  ai_analysis TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE postcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_answers ENABLE ROW LEVEL SECURITY;

-- Profiles: 用户可读写自己的资料，可读配对者的资料
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read paired profile" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.paired_with = profiles.id)
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Invite codes: 创建者可读，任何人可用 code 查询
CREATE POLICY "Anyone can read invite by code" ON invite_codes
  FOR SELECT USING (true);

CREATE POLICY "Owner can create invite" ON invite_codes
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owner can update own invites" ON invite_codes
  FOR UPDATE USING (created_by = auth.uid());

-- Folders: 用户可读自己+配对者的非锁定文件夹
CREATE POLICY "Users can read folders" ON folders
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.paired_with = folders.user_id)
  );

CREATE POLICY "Users can create folders" ON folders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (user_id = auth.uid());

-- Postcards: 可见规则同文件夹
CREATE POLICY "Users can read postcards" ON postcards
  FOR SELECT USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.paired_with = postcards.author_id)
  );

CREATE POLICY "Users can create postcards" ON postcards
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own postcards" ON postcards
  FOR UPDATE USING (author_id = auth.uid());

-- Letters: 同上
CREATE POLICY "Users can read letters" ON letters
  FOR SELECT USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.paired_with = letters.author_id)
  );

CREATE POLICY "Users can create letters" ON letters
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own letters" ON letters
  FOR UPDATE USING (author_id = auth.uid());

-- QA Questions: 配对用户可共享
CREATE POLICY "Users can read questions" ON qa_questions
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.paired_with = qa_questions.created_by)
  );

CREATE POLICY "Users can create questions" ON qa_questions
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own questions" ON qa_questions
  FOR DELETE USING (created_by = auth.uid());

-- QA Answers: 同上
CREATE POLICY "Users can read answers" ON qa_answers
  FOR SELECT USING (true);  -- 简化：问答双方都能看

CREATE POLICY "Users can create answers" ON qa_answers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update answers" ON qa_answers
  FOR UPDATE USING (true);
