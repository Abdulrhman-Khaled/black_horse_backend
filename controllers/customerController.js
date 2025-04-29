import Customer from "../models/customerSchema.js";
import fs from 'fs';
import {transformationCustomer} from "../format/transformationObject.js";
import SubRegion from "../models/subRegionSchema.js";
import { validationResult } from "express-validator";

export const getAllCustomer = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const customers = await Customer.find().sort({createdAt: -1}).limit(limit).skip((page - 1) * limit).exec();
    const transformationCustomers = await Promise.all(
      customers.map(async (customer) => await transformationCustomer(customer))
    )
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await Customer.countDocuments() / limit),
      data: transformationCustomers,
    })
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message: error.message
    });
  }
}
export const getCustomerById = async (req, res) => {
  const customerId = req.params.id;
  try {
    const customer= await Customer.findOne({_id: customerId}).populate("subRegion").populate("region").exec();
    if(!customer){
      return res.status(207).json({
        status:"fail",
        message:"Customer not found"
      })
    }
    return res.status(200).json({
      status: "success",
      data: await transformationCustomer(customer),
    });
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message: error.message
    });
  }
}
export const updateCustomer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(req.params.id, req.body, {new: true}).populate("region").populate("subRegion");
    res.status(200).json({
      status: "success",
      data: await transformationCustomer(updatedCustomer),
      message: req.headers['language'] === 'en' ? "Customer data updated successfully" : "تم تعديل بيانات العميل بنجاح"
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
}
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    const basePhoneNumber = customer.phoneNumber.split('-deleted')[0];
    let suffix = 1;
    let newPhoneNumber = `${basePhoneNumber}-deleted${suffix}`;
    
    let existingCustomer = await Customer.findOne({ phoneNumber: newPhoneNumber });
    while (existingCustomer) {
      suffix++;
      newPhoneNumber = `${basePhoneNumber}-deleted${suffix}`;
      existingCustomer = await Customer.findOne({ phoneNumber: newPhoneNumber });
    }

    customer.phoneNumber = newPhoneNumber;
    customer.isDeleted = true;
    await customer.save();

    res.status(204).json({
      status: "success",
      data: "customer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message: error.message
    });
  }
}
/************************************ UploadPhoto Customer ************************************/
export const uploadPhoto = async (req, res) => {
  const customerId = req.params.id;  
  try {
    const customer = await Customer.findOne({ _id: customerId });
    if (!customer) {
      return res.status(207).json({
        status: "fail",
        message: "Customer not found"
      });
    }

    if(customer.image){
      const pathName = customer.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    customer.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`;
    await customer.save();
    return res.status(200).json({
      status: "success",
      data: await transformationCustomer(customer),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
}
export const getNumberOfCustomer = async (req, res) => {
  try {
    const customer = await Customer.countDocuments();
    return res.status(200).json({
      status: "success",
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
}
