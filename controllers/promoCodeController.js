import { transformationPromoCode } from "../format/transformationObject.js";
import PromoCode from "../models/promocodeSchema.js";

export const createPromoCode = async (req, res) => {
  const promoCodeData = req.body;
  try {
    const createdPromoCode = await PromoCode.create({
      code: promoCodeData.code,
      discount: promoCodeData.discount,
      expiryDate: promoCodeData.expiryDate,
      numOfUsage: promoCodeData.numOfUsage,
    });
    return res.status(201).json({
      status: "success",
      data: await transformationPromoCode(createdPromoCode),
    });
  } catch (error) {    
    if (error.code === 11000 && error.keyPattern && error.keyPattern.code) {
      res.status(207).json({
        status: "fail",
        message: "Promo code already exists",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
};

export const applyPromoCode = async (req, res) => {
  const promoCode = req.body.code;
  try {
    const appliedPromoCode = await PromoCode.findOne({ code: promoCode });
    if (appliedPromoCode) {
      res.status(200).json({
        status: "success",
        data: await transformationPromoCode(appliedPromoCode),
      });
    } else {
      res.status(404).json({
        status: "fail",
        message: "Promo code not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}

export const getAllPromoCode = async (req, res) => {
  try {
    const promoCodes = await PromoCode.find();
    const allPromoCode = await Promise.all(
      promoCodes.map(async (promocode) => {
        return await transformationPromoCode(promocode);
      })
    );
    res.status(200).json({
      status: "success",
      data: allPromoCode,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}

export const deletePromoCode = async (req, res) => {
  const promoCodeId = req.params.id;
  try {
    if (promoCodeId) {
      await PromoCode.deleteOne({ _id: promoCodeId });
      res.status(204).json({
        status: "success",
        data: null,
      });
    } else {
      throw new Error(`Promo code can not be founded`);
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: "fail",
      message: error.message,
    });
  }
}

export const updatePromoCode = async (req, res) => {
  try {
    const promocode = await PromoCode.findOneAndUpdate({ _id: req.params.id }, req.body, {new: true} );
    res.status(200).json({
      status: "success",
      data: await transformationPromoCode(promocode),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.code) {
      res.status(207).json({
        status: "fail",
        message: "Promo code already exists",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
}