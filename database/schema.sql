-- ============================================================
-- Jimma University Community-Based Education (CBE)
-- Training Management System
-- Database: ju_cbe_training
-- MySQL / MariaDB 10.4+ compatible
-- ============================================================

CREATE DATABASE IF NOT EXISTS `ju_cbe_training`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `ju_cbe_training`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Roles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Departments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_departments_code` (`code`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Academic years
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `academic_years` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `is_current` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_academic_years_name` (`name`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Users (all login accounts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL,
  `department_id` INT UNSIGNED NULL,
  `username` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role_id`),
  KEY `idx_users_department` (`department_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Students
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `student_id` VARCHAR(30) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `gender` ENUM('Male','Female','Other') NOT NULL DEFAULT 'Other',
  `date_of_birth` DATE NULL,
  `department_id` INT UNSIGNED NULL,
  `year_of_study` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `email` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NULL,
  `address` VARCHAR(255) NULL,
  `group_id` INT UNSIGNED NULL,
  `status` ENUM('Enrolled','Inactive','Graduated','Transferred') NOT NULL DEFAULT 'Enrolled',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_students_student_id` (`student_id`),
  UNIQUE KEY `uq_students_user` (`user_id`),
  KEY `idx_students_department` (`department_id`),
  KEY `idx_students_group` (`group_id`),
  KEY `idx_students_status` (`status`),
  KEY `idx_students_name` (`full_name`),
  CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_students_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Instructors / Field supervisors
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `instructors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `employee_id` VARCHAR(30) NULL,
  `title` VARCHAR(20) NULL,
  `department_id` INT UNSIGNED NULL,
  `specialization` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_instructors_employee_id` (`employee_id`),
  UNIQUE KEY `uq_instructors_user` (`user_id`),
  KEY `idx_instructors_department` (`department_id`),
  CONSTRAINT `fk_instructors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_instructors_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Community partners (organizations)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `community_partners` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_name` VARCHAR(150) NOT NULL,
  `contact_person` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(150) NULL,
  `address` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_partners_name` (`organization_name`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Community sites
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `community_sites` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `site_type` ENUM('Hospital','Health Center','School','Kebele','NGO','Government Office','Private','Other') NOT NULL DEFAULT 'Other',
  `address` VARCHAR(255) NULL,
  `city` VARCHAR(100) NULL,
  `contact_person` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(150) NULL,
  `available_placements` INT UNSIGNED NOT NULL DEFAULT 0,
  `community_partner_id` INT UNSIGNED NULL,
  `status` ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sites_type` (`site_type`),
  KEY `idx_sites_status` (`status`),
  CONSTRAINT `fk_sites_partner` FOREIGN KEY (`community_partner_id`) REFERENCES `community_partners` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Community partner user accounts (login for partner role)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `community_partner_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `community_partner_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_partner_users_user` (`user_id`),
  KEY `idx_partner_users_partner` (`community_partner_id`),
  CONSTRAINT `fk_partner_users_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partner_users_partner` FOREIGN KEY (`community_partner_id`) REFERENCES `community_partners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- CBE programs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cbe_programs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `description` TEXT NULL,
  `objectives` TEXT NULL,
  `learning_outcomes` TEXT NULL,
  `department_id` INT UNSIGNED NULL,
  `coordinator_user_id` INT UNSIGNED NULL,
  `academic_year_id` INT UNSIGNED NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `location` VARCHAR(200) NULL,
  `status` ENUM('Planned','Active','Completed','Cancelled') NOT NULL DEFAULT 'Planned',
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_programs_code` (`code`),
  KEY `idx_programs_department` (`department_id`),
  KEY `idx_programs_coordinator` (`coordinator_user_id`),
  KEY `idx_programs_status` (`status`),
  KEY `idx_programs_year` (`academic_year_id`),
  CONSTRAINT `fk_programs_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_programs_coordinator` FOREIGN KEY (`coordinator_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_programs_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_programs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Student groups
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_groups` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(30) NULL,
  `cbe_program_id` INT UNSIGNED NULL,
  `department_id` INT UNSIGNED NULL,
  `academic_year_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_groups_program` (`cbe_program_id`),
  KEY `idx_groups_department` (`department_id`),
  CONSTRAINT `fk_groups_program` FOREIGN KEY (`cbe_program_id`) REFERENCES `cbe_programs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_groups_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

SET @fk_students_group_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'students'
    AND CONSTRAINT_NAME = 'fk_students_group'
);
SET @fk_sql := IF(@fk_students_group_exists = 0,
  'ALTER TABLE `students` ADD CONSTRAINT `fk_students_group` FOREIGN KEY (`group_id`) REFERENCES `student_groups` (`id`) ON DELETE SET NULL',
  'SELECT 1');
PREPARE fk_stmt FROM @fk_sql;
EXECUTE fk_stmt;
DEALLOCATE PREPARE fk_stmt;

-- ------------------------------------------------------------
-- Student placements at community sites
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_placements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` INT UNSIGNED NOT NULL,
  `community_site_id` INT UNSIGNED NOT NULL,
  `cbe_program_id` INT UNSIGNED NOT NULL,
  `supervisor_id` INT UNSIGNED NULL,
  `group_id` INT UNSIGNED NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `status` ENUM('Assigned','Active','Completed','Withdrawn') NOT NULL DEFAULT 'Assigned',
  `assigned_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_placement_student_program` (`student_id`, `cbe_program_id`),
  KEY `idx_placements_site` (`community_site_id`),
  KEY `idx_placements_program` (`cbe_program_id`),
  KEY `idx_placements_supervisor` (`supervisor_id`),
  KEY `idx_placements_group` (`group_id`),
  CONSTRAINT `fk_placements_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_placements_site` FOREIGN KEY (`community_site_id`) REFERENCES `community_sites` (`id`),
  CONSTRAINT `fk_placements_program` FOREIGN KEY (`cbe_program_id`) REFERENCES `cbe_programs` (`id`),
  CONSTRAINT `fk_placements_supervisor` FOREIGN KEY (`supervisor_id`) REFERENCES `instructors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_placements_group` FOREIGN KEY (`group_id`) REFERENCES `student_groups` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_placements_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Training activities / tasks
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `training_activities` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cbe_program_id` INT UNSIGNED NOT NULL,
  `community_site_id` INT UNSIGNED NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `type` ENUM('Lecture','Field Work','Group Discussion','Seminar','Community Service','Assignment','Exam','Other') NOT NULL DEFAULT 'Other',
  `scheduled_date` DATE NULL,
  `start_time` TIME NULL,
  `end_time` TIME NULL,
  `location` VARCHAR(200) NULL,
  `deadline_at` DATETIME NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activities_program` (`cbe_program_id`),
  KEY `idx_activities_site` (`community_site_id`),
  KEY `idx_activities_date` (`scheduled_date`),
  CONSTRAINT `fk_activities_program` FOREIGN KEY (`cbe_program_id`) REFERENCES `cbe_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activities_site` FOREIGN KEY (`community_site_id`) REFERENCES `community_sites` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_activities_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Activity assignments (which students must attend/do a task)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_assignments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `activity_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `status` ENUM('Pending','Completed','Overdue') NOT NULL DEFAULT 'Pending',
  `completed_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_activity_student` (`activity_id`, `student_id`),
  KEY `idx_activity_assign_student` (`student_id`),
  CONSTRAINT `fk_activity_assign_activity` FOREIGN KEY (`activity_id`) REFERENCES `training_activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_assign_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Attendance
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` INT UNSIGNED NOT NULL,
  `activity_id` INT UNSIGNED NULL,
  `cbe_program_id` INT UNSIGNED NOT NULL,
  `attendance_date` DATE NOT NULL,
  `status` ENUM('Present','Absent','Late','Excused') NOT NULL DEFAULT 'Present',
  `remarks` VARCHAR(255) NULL,
  `recorded_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_student_date` (`student_id`, `attendance_date`, `cbe_program_id`),
  KEY `idx_attendance_program` (`cbe_program_id`),
  KEY `idx_attendance_date` (`attendance_date`),
  KEY `idx_attendance_status` (`status`),
  CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_activity` FOREIGN KEY (`activity_id`) REFERENCES `training_activities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_program` FOREIGN KEY (`cbe_program_id`) REFERENCES `cbe_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Fieldwork reports (with revision history via self-FK)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fieldwork_reports` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `revision_of` INT UNSIGNED NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `cbe_program_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NULL,
  `file_size` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('Submitted','Under Review','Approved','Returned') NOT NULL DEFAULT 'Submitted',
  `review_comment` TEXT NULL,
  `reviewed_by` INT UNSIGNED NULL,
  `reviewed_at` DATETIME NULL,
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_student` (`student_id`),
  KEY `idx_reports_program` (`cbe_program_id`),
  KEY `idx_reports_status` (`status`),
  CONSTRAINT `fk_reports_revision_of` FOREIGN KEY (`revision_of`) REFERENCES `fieldwork_reports` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_program` FOREIGN KEY (`cbe_program_id`) REFERENCES `cbe_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Report files stored in the database (used on Vercel)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `report_files` (
  `report_id` INT UNSIGNED NOT NULL,
  `file_data` LONGBLOB NOT NULL,
  PRIMARY KEY (`report_id`),
  CONSTRAINT `fk_report_files_report` FOREIGN KEY (`report_id`) REFERENCES `fieldwork_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Report feedback / comments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `report_feedback` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `report_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `comment` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_report_feedback_report` (`report_id`),
  CONSTRAINT `fk_report_feedback_report` FOREIGN KEY (`report_id`) REFERENCES `fieldwork_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_report_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Assessment criteria (configurable weights)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assessment_criteria` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cbe_program_id` INT UNSIGNED NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `weight` DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_criteria_program` (`cbe_program_id`),
  CONSTRAINT `fk_criteria_program` FOREIGN KEY (`cbe_program_id`) REFERENCES `cbe_programs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Student assessments (per criterion scores)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_assessments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` INT UNSIGNED NOT NULL,
  `cbe_program_id` INT UNSIGNED NOT NULL,
  `criterion_id` INT UNSIGNED NOT NULL,
  `score` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `comment` TEXT NULL,
  `assessed_by` INT UNSIGNED NOT NULL,
  `assessed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assessment_student_criterion` (`student_id`, `cbe_program_id`, `criterion_id`),
  KEY `idx_assessments_program` (`cbe_program_id`),
  KEY `idx_assessments_criterion` (`criterion_id`),
  CONSTRAINT `fk_assessments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assessments_program` FOREIGN KEY (`cbe_program_id`) REFERENCES `cbe_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assessments_criterion` FOREIGN KEY (`criterion_id`) REFERENCES `assessment_criteria` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assessments_assessed_by` FOREIGN KEY (`assessed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Assessment results (aggregated totals, release control)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assessment_results` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` INT UNSIGNED NOT NULL,
  `cbe_program_id` INT UNSIGNED NOT NULL,
  `total_score` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `grade` VARCHAR(10) NULL,
  `is_released` TINYINT(1) NOT NULL DEFAULT 0,
  `released_by` INT UNSIGNED NULL,
  `released_at` DATETIME NULL,
  `computed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_result_student_program` (`student_id`, `cbe_program_id`),
  KEY `idx_results_program` (`cbe_program_id`),
  CONSTRAINT `fk_results_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_results_program` FOREIGN KEY (`cbe_program_id`) REFERENCES `cbe_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_results_released_by` FOREIGN KEY (`released_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Partner confirmations of student participation
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partner_confirmations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `placement_id` INT UNSIGNED NOT NULL,
  `partner_user_id` INT UNSIGNED NOT NULL,
  `status` ENUM('Confirmed','Declined') NOT NULL DEFAULT 'Confirmed',
  `note` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_partner_confirm_placement` (`placement_id`),
  CONSTRAINT `fk_partner_confirm_placement` FOREIGN KEY (`placement_id`) REFERENCES `student_placements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partner_confirm_user` FOREIGN KEY (`partner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Partner feedback on student performance
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partner_feedback` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `placement_id` INT UNSIGNED NOT NULL,
  `partner_user_id` INT UNSIGNED NOT NULL,
  `rating` TINYINT UNSIGNED NULL,
  `comment` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_partner_feedback_placement` (`placement_id`),
  CONSTRAINT `fk_partner_feedback_placement` FOREIGN KEY (`placement_id`) REFERENCES `student_placements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partner_feedback_user` FOREIGN KEY (`partner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NULL,
  `type` ENUM('Info','Success','Warning','Reminder','Announcement') NOT NULL DEFAULT 'Info',
  `link` VARCHAR(255) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`, `is_read`),
  KEY `idx_notifications_created` (`created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Announcements (broadcast to roles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `audience` ENUM('All','Students','Instructors','Coordinators','Admin','Partners') NOT NULL DEFAULT 'All',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcements_audience` (`audience`),
  CONSTRAINT `fk_announcements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Audit logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NULL,
  `entity_id` INT UNSIGNED NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- System settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL,
  `description` VARCHAR(255) NULL,
  `updated_by` INT UNSIGNED NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_key` (`setting_key`),
  CONSTRAINT `fk_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;