-- Add task_type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type') THEN
    CREATE TYPE task_type AS ENUM ('task', 'bug', 'feature', 'improvement');
  END IF;
END $$;

-- Add task_project_status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_project_status') THEN
    CREATE TYPE task_project_status AS ENUM ('active', 'archived');
  END IF;
END $$;

-- Expand task_category enum with new values
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'bug_report';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'feature_request';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'development';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'design';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'marketing';

-- Create task_projects table
CREATE TABLE IF NOT EXISTS task_projects (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color varchar(7) DEFAULT '#3465A5',
  status task_project_status NOT NULL DEFAULT 'active',
  created_by_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_projects_status_idx ON task_projects(status);
CREATE INDEX IF NOT EXISTS task_projects_created_by_idx ON task_projects(created_by_id);

-- Extend tasks table with new columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type task_type NOT NULL DEFAULT 'task';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id varchar REFERENCES task_projects(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_entity_type varchar(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_entity_id varchar;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags text[];

CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_linked_entity_idx ON tasks(linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS tasks_type_idx ON tasks(task_type);
