import { uploadOnCloudinary } from "../../utils/cloudinary.js";

export const ImageService = {
  async imageupload(req) {
    const imageLocalPath = req.files?.image?.[0]?.path;
    if (!imageLocalPath) {
      const err = new Error("Image not found");
      err.name = "ImageError";
      err.status = 401;
      throw err;
    }
    let image = null;
    if (imageLocalPath) {
      const imagedata = await uploadOnCloudinary(imageLocalPath);
      image = imagedata.url;
    }
    return image;
  },
};
