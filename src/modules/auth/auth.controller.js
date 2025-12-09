import { AuthService } from './auth.service.js';
import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';

export const AuthController = {
  async signup(req, res, next) {
    try {
      const user = await AuthService.signup(req.body);
      return successResponse(res, MESSAGES.USER_CREATED, { user }, 201);
    } catch (err) {
      return next(err);
    }
  },
  async getUser(req, res, next) {
    try {
      const user = await AuthService.getUserById(Number(req.params.id));
      return successResponse(res, MESSAGES.USER_FETCHED, { user }, 200);
    } catch (err) {
      return next(err);
    }
  },
  async deleteUser(req, res, next) {
    try {
      const requester =req.user;  
      const user = await AuthService.deleteUserById(Number(req.params.id),requester);
      return successResponse(res, MESSAGES.USER_DELETED, { user }, 200);
    } catch (err) {
      return next(err);
    }
  },
  async updateUser(req, res, next) {
    try {
      const user = await AuthService.updateUserById(Number(req.params.id), req.body);
      return successResponse(res, MESSAGES.USER_UPDATED, { user }, 200);
    } catch (err) {
      return next(err);
    }
  },
  async getAllUsers(req, res, next) {
    try {
      // Extract query parameters from req.query (for GET request)
      const { page = 1, perPage = 10, search, status, department, sortBy = 'name', sort = 'asc' } = req.query;
      
      // Create a dynamic query object for Prisma (passed as `data`)
      const data = {
        userStatus: status || undefined,  // Filter by userStatus if provided
        department: department || undefined,  // Filter by department if provided
        name: search ? { contains: search, mode: 'insensitive' } : undefined,  // Search by name if provided
      };
  
      // Call the service to fetch users
      const result = await AuthService.getAllUsers(data, page, perPage, sortBy, sort);
  
      // Return users with pagination metadata
      return successResponse(res, MESSAGES.USERS_FETCHED, { users: result.users, pagination: result.pagination }, 200);
    } catch (err) {
      return next(err);
    }
  }
  

,

  async signin(req, res, next) {
    try {
      const user = await AuthService.signin(req.body);
      const tokens = await AuthService.generateTokens(user);
      const result = successResponse(res, MESSAGES.LOGIN_SUCCESS, { 
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiry: tokens.refreshTokenExpiry,
        user 
      });
      console.log("result",result);
      return result;
    } catch (err) {
      return next(err);
    }
  },

  async profile(req, res) {
    return successResponse(res, 'Profile fetched', { user: req.user });
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshAccessToken(refreshToken);
      return successResponse(res, MESSAGES.TOKEN_REFRESHED, { 
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiry: tokens.refreshTokenExpiry
      });
    } catch (err) {
      return next(err);
    }
  },
  async updatePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = await AuthService.updatePassword(req.user.id, oldPassword, newPassword);
      return successResponse(res, MESSAGES.PASSWORD_UPDATED, { user });
    } catch (err) {
      return next(err);
    }
  },
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        // Find user by refresh token and invalidate it
        const user = await AuthService.validateRefreshToken(refreshToken);
        if (user) {
          await AuthService.logout(user.id, refreshToken);
        }
      }
      
      return successResponse(res, MESSAGES.LOGOUT_SUCCESS);
    } catch (err) {
      return next(err);
    }
  },

  async logoutAllDevices(req, res, next) {
    try {
      const userId = req.user?.id;
      
      if (userId) {
        await AuthService.logoutAllDevices(userId);
        return successResponse(res, MESSAGES.LOGOUT_ALL_SUCCESS);
      } else {
        const err = new Error('User not authenticated');
        err.name = 'AuthError';
        err.status = 401;
        throw err;
      }
    } catch (err) {
      return next(err);
    }
  },
};
