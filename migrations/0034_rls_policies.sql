-- Migration 0034: Enable Row-Level Security policies on the 8 most sensitive tables
--
-- Isolation rules:
--   platform_admin / admin     → bypass (see all rows — Express RBAC is still primary)
--   institution_admin          → see only rows belonging to their institution
--   student                    → see only their own rows
--   no context (empty)         → access denied for protected tables (safe default)
--
-- How RLS bypassing works:
--   • PostgreSQL table owners bypass RLS by default (no FORCE ROW LEVEL SECURITY).
--     On dev (Neon) and in production migrations/seeding (postgres superuser + BYPASSRLS),
--     all rows are always accessible — these policies are invisible.
--   • The app_user role (non-owner, no BYPASSRLS) activates when APP_DB_URL is set.
--     Policies apply to all non-superuser, non-owner roles automatically.
--
-- These policies are safe to run in development — table owners bypass RLS and
-- existing dev queries remain unaffected.

-- ============================================================
-- 1. universities
-- ============================================================
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "universities_admin_bypass" ON universities
  FOR ALL
  USING (current_setting('app.current_user_type', true) IN ('platform_admin', 'admin'));

CREATE POLICY "universities_institution_admin_own" ON universities
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) = 'institution_admin'
    AND user_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY "universities_public_read" ON universities
  FOR SELECT
  USING (
    current_setting('app.current_user_type', true) = 'student'
    AND publish_status = 'published'
  );

-- ============================================================
-- 2. courses
-- ============================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_admin_bypass" ON courses
  FOR ALL
  USING (current_setting('app.current_user_type', true) IN ('platform_admin', 'admin'));

CREATE POLICY "courses_institution_admin_own" ON courses
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) = 'institution_admin'
    AND university_id IN (
      SELECT id FROM universities
      WHERE user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "courses_public_read" ON courses
  FOR SELECT
  USING (
    current_setting('app.current_user_type', true) = 'student'
    AND publish_status = 'published'
  );

-- ============================================================
-- 3. applications
-- ============================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_admin_bypass" ON applications
  FOR ALL
  USING (current_setting('app.current_user_type', true) IN ('platform_admin', 'admin'));

CREATE POLICY "applications_student_own" ON applications
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) = 'student'
    AND student_id IN (
      SELECT id FROM student_profiles
      WHERE user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "applications_institution_admin_own" ON applications
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) = 'institution_admin'
    AND course_id IN (
      SELECT c.id FROM courses c
      JOIN universities u ON c.university_id = u.id
      WHERE u.user_id = current_setting('app.current_user_id', true)
    )
  );

-- ============================================================
-- 4. student_profiles
-- ============================================================
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_profiles_admin_bypass" ON student_profiles
  FOR ALL
  USING (current_setting('app.current_user_type', true) IN ('platform_admin', 'admin'));

CREATE POLICY "student_profiles_student_own" ON student_profiles
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) = 'student'
    AND user_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY "student_profiles_institution_admin_read" ON student_profiles
  FOR SELECT
  USING (
    current_setting('app.current_user_type', true) = 'institution_admin'
    AND id IN (
      SELECT a.student_id FROM applications a
      JOIN courses c ON a.course_id = c.id
      JOIN universities u ON c.university_id = u.id
      WHERE u.user_id = current_setting('app.current_user_id', true)
    )
  );

-- ============================================================
-- 5. documents
-- ============================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_admin_bypass" ON documents
  FOR ALL
  USING (current_setting('app.current_user_type', true) IN ('platform_admin', 'admin'));

CREATE POLICY "documents_student_own" ON documents
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) = 'student'
    AND (
      sender_id = current_setting('app.current_user_id', true)
      OR recipient_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "documents_institution_admin_own" ON documents
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) = 'institution_admin'
    AND university_id IN (
      SELECT id FROM universities
      WHERE user_id = current_setting('app.current_user_id', true)
    )
  );

-- ============================================================
-- 6. institution_documents
-- ============================================================
ALTER TABLE institution_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institution_docs_admin_bypass" ON institution_documents
  FOR ALL
  USING (current_setting('app.current_user_type', true) IN ('platform_admin', 'admin'));

CREATE POLICY "institution_docs_institution_admin_own" ON institution_documents
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) = 'institution_admin'
    AND institution_id IN (
      SELECT id FROM universities
      WHERE user_id = current_setting('app.current_user_id', true)
    )
  );

-- ============================================================
-- 7. notifications
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_admin_bypass" ON notifications
  FOR ALL
  USING (current_setting('app.current_user_type', true) IN ('platform_admin', 'admin'));

CREATE POLICY "notifications_user_own" ON notifications
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) IN ('student', 'institution_admin')
    AND user_id = current_setting('app.current_user_id', true)
  );

-- ============================================================
-- 8. conversations
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_admin_bypass" ON conversations
  FOR ALL
  USING (current_setting('app.current_user_type', true) IN ('platform_admin', 'admin'));

CREATE POLICY "conversations_participant_own" ON conversations
  FOR ALL
  USING (
    current_setting('app.current_user_type', true) IN ('student', 'institution_admin')
    AND (
      participant1_id = current_setting('app.current_user_id', true)
      OR participant2_id = current_setting('app.current_user_id', true)
    )
  );
