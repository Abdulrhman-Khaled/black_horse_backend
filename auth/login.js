import Customer from "../models/customerSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Supplier from "../models/supplierSchema.js";
import {transformationAdmin, transformationCustomer, transformationDeliveryBoy, transformationSupplier} from "../format/transformationObject.js";
import DeliveryBoy from "../models/deliveryBoySchema.js";
import Admin from "../models/adminSchema.js";
import { sendSMS } from "../utils/pushNotificationAndSendSMS.js";
import SubRegion from "../models/subRegionSchema.js";
// const salt = 10 ;

export const customerLogin = async (req, res) => {
  const customerPhoneNumber = req.body.phoneNumber;
  const customerPassword = req.body.password;
  const deviceToken = req.body.deviceToken
  try {
    const customer = await Customer.findOne({ phoneNumber: customerPhoneNumber }).populate("region").populate("subRegion");
    if (!customer) {
      return res.status(203).json({ // phoneNumber incorrect
        status: "fail",
        message: req.headers['language'] === 'en' ? "Verify your phoneNumber or password" : "قم من التحقق من رقم الهاتف أو كلمة المرور",
      });
    }
    if(!await SubRegion.findById(customer.subRegion)){
      return res.status(404).json({
        status: "fail",
        message: req.headers['language'] === 'en' ? "SubRegion not found" : "المنطقة غير موجودة",
      })
    }
    const isPasswordMatch = await bcrypt.compare(customerPassword, customer.password);
    if (!isPasswordMatch) {
      return res.status(203).json({ // password incorrect
        status: "fail",
        message: req.headers['language'] === 'en' ? "Verify your phoneNumber or password" : "قم من التحقق من رقم الهاتف أو كلمة المرور",
      });
    }
    const userObject = {...(await transformationCustomer(customer)), access_token: jwt.sign({_id: customer._id, role: "customer"}, process.env.JWT_SECRET, {})};
    console.log(userObject);
    if (customer.isVerify === false) { // not verified
      sendSMS(customerPhoneNumber, customer.verifyCode, "verify");
      return res.status(219).json({
        status: "fail",
        data: userObject,
      });
    }

    customer.deviceToken = deviceToken;
    await customer.save();
    res.status(200).json({
      status: "success",
      data: userObject,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const supplierLogin = async (req, res) => {
  const supplierPhoneNumber = req.body.phoneNumber;
  const supplierPassword = req.body.password;
  const deviceToken = req.body.deviceToken;
  try {
    const supplier = await Supplier.findOne({ phoneNumber: supplierPhoneNumber });    
    if (!supplier) {
      return res.status(207).json({
        status: "fail",
        message: "Supplier Not Found",
      });
    }
    const isPasswordMatch = await bcrypt.compare(supplierPassword, supplier.password);
    if (!isPasswordMatch) {
      return res.status(207).json({
        status: "fail",
        message: "Password Not Correct",
      });
    }
    const { password, ...rest } = supplier ;
    supplier.deviceToken = deviceToken;
    await supplier.save();
    if(rest.type === "blackHorse"){
      res.status(200).json({
        status: "success",
        data: {...(await transformationSupplier(supplier)), access_token: jwt.sign({_id: rest._id, role: "blackHorse"}, process.env.JWT_SECRET, {})},
      });
    } else {
      res.status(200).json({
        status: "success",
        data:  {...(await transformationSupplier(supplier)), access_token: jwt.sign({_id: rest._id, role: req.role}, process.env.JWT_SECRET, {})},
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const deliveryBoyLogin = async (req, res) => {
  const deliveryBoyEmail = req.body.email;
  const deliveryBoyPassword = req.body.password;
  const deviceToken = req.body.deviceToken;

  try {
    const deliveryBoy = await DeliveryBoy.findOne({ email: deliveryBoyEmail.toLowerCase() });
    if (!deliveryBoy) {
      return res.status(207).json({
        status: "fail",
        message: "Delivery Boy Not Found",
      });
    }
    // Compare passwords using bcrypt.compare
    const isPasswordMatch = await bcrypt.compare(
      deliveryBoyPassword,
      deliveryBoy.password
    );
    if (!isPasswordMatch) {
      return res.status(207).json({
        status: "fail",
        message: "Incorrect Password",
      });
    }
    const { password, ...rest } = deliveryBoy._doc;
    const deliveryBoyData = { ...rest, access_token: jwt.sign({_id: rest._id, role: "deliveryBoy"}, process.env.JWT_SECRET, {})};
    deliveryBoy.deviceToken = deviceToken;
    await deliveryBoy.save();
    res.status(200).json({
      status: "success",
      data: await transformationDeliveryBoy(deliveryBoyData),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const adminLogin = async (req, res) => {
  const adminEmail = req.body.email;
  const adminPassword = req.body.password;
  try {
    const admin = await Admin.findOne({ email: adminEmail.toLowerCase(), deletedAt: null });
    if (!admin) {
      return res.status(207).json({
        status: "fail",
        message: "Admin Not Found",
      });
    }
    // Compare passwords using bcrypt.compare
    const isPasswordMatch = await bcrypt.compare(adminPassword, admin.password);
    if (!isPasswordMatch) {
      return res.status(207).json({
        status: "fail",
        message: "Incorrect Password",
      });
    }
    const { password, ...rest } = admin._doc;
    const adminData = { ...rest, access_token: jwt.sign({_id: rest._id, role: "admin"}, process.env.JWT_SECRET, {})};
    res.status(200).json({
      status: "success",
      data: await transformationAdmin(adminData),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
