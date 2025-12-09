import { prisma } from '../../config/db.js';

export const UserModel = {
  create: (data) => prisma.user.create({ data }),
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  deleteById: (id) => prisma.user.delete({ where: { id } }),
  updateById: (id, data) => prisma.user.update({ where: { id }, data }),
};
