-- Intake Review TASK-4 ST001 (CL-235): add PAUSED to QueueStatus
ALTER TYPE "QueueStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
