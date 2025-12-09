import { Router } from 'express';
import { TimecardController } from './timecard.controller.js';
import { authenticate, adminOnly } from '../../middleware/auth.middleware.js';
import { dailyEntrySchema, getByIdParamSchema, getWeekCardsSchema, updateTimecardStatusSchema, upsertWeekEntriesSchema } from './timecard.validation.js';

const router = Router();

function validateBody(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const err = new Error(error.details.map((d) => d.message).join(', '));
      err.name = 'ValidationError';
      err.status = 422;
      return next(err);
    }
    req.body = value;
    return next();
  };
}

function validateQuery(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    if (error) {
      const err = new Error(error.details.map((d) => d.message).join(', '));
      err.name = 'ValidationError';
      err.status = 422;
      return next(err);
    }
    // Do not mutate req.query (getter-only in some Express versions)
    // If needed later, access validated query via res.locals.validatedQuery
    // eslint-disable-next-line no-param-reassign
    _res.locals = _res.locals || {};
    _res.locals.validatedQuery = value;
    return next();
  };
}

function validateParams(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.params, { abortEarly: false });
    if (error) {
      const err = new Error(error.details.map((d) => d.message).join(', '));
      err.name = 'ValidationError';
      err.status = 422;
      return next(err);
    }
    // Do not mutate req.params
    _res.locals = _res.locals || {};
    _res.locals.validatedParams = value;
    return next();
  };
}

// 1) add daily entry (one per day per user)
router.post('/addDailyEntry', authenticate, validateBody(dailyEntrySchema), TimecardController.addDailyEntry);

// 2) user can edit all 5 cards (upsert up to 5 days in a week)
router.put('/updateWeekEntries', authenticate, validateBody(upsertWeekEntriesSchema), TimecardController.upsertWeekEntries);

// 3) get all weeks cards of all users with pagination (admin only)
router.get('/getAllTimecards', authenticate, adminOnly, validateQuery(getWeekCardsSchema), TimecardController.getWeeklyCards);

// 4) get all timecards for the authenticated user (user can access their own timecards)
router.get('/getAllTimecardsUser', authenticate, validateQuery(getWeekCardsSchema), TimecardController.getAllTimecardsUser);

// get my week by weekEnding
router.get('/getMyWeek', authenticate, TimecardController.getMyWeek);
router.get('/getMyTimecardsHistory', authenticate, TimecardController.getMyTimecardsHistory);

// other operations
router.patch('/updateEntry/:id', authenticate, validateParams(getByIdParamSchema), TimecardController.updateDailyEntry);
router.delete('/deleteEntry/:id', authenticate, validateParams(getByIdParamSchema), TimecardController.deleteDailyEntry);
router.post('/submitTimecard', authenticate, TimecardController.submitTimecard);
router.patch('/updateTimecardStatus/:id', authenticate, adminOnly, validateParams(getByIdParamSchema), validateBody(updateTimecardStatusSchema), TimecardController.setTimecardStatus);
router.delete('/deleteTimecard/:id', authenticate, adminOnly, validateParams(getByIdParamSchema), TimecardController.deleteTimecard);

// Weekly Hours Overview (Admin only)
router.get('/weeklyHoursOverview', authenticate, adminOnly, TimecardController.getWeeklyHoursOverview);

// Department Hours Overview (Admin only)
router.get('/departmentHoursOverview', authenticate, adminOnly, TimecardController.getDepartmentHoursOverview);

// Admin Dashboard Stats (Admin only)
router.get('/adminDashboardStats', authenticate, adminOnly, TimecardController.getAdminDashboardStats);

// Admin Employee Cards Data (Admin only)
router.get('/adminEmployeeCardsData', authenticate, adminOnly, TimecardController.getAdminEmployeeCardsData);

// Employee - Yesterday Status
router.get('/yesterdayStatus', authenticate, TimecardController.getYesterdayStatus);

// Employee - Today Status
router.get('/todayStatus', authenticate, TimecardController.getTodayStatus);

// Static status options (authenticated)
router.get('/statusOptions', authenticate, TimecardController.getStatusOptions);

// Static department options (authenticated)
router.get('/departmentOptions', authenticate, TimecardController.getDepartmentOptions);

// Static office hours options (authenticated)
router.get('/officeHoursOptions', authenticate, TimecardController.getOfficeHoursOptions);

export default router;


