import express from 'express';
import dotenv from 'dotenv';
import cors from "cors"
import authRoutes from './modules/auth/auth.routes.js';
import imageRoutes from './modules/image/image.routes.js';

import timecardRoutes from './modules/timecard/timecard.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/image', imageRoutes);

app.use('/api/timecards', timecardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
