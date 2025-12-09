import Joi from 'joi';

export const dailyEntrySchema = Joi.object({
  timecardId: Joi.number().integer().optional(),
  date: Joi.date().iso().required(),
  startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  breakMinutes: Joi.number().integer().min(0).default(0),
  notes: Joi.string().allow('', null).optional(),
});

export const upsertWeekEntriesSchema = Joi.object({
  weekEnding: Joi.date().iso().required(),
  entries: Joi.array()
    .items(
      Joi.object({
        date: Joi.date().iso().required(),
        startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
        endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
        breakMinutes: Joi.number().integer().min(0).default(0),
        notes: Joi.string().allow('', null).optional(),
      })
    )
    .min(1)
    .max(5)
    .required(),
});

export const getWeekCardsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(10),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  userId: Joi.number().integer().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'submitted').optional(),
  search: Joi.string().allow('').optional(),
});

export const updateTimecardStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected', 'submitted').required(),
});

export const getByIdParamSchema = Joi.object({
  id: Joi.number().integer().required(),
});


