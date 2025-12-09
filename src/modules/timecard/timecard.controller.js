import { TimecardService } from './timecard.service.js';
import { successResponse } from '../../utils/response.util.js';
import { MESSAGES } from '../../config/messages.js';

export const TimecardController = {
  async addDailyEntry(req, res, next) {
    try {
      const entry = await TimecardService.addDailyEntry(req.user.id, req.body);
      return successResponse(res, MESSAGES.TIME_ENTRY_ADDED, { entry }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async upsertWeekEntries(req, res, next) {
    try {
      const { weekEnding, entries } = req.body;
      const result = await TimecardService.upsertWeekEntries(req.user.id, weekEnding, entries);
      return successResponse(res, MESSAGES.TIME_ENTRIES_UPDATED, result, 200);
    } catch (err) {
      return next(err);
    }
  },

  async getWeeklyCards(req, res, next) {
    try {
      const result = await TimecardService.getWeeklyCards(res.locals?.validatedQuery || req.query);
      return successResponse(res, MESSAGES.TIMECARDS_FETCHED, result, 200);
    } catch (err) {
      return next(err);
    }
  },

  async getAllTimecardsUser(req, res, next) {
    try {
      const query = res.locals?.validatedQuery || req.query;
      // Automatically filter by the authenticated user's ID
      const queryWithUserId = { ...query, userId: req.user.id };
      const result = await TimecardService.getWeeklyCards(queryWithUserId);
      return successResponse(res, MESSAGES.TIMECARDS_FETCHED, result, 200);
    } catch (err) {
      return next(err);
    }
  },

  async getMyWeek(req, res, next) {
    try {
      const { weekEnding } = req.query;
      const timecard = await TimecardService.getMyWeek(req.user.id, weekEnding);
      return successResponse(res, MESSAGES.TIMECARD_FETCHED, { timecard }, 200);
    } catch (err) {
      return next(err);
    }
  },

  async updateDailyEntry(req, res, next) {
    try {
      const params = res.locals?.validatedParams || req.params;
      const updated = await TimecardService.updateDailyEntry(req.user.id, params.id, req.body);
      return successResponse(res, MESSAGES.DAILY_ENTRY_UPDATED, { entry: updated }, 200);
    } catch (err) {
      return next(err);
    }
  },

  async deleteDailyEntry(req, res, next) {
    try {
      const params = res.locals?.validatedParams || req.params;
      await TimecardService.deleteDailyEntry(req.user.id, params.id);
      return successResponse(res, MESSAGES.DAILY_ENTRY_DELETED, {} , 200);
    } catch (err) {
      return next(err);
    }
  },

  async submitTimecard(req, res, next) {
    try {
      const { weekEnding } = req.body;
      const tc = await TimecardService.submitTimecard(req.user.id, weekEnding);
      return successResponse(res, MESSAGES.TIMECARD_SUBMITTED, { timecard: tc }, 200);
    } catch (err) {
      return next(err);
    }
  },

  async setTimecardStatus(req, res, next) {
    try {
      const params = res.locals?.validatedParams || req.params;
      const tc = await TimecardService.setTimecardStatus(req.user, params.id, req.body.status);
      return successResponse(res, MESSAGES.TIMECARD_STATUS_UPDATED, { timecard: tc }, 200);
    } catch (err) {
      return next(err);
    }
  },

  async deleteTimecard(req, res, next) {
    try {
      const params = res.locals?.validatedParams || req.params;
      const tc = await TimecardService.deleteTimecard(req.user, params.id);
      return successResponse(res, MESSAGES.TIMECARD_DELETED, { timecard: tc }, 200);
    } catch (err) {
      return next(err);
    }
  },

  async getMyTimecardsHistory(req, res, next) {
    try {
      const stats = await TimecardService.getMyTimecardsHistory(req.user.id);
      const { totalTimecards, totalHours, overtimeHours, approvalRate } = stats;
      return successResponse(
        res,
        'Timecard history fetched successfully',
        { totalTimecards, totalHours, overtimeHours, approvalRate },
        200
      );
    } catch (err) {
      return next(err);
    }
  },

  async getWeeklyHoursOverview(req, res, next) {
    try {
      const overview = await TimecardService.getWeeklyHoursOverview();
      return successResponse(
        res,
        'Weekly hours overview fetched successfully',
        overview,
        200
      );
    } catch (err) {
      return next(err);
    }
  },

  async getDepartmentHoursOverview(req, res, next) {
    try {
      const overview = await TimecardService.getDepartmentHoursOverview();
      return successResponse(
        res,
        'Department hours overview fetched successfully',
        overview,
        200
      );
    } catch (err) {
      return next(err);
    }
  },

  async getAdminDashboardStats(req, res, next) {
    try {
      const stats = await TimecardService.getAdminDashboardStats();
      return successResponse(
        res,
        'Admin dashboard stats fetched successfully',
        stats,
        200
      );
    } catch (err) {
      return next(err);
    }
  },

  async getAdminEmployeeCardsData(req, res, next) {
    try {
      const data = await TimecardService.getAdminEmployeeCardsData();
      return successResponse(
        res,
        'Admin employee cards data fetched successfully',
        data,
        200
      );
    } catch (err) {
      return next(err);
    }
  },

  async getYesterdayStatus(req, res, next) {
    try {
      const data = await TimecardService.getYesterdayStatus(req.user.id);
      return successResponse(
        res,
        'Yesterday status fetched successfully',
        data,
        200
      );
    } catch (err) {
      return next(err);
    }
  },

  async getTodayStatus(req, res, next) {
    try {
      const data = await TimecardService.getTodayStatus(req.user.id);
      return successResponse(
        res,
        'Today status fetched successfully',
        data,
        200
      );
    } catch (err) {
      return next(err);
    }
  },

  async getStatusOptions(_req, res, next) {
    try {
      const statuses = [
        { label: "Pending", value: "pending" ,id: 1},
        { label: "Approved", value: "approved" ,id: 2},
        { label: "Rejected", value: "rejected" ,id: 3},
        { label: "Submitted", value: "submitted" ,id: 4}
      ]
      
      return successResponse(res, 'Status options fetched successfully', statuses, 200);
    } catch (err) {
      return next(err);
    }
  },

  async getDepartmentOptions(_req, res, next) {
    try {
      const departments = 
      [
        { label: "All Departments", value: "all" ,id: 1},
        { label: "Engineering", value: "engineering" ,id: 2},
        { label: "Finance", value: "finance" ,id: 3},
        { label: "HR", value: "hr" ,id: 4},
        { label: "Marketing", value: "marketing" ,id: 5},
        { label: "Operations", value: "operations" ,id: 6},
        { label: "Sales", value: "sales" ,id: 7},
      ]
      return successResponse(res, 'Department options fetched successfully', departments, 200);
    } catch (err) {
      return next(err);
    }
  },

  async getOfficeHoursOptions(_req, res, next) {
    try {
      const officeHours = 
      [
        { label: "09:00-18:00", value: "09:00-18:00", id: 1 },
        { label: "09:30-18:30", value: "09:30-18:30", id: 2 },
        { label: "08:00-17:00", value: "08:00-17:00", id: 3 },
        { label: "08:30-17:30", value: "08:30-17:30", id: 4 },
        { label: "10:00-19:00", value: "10:00-19:00", id: 5 },
        { label: "10:30-19:30", value: "10:30-19:30", id: 6 },
      ]
      return successResponse(res, 'Office hours options fetched successfully', officeHours, 200);
    } catch (err) {
      return next(err);
    }
  },
};


