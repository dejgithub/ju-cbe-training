-- ============================================================
-- Jimma University CBE Training Management System
-- Sample data / demonstration seed
-- Default password for every seeded account: Password@123
-- ============================================================

USE `ju_cbe_training`;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `audit_logs`;
TRUNCATE TABLE `system_settings`;
TRUNCATE TABLE `announcements`;
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `assessment_results`;
TRUNCATE TABLE `student_assessments`;
TRUNCATE TABLE `assessment_criteria`;
TRUNCATE TABLE `report_feedback`;
TRUNCATE TABLE `fieldwork_reports`;
TRUNCATE TABLE `attendance`;
TRUNCATE TABLE `activity_assignments`;
TRUNCATE TABLE `training_activities`;
TRUNCATE TABLE `student_placements`;
TRUNCATE TABLE `partner_feedback`;
TRUNCATE TABLE `partner_confirmations`;
TRUNCATE TABLE `student_groups`;
TRUNCATE TABLE `cbe_programs`;
TRUNCATE TABLE `community_partner_users`;
TRUNCATE TABLE `community_partners`;
TRUNCATE TABLE `community_sites`;
TRUNCATE TABLE `instructors`;
TRUNCATE TABLE `students`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `academic_years`;
TRUNCATE TABLE `departments`;
TRUNCATE TABLE `roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Roles
-- ------------------------------------------------------------
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'Admin',       'System administrator with full control over users and settings.'),
(2, 'Coordinator', 'CBE coordinator who manages programs, placements and reviews.'),
(3, 'Instructor',  'Instructor or field supervisor who records attendance and assesses students.'),
(4, 'Student',     'Student participating in CBE training.'),
(5, 'Partner',     'Community partner organization representative.');

-- ------------------------------------------------------------
-- Departments
-- ------------------------------------------------------------
INSERT INTO `departments` (`id`, `name`, `code`, `description`) VALUES
(1, 'Department of Public Health',     'PH', 'Public health education and fieldwork.'),
(2, 'Department of Nursing',           'NUR', 'Nursing education and clinical practice.'),
(3, 'Department of Medicine',          'MED', 'Medical education and clinical rotation.'),
(4, 'Department of Pharmacy',          'PHM', 'Pharmaceutical sciences education.'),
(5, 'Department of Medical Laboratory', 'MLS','Laboratory sciences education.');

-- ------------------------------------------------------------
-- Academic years
-- ------------------------------------------------------------
INSERT INTO `academic_years` (`id`, `name`, `start_date`, `end_date`, `is_current`) VALUES
(1, '2025/2026', '2025-10-01', '2026-07-30', 1);

-- ------------------------------------------------------------
-- Users  (password hash = bcrypt("Password@123"))
-- ------------------------------------------------------------
-- $2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS
INSERT INTO `users` (`id`, `role_id`, `department_id`, `username`, `email`, `password_hash`, `full_name`, `phone`, `must_change_password`) VALUES
(1,  1, NULL, 'admin',       'admin@ju.edu.et',        '$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'System Administrator', '0911000001', 0),
(2,  2, 1,    'coordinator', 'cbe.coordinator@ju.edu.et', '$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Worku Bekele',        '0911000002', 0),
(3,  3, 1,    'instructor',  'amanuel.itefa@ju.edu.et', '$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Amanuel Itefa',       '0911000003', 0),
(4,  4, 1,    'student',     'sara.abdulahi@ju.edu.et', '$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Sara Abdulahi',       '0911000004', 0),
(5,  5, NULL, 'partner',     'tesfaye.geno@health.gov.et','$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Tesfaye Geno',        '0911000005', 0),
(6,  3, 3,    'dr.abebech',  'abebech.lemma@ju.edu.et', '$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Abebech Lemma',       '0911000006', 0),
(7,  3, 4,    'mirgissa.k',  'mirgissa.k@ju.edu.et',    '$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Mirgissa Kebede',     '0911000007', 0),
(8,  4, 1,    'JU/2023/002', 'dawit.tesfaye@ju.edu.et', '$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Dawit Tesfaye',       '0911000008', 0),
(9,  4, 1,    'JU/2023/003', 'hana.girma@ju.edu.et',    '$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Hana Girma',          '0911000009', 0),
(10, 4, 2,    'JU/2023/004', 'yared.mengistu@ju.edu.et','$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Yared Mengistu',      '0911000010', 0),
(11, 4, 2,    'JU/2023/005', 'leul.sileshi@ju.edu.et',  '$2b$10$WUJ2MqtG57q3BukyLY6fz.rZjPRq3Y32x54AB7aUdZkGCDyJJGdeS', 'Leul Sileshi',        '0911000011', 0);

-- ------------------------------------------------------------
-- Students
-- ------------------------------------------------------------
INSERT INTO `students` (`id`, `user_id`, `student_id`, `full_name`, `gender`, `date_of_birth`, `department_id`, `year_of_study`, `email`, `phone`, `address`, `group_id`, `status`) VALUES
(1, 4,  'JU/2023/001', 'Sara Abdulahi',    'Female', '2003-04-12', 1, 3, 'sara.abdulahi@ju.edu.et', '0911000004', 'Jimma, Mendera',   NULL, 'Enrolled'),
(2, 8,  'JU/2023/002', 'Dawit Tesfaye',    'Male',   '2002-11-03', 1, 3, 'dawit.tesfaye@ju.edu.et', '0911000008', 'Jimma, Kochi',     NULL, 'Enrolled'),
(3, 9,  'JU/2023/003', 'Hana Girma',       'Female', '2003-02-25', 1, 3, 'hana.girma@ju.edu.et',    '0911000009', 'Jimma, Bore',      NULL, 'Enrolled'),
(4, 10, 'JU/2023/004', 'Yared Mengistu',   'Male',   '2002-07-19', 2, 3, 'yared.mengistu@ju.edu.et','0911000010', 'Jimma, Bosa Kito', NULL, 'Enrolled'),
(5, 11, 'JU/2023/005', 'Leul Sileshi',     'Male',   '2003-09-01', 2, 3, 'leul.sileshi@ju.edu.et',  '0911000011', 'Jimma, Jiren',     NULL, 'Enrolled');

-- ------------------------------------------------------------
-- Instructors
-- ------------------------------------------------------------
INSERT INTO `instructors` (`id`, `user_id`, `employee_id`, `title`, `department_id`, `specialization`, `phone`) VALUES
(1, 3, 'FAC/2020/118', 'Dr.', 1, 'Community Health',  '0911000003'),
(2, 6, 'FAC/2019/044', 'Dr.', 3, 'Internal Medicine', '0911000006'),
(3, 7, 'FAC/2021/072', 'Mr.', 4, 'Clinical Pharmacy', '0911000007');

-- ------------------------------------------------------------
-- Community partners
-- ------------------------------------------------------------
INSERT INTO `community_partners` (`id`, `organization_name`, `contact_person`, `phone`, `email`, `address`, `description`) VALUES
(1, 'Jimma Town Health Bureau',      'Tesfaye Geno',   '0911000005', 'tesfaye.geno@health.gov.et', 'Jimma, Town',   'Coordinates public health activities in Jimma town.'),
(2, 'Shenen Gibe Hospital',          'Dr. Bekele Wolde', '0911000020', 'shenengibe@hospital.et',   'Jimma, Shenen', 'District hospital supporting clinical placements.'),
(3, 'Jimma Model Primary School',    'Almaz Fikadu',   '0911000021', 'model.school@ju.edu.et',   'Jimma, Kochi',  'Primary school for school health activities.'),
(4, 'Kochi Kebele Administration',   'Gemechu Ayana',  '0911000022', 'kochi.kebele@ju.edu.et',   'Jimma, Kochi',  'Local kebele administration office.');

INSERT INTO `community_partner_users` (`id`, `user_id`, `community_partner_id`) VALUES
(1, 5, 1);

-- ------------------------------------------------------------
-- Community sites
-- ------------------------------------------------------------
INSERT INTO `community_sites` (`id`, `name`, `site_type`, `address`, `city`, `contact_person`, `phone`, `email`, `available_placements`, `community_partner_id`, `status`) VALUES
(1, 'Jimma University Specialized Hospital', 'Hospital',       'JU Campus',       'Jimma', 'Dr. Meseret Daba', '0911000030', 'jush@ju.edu.et',       30, 1, 'Active'),
(2, 'Shenen Gibe Hospital',                  'Hospital',       'Shenen',          'Jimma', 'Dr. Bekele Wolde', '0911000020', 'shenengibe@hospital.et', 15, 2, 'Active'),
(3, 'Jimma Model Primary School',            'School',         'Kochi',           'Jimma', 'Almaz Fikadu',     '0911000021', 'model.school@ju.edu.et', 10, 3, 'Active'),
(4, 'Kochi Health Center',                   'Health Center',  'Kochi',           'Jimma', 'Mulugeta Girma',   '0911000031', 'kochi.hc@ju.edu.et',     12, 1, 'Active'),
(5, 'Kochi Kebele Administration Office',    'Kebele',         'Kochi',           'Jimma', 'Gemechu Ayana',    '0911000022', 'kochi.kebele@ju.edu.et',  8, 4, 'Active');

-- ------------------------------------------------------------
-- CBE programs
-- ------------------------------------------------------------
INSERT INTO `cbe_programs` (`id`, `name`, `code`, `description`, `objectives`, `learning_outcomes`, `department_id`, `coordinator_user_id`, `academic_year_id`, `start_date`, `end_date`, `location`, `status`, `created_by`) VALUES
(1, 'Community Health Education Rotation 2025/2026', 'CBE-PH-2025', 'Six week community-based education rotation for third year health students.', 'Apply public health theory in real community settings; conduct community diagnosis.', 'Students will perform community health education, data collection and reporting.', 1, 2, 1, '2026-01-10', '2026-12-20', 'Jimma Town and surrounding woredas', 'Active', 1),
(2, 'Rural Clinical Attachment 2026', 'CBE-MED-2026', 'Clinical attachment programme at district hospitals.', 'Strengthen clinical skills in resource limited settings.', 'Students demonstrate patient management under supervision.', 3, 2, 1, '2026-03-01', '2026-11-30', 'Shenen Gibe Hospital', 'Planned', 1);

-- ------------------------------------------------------------
-- Student groups
-- ------------------------------------------------------------
INSERT INTO `student_groups` (`id`, `name`, `code`, `cbe_program_id`, `department_id`, `academic_year_id`) VALUES
(1, 'Group A', 'GRP-A', 1, 1, 1),
(2, 'Group B', 'GRP-B', 1, 2, 1);

UPDATE `students` SET `group_id` = 1 WHERE `id` IN (1, 2, 5);
UPDATE `students` SET `group_id` = 2 WHERE `id` IN (3, 4);

-- ------------------------------------------------------------
-- Student placements
-- ------------------------------------------------------------
INSERT INTO `student_placements` (`id`, `student_id`, `community_site_id`, `cbe_program_id`, `supervisor_id`, `group_id`, `start_date`, `end_date`, `status`, `assigned_by`) VALUES
(1, 1, 1, 1, 1, 1, '2026-10-12', '2026-11-22', 'Active', 2),
(2, 2, 4, 1, 1, 1, '2026-10-12', '2026-11-22', 'Active', 2),
(3, 5, 3, 1, 3, 1, '2026-10-12', '2026-11-22', 'Active', 2),
(4, 3, 2, 1, 2, 2, '2026-10-12', '2026-11-22', 'Active', 2),
(5, 4, 5, 1, 2, 2, '2026-10-12', '2026-11-22', 'Active', 2);

-- ------------------------------------------------------------
-- Training activities
-- ------------------------------------------------------------
INSERT INTO `training_activities` (`id`, `cbe_program_id`, `community_site_id`, `title`, `description`, `type`, `scheduled_date`, `start_time`, `end_time`, `location`, `deadline_at`, `created_by`) VALUES
(1, 1, NULL, 'Orientation and Baseline Assessment', 'Welcome briefing, objectives and pre-training knowledge test.', 'Lecture', '2026-10-12', '08:30:00', '10:30:00', 'JU CBE Training Hall', NULL, 2),
(2, 1, 4, 'Community Health Education Session', 'Health education session on hygiene at Kochi Health Center.', 'Field Work', '2026-10-13', '09:00:00', '12:00:00', 'Kochi Health Center', NULL, 3),
(3, 1, 1, 'Hospital Ward Rotation', 'Morning ward rounds with supervision.', 'Field Work', '2026-10-14', '08:00:00', '12:00:00', 'JUSH Ward 4', NULL, 3),
(4, 1, NULL, 'Fieldwork Report Draft 1', 'Submit first draft of community diagnosis report.', 'Assignment', NULL, NULL, NULL, NULL, '2026-10-20 17:00:00', 2),
(5, 1, 3, 'School Health Screening', 'Vision and hygiene screening at Jimma Model Primary School.', 'Field Work', '2026-10-19', '09:00:00', '13:00:00', 'Jimma Model Primary School', NULL, 3),
(6, 1, NULL, 'Group Discussion - Community Diagnosis', 'Group presentation of community diagnosis findings.', 'Group Discussion', '2026-10-26', '10:00:00', '12:00:00', 'JU CBE Training Hall', NULL, 2);

-- Placements define who attends which activity; activity_assignments link students to tasks
INSERT INTO `activity_assignments` (`activity_id`, `student_id`, `status`) VALUES
(1, 1, 'Pending'), (1, 2, 'Pending'), (1, 3, 'Pending'), (1, 4, 'Pending'), (1, 5, 'Pending'),
(2, 1, 'Pending'), (2, 2, 'Pending'), (2, 3, 'Pending'), (2, 4, 'Pending'), (2, 5, 'Pending'),
(3, 1, 'Pending'), (3, 3, 'Pending'),
(4, 1, 'Pending'), (4, 2, 'Pending'), (4, 3, 'Pending'), (4, 4, 'Pending'), (4, 5, 'Pending'),
(5, 1, 'Pending'), (5, 2, 'Pending'), (5, 3, 'Pending'), (5, 4, 'Pending'), (5, 5, 'Pending');

-- ------------------------------------------------------------
-- Attendance (Oct 13, 2026 session at Kochi Health Center)
-- ------------------------------------------------------------
INSERT INTO `attendance` (`student_id`, `activity_id`, `cbe_program_id`, `attendance_date`, `status`, `remarks`, `recorded_by`) VALUES
(1, 2, 1, '2026-10-13', 'Present', 'Full participation',             3),
(2, 2, 1, '2026-10-13', 'Present', 'On time',                         3),
(3, 2, 1, '2026-10-13', 'Late',    'Arrived 20 minutes late',         3),
(4, 2, 1, '2026-10-13', 'Present', 'On time',                         3),
(5, 2, 1, '2026-10-13', 'Excused', 'Medical appointment',             3);

INSERT INTO `attendance` (`student_id`, `activity_id`, `cbe_program_id`, `attendance_date`, `status`, `remarks`, `recorded_by`) VALUES
(1, 1, 1, '2026-10-12', 'Present', '', 2),
(2, 1, 1, '2026-10-12', 'Present', '', 2),
(3, 1, 1, '2026-10-12', 'Absent',  '', 2),
(4, 1, 1, '2026-10-12', 'Present', '', 2),
(5, 1, 1, '2026-10-12', 'Present', '', 2);

-- ------------------------------------------------------------
-- Assessment criteria for program 1
-- ------------------------------------------------------------
INSERT INTO `assessment_criteria` (`id`, `cbe_program_id`, `name`, `description`, `weight`) VALUES
(1, 1, 'Participation',          'Active participation in field activities',        20.00),
(2, 1, 'Teamwork',               'Collaboration with peers and community',           15.00),
(3, 1, 'Communication',          'Clarity of oral and written communication',        15.00),
(4, 1, 'Problem Solving',        'Ability to identify and solve community issues',   20.00),
(5, 1, 'Professional Conduct',   'Ethics, punctuality and professional behaviour',    15.00),
(6, 1, 'Learning Objectives',    'Achievement of stated learning objectives',         15.00);

-- ------------------------------------------------------------
-- Student assessments (scores out of 100 per criterion)
-- ------------------------------------------------------------
INSERT INTO `student_assessments` (`student_id`, `cbe_program_id`, `criterion_id`, `score`, `comment`, `assessed_by`) VALUES
(1, 1, 1, 88.00, 'Excellent participation', 3),
(1, 1, 2, 85.00, 'Works well in team', 3),
(1, 1, 3, 82.00, 'Good communication', 3),
(1, 1, 4, 86.00, 'Strong problem solving', 3),
(1, 1, 5, 90.00, 'Very professional', 3),
(1, 1, 6, 84.00, 'Objectives met', 3),
(2, 1, 1, 80.00, 'Good', 3),
(2, 1, 2, 78.00, 'Good', 3),
(2, 1, 3, 75.00, 'Average', 3),
(2, 1, 4, 82.00, 'Good', 3),
(2, 1, 5, 85.00, 'Professional', 3),
(2, 1, 6, 80.00, 'Good', 3),
(3, 1, 1, 72.00, 'Needs more engagement', 2),
(3, 1, 2, 80.00, 'Good', 2),
(3, 1, 3, 78.00, 'Good', 2),
(3, 1, 4, 75.00, 'Average', 2),
(3, 1, 5, 70.00, 'Punctuality issue', 2),
(3, 1, 6, 76.00, 'Good', 2);

-- ------------------------------------------------------------
-- Fieldwork reports
-- ------------------------------------------------------------
INSERT INTO `fieldwork_reports` (`id`, `student_id`, `cbe_program_id`, `title`, `description`, `file_path`, `file_name`, `file_type`, `file_size`, `status`, `review_comment`, `reviewed_by`, `reviewed_at`, `submitted_at`) VALUES
(1, 1, 1, 'Community Diagnosis: Kochi Health Center', 'First draft covering household survey findings.', 'uploads/reports/sample_report.pdf', 'Sample_Report_Draft.pdf', 'pdf', 124000, 'Under Review', NULL, NULL, NULL, '2026-10-14 09:15:00');

-- ------------------------------------------------------------
-- Notifications
-- ------------------------------------------------------------
INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `link`) VALUES
(1, 'Welcome', 'Welcome to the CBE Training Management System.', 'Success', '/dashboard'),
(2, 'Pending approvals', 'You have 1 fieldwork report awaiting review.', 'Warning', '/reports'),
(4, 'New activity', 'Health Education Session scheduled for Oct 13 at Kochi Health Center.', 'Reminder', '/activities'),
(3, 'Report submitted', 'Sara Abdulahi submitted a fieldwork report for review.', 'Info', '/reports/view/1');

-- ------------------------------------------------------------
-- Announcements
-- ------------------------------------------------------------
INSERT INTO `announcements` (`title`, `message`, `audience`, `is_active`, `created_by`) VALUES
('CBE Rotation Orientation', 'All CBE students must attend the orientation on October 12, 08:30 AM at the CBE Training Hall.', 'All', 1, 1),
('Report Submission Deadline', 'Fieldwork report draft 1 is due on October 20. Submit through the portal.', 'Students', 1, 2);

-- ------------------------------------------------------------
-- System settings
-- ------------------------------------------------------------
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`, `updated_by`) VALUES
('site_name', 'Jimma University CBE Training Management System', 'Name shown in browser tab and header', 1),
('institution_name', 'Jimma University', 'Institution name shown in the top bar', 1),
('pass_mark', '50', 'Minimum weighted total score to pass a CBE program', 1),
('assessment_weights_locked', '0', 'Whether assessment weights can still be edited', 1);

-- ------------------------------------------------------------
-- Audit log sample entries
-- ------------------------------------------------------------
INSERT INTO `audit_logs` (`user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`) VALUES
(1, 'CREATE', 'cbe_programs', 1, '{"name":"Community Health Education Rotation 2025/2026"}', '127.0.0.1'),
(3, 'CREATE', 'attendance', 2, '{"records":5}', '127.0.0.1'),
(2, 'CREATE', 'student_placements', 1, '{"student_id":1}', '127.0.0.1');