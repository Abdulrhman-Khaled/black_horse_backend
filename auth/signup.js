import Customer from "../models/customerSchema.js";
import Supplier from "../models/supplierSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { transformationCustomer, transformationSupplier } from "../format/transformationObject.js";
import { return5RandomNumber, sendSMS } from "../utils/pushNotificationAndSendSMS.js";
import { validationResult } from "express-validator";
const salt = 10;

export const createSupplier = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, phoneNumber, password, nationalId, minOrderPrice, workingDays, workingHours, deliveryDaysNumber, type, desc, wallet, placeImage, image, deliveryRegion, subRegions } = req.body;
  try {
    const existingSupplier = await Supplier.findOne({ phoneNumber });
    if (existingSupplier) {
      return res.status(207).json({
        status: "fail",
        message: "Supplier already exists",
      });
    }

    const newSupplier = new Supplier({
      name,
      phoneNumber,
      password: await bcrypt.hash(password, salt),
      nationalId,
      minOrderPrice,
      deliveryRegion,
      workingDays,
      workingHours,
      deliveryDaysNumber: deliveryDaysNumber || 0,
      type,
      desc,
      wallet,
      placeImage,
      image: image || null,
    });

    // Determine supplier status
    let status = "active";
    Object.entries(newSupplier.toObject()).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length === 0) {
        status = "inactive";
      } else if (typeof value === "string" && value.trim() === "") {
        status = "inactive";
      } else if (typeof value === "number" && isNaN(value)) {
        status = "inactive";
      }
    });
    newSupplier.status = status;
    await newSupplier.save();

    return res.status(201).json({
      status: "success",
      data: await transformationSupplier(newSupplier),
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const createCustomer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const customerData = req.body;
  const customerPhoneNumber = req.body.phoneNumber;
  try {
    const customerVerifyCode = return5RandomNumber();
    let newCustomer = new Customer({
      ...customerData,
      verifyCode: customerVerifyCode,
      password: await bcrypt.hash(req.body.password.toString(), salt),
    });

    const oldCustomer = await Customer.findOne({ phoneNumber: customerPhoneNumber});
    if (oldCustomer && oldCustomer.isVerify === true) {
      return res.status(219).json({
        status: "fail",
        message: req.headers["language"] === "en" ? "phoneNumber already exists" : "رقم الهاتف موجود بالفعل",
      });
    } else if (oldCustomer && oldCustomer.isVerify === false) {
      delete newCustomer._doc._id;
      newCustomer = await Customer.findByIdAndUpdate(oldCustomer._id, newCustomer, { new: true });
    } else {
      await newCustomer.save();
    }

    sendSMS(customerPhoneNumber, customerVerifyCode, "verify");
    const customer = await transformationCustomer(newCustomer);
    res.status(201).json({
      status: "success",
      data: {...customer, access_token: jwt.sign({_id: newCustomer._id, role: "customer"}, process.env.JWT_SECRET, {})},
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
};
