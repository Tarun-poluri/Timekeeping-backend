import { Router } from 'express';
import { ImageController } from './image.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/multer.middleware.js';


const router = Router();

router.post('/image-upload',authenticate, upload.fields([
  { name: 'image', maxCount: 1 }
]), ImageController.imageupload);


export default router;