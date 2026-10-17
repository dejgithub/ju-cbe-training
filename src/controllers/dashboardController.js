const analytics = require('../models/analytics.model');
const activityModel = require('../models/activity.model');
const reportModel = require('../models/report.model');
const adminModel = require('../models/admin.model');
const userModel = require('../models/user.model');
const { ROLES } = require('../middleware/auth');

async function index(req, res) {
  const user = req.session.user;
  const counts = await analytics.dashboardCounts();

  let data = {
    counts,
    participation: [],
    attendance: [],
    programs: [],
    upcoming: [],
    announcements: [],
    myResults: [],
    studentAttendance: [],
    supervisorReports: [],
  };

  data.announcements = await adminModel.activeAnnouncementsForRoles([user.role, 'All']);

  if (user.role === ROLES.STUDENT) {
    const student = await userModel.studentByUserId(user.id);
    if (student) {
      data.student = student;
      data.upcoming = await activityModel.upcomingForStudent(student.id, 6);
      data.studentAttendance = await require('../models/attendance.model').studentMonthly(student.id, 3);
      data.myResults = await require('../models/assessment.model').resultsForStudent(student.id);
      data.myReports = await reportModel.forStudent(student.id);
    }
  } else if (user.role === ROLES.INSTRUCTOR) {
    const instructor = await userModel.instructorByUserId(user.id);
    if (instructor) {
      data.supervisorReports = await require('../models/placement.model').findAll({ programId: '' });
      const all = data.supervisorReports.filter(() => true);
      data.supervisorReports = data.supervisorReports.filter((p) => p.supervisor_id === instructor.id);
      data.instructor = instructor;
    }
    data.upcoming = await activityModel.upcoming(6);
  } else if (user.role === ROLES.PARTNER) {
    const partner = await userModel.partnerLinkByUserId(user.id);
    if (partner) {
      data.partner = partner;
      data.partnerSites = await require('../models/site.model').sitesForPartner(partner.community_partner_id);
    }
  } else {
    data.participation = await analytics.participationByDepartment();
    data.attendance = await analytics.attendanceTrend(14);
    data.programs = await analytics.participationByProgram();
    data.upcoming = await activityModel.upcoming(8);
    if (user.role === ROLES.ADMIN || user.role === ROLES.COORDINATOR) {
      data.pendingReports = await reportModel.pendingCount();
    }
  }

  return res.render('dashboard/index', {
    layout: 'layouts/main',
    title: 'Dashboard',
    ...data,
  });
}

module.exports = { index };