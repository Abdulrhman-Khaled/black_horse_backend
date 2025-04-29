import Rating from "../models/ratingSchema.js";
import Order from "../models/orderSchema.js";
import { transformationRating } from "../format/transformationObject.js";
import { calcAvgRating } from "./sharedFunction.js";

export const createRating = async (req, res) => {
  const ratingData = req.body;
  const orderId = ratingData.orderId;
  try {
    const oldRating = await Rating.findOne({customerId: ratingData.customerId, supplierId: ratingData.supplierId, userType: req.headers["user-type"]});
    if (oldRating) {
      oldRating.rate = ratingData.rate;
      await oldRating.save();
      if (req.headers["user-type"] === "customer") {
        await calcAvgRating(ratingData.supplierId, true);
      } else if (req.headers["user-type"] === "supplier") {
        await calcAvgRating(ratingData.customerId, false);
      }
      await Order.findOneAndUpdate({ _id: orderId }, { supplierRating: "rating" }, {new: true});
      res.status(201).json({
        status: "success",
        data: transformationRating(oldRating),
      });
    } else {
      const rating = new Rating({
        customerId: ratingData.customerId,
        supplierId: ratingData.supplierId,
        userType: req.headers["user-type"],
        rate: ratingData.rate,
      });
      await rating.save();
      if (req.headers["user-type"] === "customer") {
        await calcAvgRating(ratingData.supplierId, true);
      } else if (req.headers["user-type"] === "supplier") {
        await calcAvgRating(ratingData.customerId, false);
      }
      await Order.findOneAndUpdate({ _id: orderId }, { supplierRating: "rating" }, {new: true});
      res.status(201).json({
        status: "success",
        data: transformationRating(rating),
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
