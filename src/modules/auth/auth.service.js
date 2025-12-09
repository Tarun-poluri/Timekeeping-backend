import bcrypt from "bcrypt";
import { UserModel } from "../user/user.model.js";
import { PrismaClient } from "@prisma/client";
import {
  generateToken,
  generateSecureRefreshToken,
} from "../../utils/jwt.util.js";

const SALT_ROUNDS = 10;
const prisma = new PrismaClient();

// Remove sensitive fields from user objects returned by services
function sanitizeUser(user) {
  if (!user) return user;
  // eslint-disable-next-line no-unused-vars
  const { password, refreshToken, refreshTokenExpiry, ...safeUser } = user;
  return safeUser;
}

export const AuthService = {
  async signup({
    name,
    email,
    password,
    phone,
    position,
    department,
    hireDate,
    status,
    userStatus,
    weeklyHours,
    overtimeHours,
    company_name,
    company_address,
    company_phone,
    company_email,
    company_office_hours,
    role,
  }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const err = new Error("User already exists");
      err.name = "ConflictError";
      err.status = 409;
      throw err;
    }
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const formattedHireDate = new Date(hireDate).toISOString();

    const user = await UserModel.create({
      name,
      email,
      password: hashed,
      phone,
      position,
      department,
      hireDate: formattedHireDate,
      status,
      userStatus,
      weeklyHours,
      overtimeHours,
      company_name,
      company_address,
      company_phone,
      company_email,
      company_office_hours,
      role,
    });
    return sanitizeUser(user);
  },
  async getUserById(id) {
    const user = await UserModel.findById(id);

    if (!user) {
      const err = new Error("User not found");
      err.name = "NotFoundError";
      err.status = 404;
      throw err;
    }
    return sanitizeUser(user);
  },
 async deleteUserById(id, requester) {
  if (requester.role !== "admin") {
    const err = new Error("You are not authorized to delete users");
    err.name = "UnauthorizedError";
    err.status = 403;
    throw err;
  }

  const userToDelete = await UserModel.findById(id);
  if (!userToDelete) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    err.status = 404;
    throw err;
  }

  const deletedUser = await UserModel.deleteById(id);

  return sanitizeUser(deletedUser);
}
,

  async updatePassword(id, oldPassword, newPassword) {
    const user = await UserModel.findById(id);
    if (!user) {
      const err = new Error("User not found");
      err.name = "NotFoundError";
      err.status = 404;
      throw err;
    }
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      const err = new Error("Invalid old password");
      err.name = "AuthError";
      err.status = 401;
      throw err;
    }
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const updatedUser = await UserModel.updateById(user.id, { password: hashed });
    return sanitizeUser(updatedUser);
  },  


  async updateUserById(id, data) {
    const user = await UserModel.updateById(id, data);
    if (!user) {
      const err = new Error("User not found");
      err.name = "NotFoundError";
      err.status = 404;
      throw err;
    }
    return sanitizeUser(user);
  },

  // auth.service.js
  async getAllUsers(
    data,
    page = 1,
    perPage = 10,
    sortBy = "name",
    sort = "asc"
  ) {
    // Ensure page and perPage are integers
    const pageNum = parseInt(page, 10);
    const perPageNum = parseInt(perPage, 10);

    // Get the total number of users that match the query (for pagination)
    const totalRecords = await prisma.user.count({
      where: data, // Apply the filters from the `data` object
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalRecords / perPageNum);
    const hasNextPage = pageNum < totalPages;

    // Query to get the actual users with pagination, sorting, and filtering
    const users = await prisma.user.findMany({
      where: data, // Apply filters
      skip: (pageNum - 1) * perPageNum, // Pagination: calculate the skip value (offset)
      take: perPageNum, // Limit the number of users returned
      orderBy: {
        [sortBy]: sort, // Sorting by field (e.g., 'name', 'status') and order ('asc' or 'desc')
      },
    });

    return {
      users: users.map(sanitizeUser), // Return the users sans sensitive fields
      pagination: {
        page: pageNum,
        perPage: perPageNum,
        total: totalRecords,
        hasNextPage: hasNextPage,
        totalPages: totalPages,
      },
    };
  },
  async signin({ email, password }) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const err = new Error("Invalid email or password");
      err.name = "AuthError";
      err.status = 401;
      throw err;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const err = new Error("Invalid email or password");
      err.name = "AuthError";
      err.status = 401;
      throw err;
    }
    return sanitizeUser(user);
  },

  async generateTokens(user) {
    const accessToken = generateToken({ id: user.id, email: user.email });
    const refreshToken = generateSecureRefreshToken();
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        refreshTokenExpiry,
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiry,
    };
  },

  async refreshAccessToken(refreshToken) {
    // Find user by refresh token
    const user = await prisma.user.findFirst({
      where: {
        refreshToken,
        refreshTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      const err = new Error("Invalid or expired refresh token");
      err.name = "AuthError";
      err.status = 401;
      throw err;
    }

    // Generate new access token
    const accessToken = generateToken({ id: user.id, email: user.email });

    // Optionally rotate refresh token for security
    const newRefreshToken = generateSecureRefreshToken();
    const newRefreshTokenExpiry = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: newRefreshToken,
        refreshTokenExpiry: newRefreshTokenExpiry,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiry: newRefreshTokenExpiry,
    };
  },

  async logout(userId, refreshToken = null) {
    try {
      console.log('Logout called with userId:', userId, 'refreshToken:', refreshToken);
      
      if (refreshToken) {
        // Invalidate specific refresh token
        const result = await prisma.user.updateMany({
          where: {
            id: userId,
            refreshToken,
          },
          data: {
            refreshToken: null,
            refreshTokenExpiry: null,
          },
        });
        console.log('Logout result:', result);
      } else {
        // Invalidate all refresh tokens for user
        const result = await prisma.user.update({
          where: { id: userId },
          data: {
            refreshToken: null,
            refreshTokenExpiry: null,
          },
        });
        console.log('Logout all result:', result);
      }
    } catch (error) {
      console.warn('Could not update refresh token fields in database:', error.message);
    }
  },

  async logoutAllDevices(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });
  },

  async validateRefreshToken(refreshToken) {
    let user;
    try {
      user = await prisma.user.findFirst({
        where: {
          refreshToken,
          refreshTokenExpiry: {
            gt: new Date(),
          },
        },
      });
    } catch (error) {
      // If refresh token fields don't exist in database yet
      const err = new Error("Refresh token functionality not available. Please run database migration.");
      err.name = "AuthError";
      err.status = 501;
      throw err;
    }

    if (!user) {
      const err = new Error("Invalid or expired refresh token");
      err.name = "AuthError";
      err.status = 401;
      throw err;
    }

    return user;
  },
};
