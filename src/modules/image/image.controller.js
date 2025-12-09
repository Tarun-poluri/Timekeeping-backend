import { ImageService } from './image.service.js';
import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';

export const ImageController = {
  async imageupload(req, res, next) {
    try {
      const image = await ImageService.imageupload(req);
      return successResponse(res, MESSAGES.IMAGE_UPLOADED, { image },200);
    } catch (err) {
      return next(err);
    }
  },
};
