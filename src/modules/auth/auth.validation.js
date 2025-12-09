
import Joi from 'joi';

export const signupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().min(10).max(15).required(), // Added phone validation
  position: Joi.string().required(), // Added position validation
  department: Joi.string().required(), // Added department validation
  hireDate: Joi.date().iso().required(), // Added hireDate validation
  status: Joi.string().valid('pending', 'active').required(), // Added status validation
  userStatus: Joi.string().valid('active', 'inactive').required(), // Added userStatus validation
  weeklyHours: Joi.number().required(), // Added weeklyHours validation
  overtimeHours: Joi.number().required(), // Added overtimeHours validation
  company_name: Joi.string().required(), // Added company_name validation
  company_address: Joi.string().required(), // Added company_address validation
  company_phone: Joi.string().min(10).max(15).required(), // Added company_phone validation
  company_email: Joi.string().email().required(), // Added company_email validation
  company_office_hours: Joi.string().required(), // Added company_office_hours validation
  role: Joi.string().valid('employee', 'admin').required(), // Added role validation
});

export const getUserSchema = Joi.object({
  id: Joi.number().required(), // Added id validation
});

export const updateUserSchema = Joi.object({
  // mnake all fields optional also here user cant change id,email,phone 
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).max(128).required(),
  position: Joi.string().required(), // Added position validation
  department: Joi.string().required(), // Added department validation
  status: Joi.string().valid('pending', 'active').required(), // Added status validation
  userStatus: Joi.string().valid('active', 'inactive').required(), // Added userStatus validation
  weeklyHours: Joi.number().required(), // Added weeklyHours validation
  overtimeHours: Joi.number().required(), // Added overtimeHours validation
  company_name: Joi.string().required(), // Added company_name validation
  company_address: Joi.string().required(), // Added company_address validation
  company_phone: Joi.string().min(10).max(15).required(), // Added company_phone validation
  company_email: Joi.string().email().required(), // Added company_email validation
  company_office_hours: Joi.string().required(), // Added company_office_hours validation
});

export const signinSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

export const getUsersSchema = Joi.object({ 
  status: Joi.string().valid('active', 'inactive').optional(), page: Joi.number().integer().min(1).optional(), perPage: Joi.number().integer().min(1).max(100).optional(), search: Joi.string().optional(), sortBy: Joi.string().valid('name', 'department', 'status').optional(), sort: Joi.string().valid('asc', 'desc').optional(), department: Joi.string().valid('engineering', 'marketing', 'sales', 'hr', 'finance', 'operations').optional(), })

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});
export const updatePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(8).max(128).required(),
  newPassword: Joi.string().min(8).max(128).required(),
});