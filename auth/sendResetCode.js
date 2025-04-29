import Customer from "../models/customerSchema.js";
import bcrypt from "bcrypt";
import { transformationSupplier } from "../format/transformationObject.js";
import jwt from "jsonwebtoken";
import Supplier from "../models/supplierSchema.js";
import {
  return5RandomNumber,
  sendSMS,
} from "../utils/pushNotificationAndSendSMS.js";
const salt = 10;

/************************************ ForgetPassword Customer ************************************/
export const sendResetCodeCustomer = async (req, res) => {
  const customerPhoneNumber = req.body.phoneNumber;
  try {
    const customer = await Customer.findOne({ phoneNumber: customerPhoneNumber, });
    if (!customer) {
      return res.status(207).json({
        status: "fail",
        message: req.headers["language"] === "en" ? "PhoneNumber not found" : "رقم الهاتف غير موجود",
      });
    }
    if (customer.isVerify === false) {
      return res.status(219).json({
        status: "fail",
        message: "Please verify your account",
      });
    }

    const customerResetCode = return5RandomNumber();
    customer.resetCode = customerResetCode;
    await customer.save();
    sendSMS(customerPhoneNumber, customerResetCode, "forget");
    res.status(200).json({
      status: "success",
      data: "SMS send successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const resetPasswordCustomer = async (req, res) => {
  const customerPhoneNumber = req.body.phoneNumber;
  const resetCode = req.body.resetCode;
  const newPassword = req.body.newPassword;
  try {
    const customer = await Customer.findOne({
      phoneNumber: customerPhoneNumber,
    });
    if (!customer) {
      return res.status(207).json({
        status: "fail",
        message: req.headers["language"] === "en" ? "PhoneNumber not found" : "رقم الهاتف غير موجود",
      });
    }
    if (customer.resetCode !== resetCode) {
      return res.status(208).json({
        status: "fail",
        message: req.headers["language"] === "en" ? "The code is incorrect. Please enter the correct code" : "الكود خطأ برجاء ادخال الكود الصحيح",
      });
    }

    customer.password = await bcrypt.hash(newPassword.toString(), salt);
    customer.resetCode = null;
    await customer.save();
    res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

/************************************ ForgetPassword Supplier ************************************/
export const sendResetCodeSupplier = async (req, res) => {
  const supplierPhoneNumber = req.body.phoneNumber;
  try {
    const supplier = await Supplier.findOne({
      phoneNumber: supplierPhoneNumber,
    });
    if (!supplier) {
      return res.status(207).json({
        status: "fail",
        message: req.headers["language"] === "en" ? "PhoneNumber not found" : "رقم الهاتف غير موجود",
      });
    }

    const supplierResetCode = return5RandomNumber();
    supplier.resetCode = supplierResetCode;
    await supplier.save();
    sendSMS(supplierPhoneNumber, supplierResetCode, "forget");
    res.status(200).json({
      status: "success",
      data: "SMS send successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const resetPasswordSupplier = async (req, res) => {
  const supplierPhoneNumber = req.body.phoneNumber;
  const resetCode = req.body.resetCode;
  const newPassword = req.body.newPassword;
  try {
    const supplier = await Supplier.findOne({
      phoneNumber: supplierPhoneNumber,
    });
    if (!supplier) {
      return res.status(207).json({
        status: "fail",
        message: req.headers["language"] === "en" ? "PhoneNumber not found" : "رقم الهاتف غير موجود",
      });
    }
    if (supplier.resetCode !== resetCode) {
      return res.status(208).json({
        status: "fail",
        message: req.headers["language"] === "en" ? "The code is incorrect. Please enter the correct code" : "الكود خطأ برجاء ادخال الكود الصحيح",
      });
    }

    supplier.password = await bcrypt.hash(newPassword.toString(), salt);
    supplier.resetCode = null;
    await supplier.save();

    if (supplier.type === "blackHorse") {
      res.status(200).json({
        status: "success",
        data: {
          ...(await transformationSupplier(supplier)),
          access_token: jwt.sign({ _id: supplier._id, role: "blackHorse" }, process.env.JWT_SECRET,{}),
        },
      });
    } else {
      res.status(200).json({
        status: "success",
        data: {
          ...(await transformationSupplier(supplier)),
          access_token: jwt.sign({ _id: supplier._id, role: req.role }, process.env.JWT_SECRET,{}),
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
