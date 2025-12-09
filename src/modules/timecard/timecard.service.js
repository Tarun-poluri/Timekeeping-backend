import { prisma } from '../../config/db.js';

function calculateHours(startTime, endTime, breakMinutes) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const worked = Math.max(0, end - start - (breakMinutes || 0));
  return Math.round((worked / 60) * 100) / 100;
}

function getWeekRangeFromDate(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  // Assume week ends Sunday; get upcoming Sunday as weekEnding
  const weekEnding = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (7 - day) % 7));
  return weekEnding;
}

export const TimecardService = {
  async addDailyEntry(userId, payload) {
    const { date, startTime, endTime, breakMinutes = 0, notes } = payload;
    const weekEnding = getWeekRangeFromDate(date);

    // If a timecard exists and is approved, block edits
    const existingTimecard = await prisma.timecard.findUnique({
      where: { userId_weekEnding: { userId, weekEnding } },
      select: { id: true, status: true },
    });
    if (existingTimecard && existingTimecard.status === 'approved') {
      const err = new Error('Approved timecards cannot be modified');
      err.status = 403;
      throw err;
    }

    // Ensure one entry per day per user
    const existing = await prisma.dailyEntry.findFirst({
      where: {
        date: new Date(date),
        timecard: { userId },
      },
      include: { timecard: true },
    });
    if (existing) {
      const err = new Error('Daily entry already exists for this date');
      err.status = 409;
      throw err;
    }

    // Upsert timecard for week
    const timecard = await prisma.timecard.upsert({
      where: { userId_weekEnding: { userId, weekEnding } },
      create: {
        userId,
        weekEnding,
        totalHours: 0,
        regularHours: 0,
        overtime: 0,
        status: 'pending',
        submittedAt: new Date(),
        issues: [],
      },
      update: {},
    });

    const hours = calculateHours(startTime, endTime, breakMinutes);

    const entry = await prisma.dailyEntry.create({
      data: {
        date: new Date(date),
        startTime,
        endTime,
        breakMinutes,
        hours,
        notes,
        timecardId: timecard.id,
      },
    });

    await TimecardService.recalculateTimecard(timecard.id);
    return entry;
  },

  async upsertWeekEntries(userId, weekEndingStr, entries) {
    const weekEnding = new Date(weekEndingStr);

    // If a timecard exists and is approved, block edits
    const approvedCheck = await prisma.timecard.findUnique({
      where: { userId_weekEnding: { userId, weekEnding } },
      select: { id: true, status: true },
    });
    if (approvedCheck && approvedCheck.status === 'approved') {
      const err = new Error('Approved timecards cannot be modified');
      err.status = 403;
      throw err;
    }

    const timecard = await prisma.timecard.upsert({
      where: { userId_weekEnding: { userId, weekEnding } },
      create: {
        userId,
        weekEnding,
        totalHours: 0,
        regularHours: 0,
        overtime: 0,
        status: 'pending',
        submittedAt: new Date(),
        issues: [],
      },
      update: {},
    });

    // Limit to 5 entries
    const dates = new Set();
    for (const e of entries) {
      const dKey = new Date(e.date).toISOString().slice(0, 10);
      if (dates.has(dKey)) {
        const err = new Error('Duplicate dates in entries');
        err.status = 422;
        throw err;
      }
      dates.add(dKey);
    }

    // Remove existing entries for provided dates then create new ones
    const dateList = [...dates].map((d) => new Date(d));
    await prisma.dailyEntry.deleteMany({ where: { timecardId: timecard.id, date: { in: dateList } } });

    const created = await prisma.$transaction(
      entries.map((e) =>
        prisma.dailyEntry.create({
          data: {
            date: new Date(e.date),
            startTime: e.startTime,
            endTime: e.endTime,
            breakMinutes: e.breakMinutes || 0,
            hours: calculateHours(e.startTime, e.endTime, e.breakMinutes || 0),
            notes: e.notes,
            timecardId: timecard.id,
          },
        })
      )
    );

    await TimecardService.recalculateTimecard(timecard.id);
    return { timecardId: timecard.id, entries: created };
  },

  async recalculateTimecard(timecardId) {
    const entries = await prisma.dailyEntry.findMany({ where: { timecardId } });
    const total = entries.reduce((sum, e) => sum + e.hours, 0);
    const regularHours = Math.min(40, total);
    const overtime = Math.max(0, total - 40);
    await prisma.timecard.update({
      where: { id: timecardId },
      data: { totalHours: total, regularHours, overtime },
    });
  },

  async getWeeklyCards(query) {
    const { page = 1, perPage = 10, startDate, endDate, userId, status, search } = query;
    const skip = (Number(page) - 1) * Number(perPage);
    const take = Number(perPage);
    
    // Build user search conditions
    let userWhere = {};
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      userWhere = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { department: { contains: searchTerm, mode: 'insensitive' } },
          ...(Number.isNaN(Number(searchTerm)) ? [] : [{ id: Number(searchTerm) }])
        ]
      };
    }
    
    const where = {
      ...(startDate || endDate
        ? { weekEnding: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined } }
        : {}),
      ...(userId ? { userId: Number(userId) } : {}),
      ...(status ? { status } : {}),
      ...(Object.keys(userWhere).length > 0 ? { user: userWhere } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.timecard.findMany({
        where,
        orderBy: { weekEnding: 'desc' },
        skip,
        take,
        include: { user: true, dailyEntries: true },
      }),
      prisma.timecard.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: Number(page),
        perPage: Number(perPage),
        total,
        totalPages: Math.ceil(total / Number(perPage)),
      },
    };
  },

  async getMyWeek(userId, weekEndingStr) {
    const weekEnding = new Date(weekEndingStr);
    const timecard = await prisma.timecard.findUnique({
      where: { userId_weekEnding: { userId, weekEnding } },
      include: { dailyEntries: true },
    });
    return timecard;
  },

  async updateDailyEntry(userId, entryId, payload) {
    const entry = await prisma.dailyEntry.findUnique({ include: { timecard: true }, where: { id: Number(entryId) } });
    if (!entry || entry.timecard.userId !== userId) {
      const err = new Error('Entry not found');
      err.status = 404;
      throw err;
    }
    if (entry.timecard.status === 'approved') {
      const err = new Error('Approved timecards cannot be modified');
      err.status = 403;
      throw err;
    }
    const { startTime = entry.startTime, endTime = entry.endTime, breakMinutes = entry.breakMinutes, notes = entry.notes } = payload;
    const hours = calculateHours(startTime, endTime, breakMinutes);
    const updated = await prisma.dailyEntry.update({
      where: { id: entry.id },
      data: { startTime, endTime, breakMinutes, hours, notes },
    });
    await TimecardService.recalculateTimecard(entry.timecardId);
    return updated;
  },

  async deleteDailyEntry(userId, entryId) {
    const entry = await prisma.dailyEntry.findUnique({ include: { timecard: true }, where: { id: Number(entryId) } });
    if (!entry || entry.timecard.userId !== userId) {
      const err = new Error('Entry not found');
      err.status = 404;
      throw err;
    }
    if (entry.timecard.status === 'approved') {
      const err = new Error('Approved timecards cannot be modified');
      err.status = 403;
      throw err;
    }
    await prisma.dailyEntry.delete({ where: { id: entry.id } });
    await TimecardService.recalculateTimecard(entry.timecardId);
  },

  async submitTimecard(userId, weekEndingStr) {
    const weekEnding = new Date(weekEndingStr);
    const timecard = await prisma.timecard.findUnique({ where: { userId_weekEnding: { userId, weekEnding } } });
    if (!timecard) {
      const err = new Error('Timecard not found');
      err.status = 404;
      throw err;
    }
    if (timecard.userId !== userId) {
      const err = new Error('You can only submit your own timecard');
      err.status = 403;
      throw err;
    }
    if (timecard.status === 'approved') {
      const err = new Error('Approved timecards cannot be modified');
      err.status = 403;
      throw err;
    }
    return prisma.timecard.update({ where: { id: timecard.id }, data: { status: 'submitted', submittedAt: new Date() } });
  },

  async setTimecardStatus(adminUser, timecardId, status) {
    return prisma.timecard.update({ where: { id: Number(timecardId) }, data: { status } });
  },

  async deleteTimecard(adminUser, timecardId) {
    await prisma.dailyEntry.deleteMany({ where: { timecardId: Number(timecardId) } });
    return prisma.timecard.delete({ where: { id: Number(timecardId) } });
  },

  async getMyTimecardsHistory(userId) {
    // Get all timecards for the user
    const timecards = await prisma.timecard.findMany({
      where: { userId },
      select: {
        id: true,
        totalHours: true,
        overtime: true,
        status: true,
        weekEnding: true,
      },
      orderBy: { weekEnding: 'desc' },
    });

    // Calculate statistics
    const totalTimecards = timecards.length;
    const totalHours = timecards.reduce((sum, tc) => sum + tc.totalHours, 0);
    const overtimeHours = timecards.reduce((sum, tc) => sum + tc.overtime, 0);
    const approvedTimecards = timecards.filter(tc => tc.status === 'approved').length;
    const approvalRate = totalTimecards > 0 ? Math.round((approvedTimecards / totalTimecards) * 100) : 0;

    // Get this week's approved count
    const thisWeek = new Date();
    const weekStart = new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - thisWeek.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    const approvedThisWeek = timecards.filter(tc => 
      tc.status === 'approved' && 
      tc.weekEnding >= weekStart && 
      tc.weekEnding <= weekEnd
    ).length;

    return {
      totalTimecards,
      totalHours: Math.round(totalHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      approvalRate,
      approvedThisWeek,
      timecards: timecards.slice(0, 10), // Return last 10 timecards for history
    };
  },

  async getWeeklyHoursOverview() {
    // Get current date and calculate past 4 weeks (excluding current week)
    const now = new Date();
    const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1); // Monday of current week
    const fourWeeksAgo = new Date(currentWeekStart);
    fourWeeksAgo.setDate(currentWeekStart.getDate() - 28); // 4 weeks before current week

    // Get all approved timecards from the past 4 weeks
    const timecards = await prisma.timecard.findMany({
      where: {
        status: 'approved',
        weekEnding: {
          gte: fourWeeksAgo,
          lt: currentWeekStart, // Exclude current week
        },
      },
      select: {
        weekEnding: true,
        regularHours: true, 
        overtime: true,
      },
      orderBy: { weekEnding: 'asc' },
    });

    // Group by week and calculate totals
    const weeklyData = {};
    
    for (const timecard of timecards) {
      const weekKey = timecard.weekEnding.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekEnding: timecard.weekEnding,
          regular: 0,
          overtime: 0,
        };
      }
      
      weeklyData[weekKey].regular += timecard.regularHours;
      weeklyData[weekKey].overtime += timecard.overtime;
    }

    // Convert to array and format for response
    const weeklyHoursData = Object.values(weeklyData)
      .sort((a, b) => a.weekEnding - b.weekEnding)
      .slice(-4) // Get last 4 weeks
      .map((week, index) => ({
        week: `Week ${index + 1}`,
        regular: Math.round(week.regular * 100) / 100,
        overtime: Math.round(week.overtime * 100) / 100,
        weekEnding: week.weekEnding.toISOString().split('T')[0],
      }));

    return {
      weeklyHoursData,
      totalWeeks: weeklyHoursData.length,
      period: {
        from: fourWeeksAgo.toISOString().split('T')[0],
        to: currentWeekStart.toISOString().split('T')[0],
      },
    };
  },

  async getDepartmentHoursOverview() {
    // Get current date and calculate past 4 weeks (excluding current week)
    const now = new Date();
    const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1); // Monday of current week
    const fourWeeksAgo = new Date(currentWeekStart);
    fourWeeksAgo.setDate(currentWeekStart.getDate() - 28); // 4 weeks before current week

    // Get all approved timecards from the past 4 weeks with user department info
    const timecards = await prisma.timecard.findMany({
      where: {
        status: 'approved',
        weekEnding: {
          gte: fourWeeksAgo,
          lt: currentWeekStart, // Exclude current week
        },
      },
      select: {
        regularHours: true,
        overtime: true,
        user: {
          select: {
            department: true,
          },
        },
      },
    });

    // Define all departments with their colors
    const allDepartments = {
      engineering: { name: 'Engineering', color: '#8884d8' },
      marketing: { name: 'Marketing', color: '#82ca9d' },
      sales: { name: 'Sales', color: '#ffc658' },
      hr: { name: 'HR', color: '#ff7300' },
      finance: { name: 'Finance', color: '#0088fe' },
      operations: { name: 'Operations', color: '#00c49f' },
    };

    // Initialize all departments with 0 hours
    const departmentData = {};
    for (const [key, dept] of Object.entries(allDepartments)) {
      departmentData[key] = {
        department: dept.name,
        hours: 0,
        color: dept.color,
      };
    }

    // Add actual data from timecards
    for (const timecard of timecards) {
      const department = timecard.user.department.toLowerCase();
      const totalHours = timecard.regularHours + timecard.overtime;
      
      if (departmentData[department]) {
        departmentData[department].hours += totalHours;
      }
    }

    // Convert to array and format for response
    const departmentHoursData = Object.values(departmentData)
      .map(dept => ({
        department: dept.department,
        hours: Math.round(dept.hours * 100) / 100,
        color: dept.color,
      }))
      .sort((a, b) => b.hours - a.hours); // Sort by hours descending

    return {
      departmentHoursData,
      totalDepartments: departmentHoursData.length,
      period: {
        from: fourWeeksAgo.toISOString().split('T')[0],
        to: currentWeekStart.toISOString().split('T')[0],
      },
    };
  },

  async getAdminDashboardStats() {
    // Current week (Mon-Sun)
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const [totalEmployees, pendingTimecards, approvedThisWeek, complianceIssues] = await Promise.all([
      prisma.user.count({ where: { role: 'employee' } }),
      // Consider 'submitted' as pending review
      prisma.timecard.count({ where: { status: 'submitted' } }),
      prisma.timecard.count({
        where: {
          status: 'approved',
          weekEnding: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.timecard.count({
        where: {
          status: 'approved',
          weekEnding: { gte: weekStart, lte: weekEnd },
          totalHours: { gt: 40 },
        },
      }),
    ]);

    return {
      totalEmployees,
      pendingTimecards,
      complianceIssues,
      approvedThisWeek,
    };
  },

  async getAdminEmployeeCardsData() {
    // Current week window (Mon-Sun)
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Employees only
    const [activeEmployees, inactiveEmployees, departmentCount] = await Promise.all([
      prisma.user.count({ where: { role: 'employee', userStatus: 'active' } }),
      prisma.user.count({ where: { role: 'employee', userStatus: 'inactive' } }),
      prisma.user.findMany({ where: { role: 'employee' }, select: { department: true }, distinct: ['department'] }),
    ]);

    // Timecards this week for employees
    const timecards = await prisma.timecard.findMany({
      where: {
        user: { role: 'employee' },
        weekEnding: { gte: weekStart, lte: weekEnd },
      },
      select: { totalHours: true, overtime: true },
    });

    const totalHoursThisWeek = timecards.reduce((s, t) => s + t.totalHours, 0);
    const totalOvertimeThisWeek = timecards.reduce((s, t) => s + t.overtime, 0);
    const numEmployeesForAvg = activeEmployees > 0 ? activeEmployees : 1;
    const avgWeeklyHoursPerEmployee = totalHoursThisWeek / numEmployeesForAvg;

    return {
      totalEmployeesActive: activeEmployees,
      notactive: inactiveEmployees,
      departments: departmentCount.length,
      avgWeeklyHoursPerEmployee: Math.round(avgWeeklyHoursPerEmployee * 100) / 100,
      totalOvertimeThisWeek: Math.round(totalOvertimeThisWeek * 100) / 100,
    };
  },

  async getYesterdayStatus(userId) {
    // Determine yesterday date in UTC (aligning with saved dates)
    const now = new Date();
    const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const isoDay = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD

    // Find any daily entry for yesterday for this user via join on timecard
    const entry = await prisma.dailyEntry.findFirst({
      where: {
        date: { gte: new Date(isoDay + 'T00:00:00.000Z'), lt: new Date(isoDay + 'T23:59:59.999Z') },
        timecard: { userId: userId },
      },
      select: { startTime: true, breakMinutes: true, hours: true },
    });

    if (!entry) {
      return {
        clockedIn: false,
        startTime: '0',
        breaksTaken: 0,
        hoursWorked: 0,
      };
    }

    // Convert start time like "09:30" to a friendly AM/PM
    const [hStr, mStr] = entry.startTime.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = ((h + 11) % 12) + 1;
    const friendlyStart = `${hour12}:${m.toString().padStart(2, '0')} ${period}`;

    return {
      clockedIn: true,
      startTime: friendlyStart,
      breaksTaken: entry.breakMinutes > 0 ? 1 : 0,
      hoursWorked: Math.round(entry.hours * 100) / 100,
    };
  },

  async getTodayStatus(userId) {
    // Determine today's date in UTC (aligning with saved dates)
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const isoDay = today.toISOString().slice(0, 10); // YYYY-MM-DD

    // Find any daily entry for today for this user via join on timecard
    const entry = await prisma.dailyEntry.findFirst({
      where: {
        date: { gte: new Date(isoDay + 'T00:00:00.000Z'), lt: new Date(isoDay + 'T23:59:59.999Z') },
        timecard: { userId: userId },
      },
      select: { date: true, startTime: true, endTime: true, breakMinutes: true, notes: true },
    });

    if (!entry) {
      return null; // No entry for today
    }

    return {
      date: entry.date.toISOString().slice(0, 10), // YYYY-MM-DD format
      startTime: entry.startTime,
      endTime: entry.endTime,
      breakMinutes: entry.breakMinutes,
      notes: entry.notes || '',
    };
  },
};


