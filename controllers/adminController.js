import Customer from '../models/customerSchema.js';
import DeliveryBoy from '../models/deliveryBoySchema.js';
import HomeSlideShow from '../models/homeSlideShowSchema.js';
import Supplier from '../models/supplierSchema.js';
import bcrypt from 'bcrypt';
import Unit from '../models/unitSchema.js';
import Region from '../models/regionSchema.js';
import {
  transformationAdmin,
  transformationHomeSlideShow,
  transformationReason,
  transformationRegion,
  transformationSubRegion,
  transformationSubUnit,
  transformationUnit
} from '../format/transformationObject.js';
import SubUnit from '../models/subUnitSchema.js';
import SupplierProduct from '../models/supplierProductSchema.js';
import ReasonOfCancelOrReturn from '../models/reasonOfCancelOrReturnSchema.js';
import Admin from '../models/adminSchema.js';
import Order from '../models/orderSchema.js';
import fs from 'fs';
import Product from '../models/productSchema.js';
import SubRegion from '../models/subRegionSchema.js';
import {validationResult} from 'express-validator';
import Group from '../models/groupSchema.js';
import mongoose from "mongoose";

const salt = 10;

export const deleteSupplier = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const orders = await Order.find({supplierId, status: { $in: ['pending', 'inProgress', 'delivery', 'delivered', 'supplierCompleted', 'trash']}});
    if (orders.length > 0) {
      return res.status(207).json({
        status: 'fail',
        message: 'This supplier is already included in order',
      });
    }
    const supplier = await Supplier.findById(supplierId);
    if(supplier.image){
      const pathName = supplier.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    await Supplier.findByIdAndDelete(supplierId);
    res.status(200).json({
      status: 'success',
      data: 'delete success',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const createHomeSlideShow = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const homeSlideShow = await HomeSlideShow.create({
      image:`${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`
    });
    res.status(201).json({
      status: 'success',
      data: await transformationHomeSlideShow(homeSlideShow)
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}
export const deleteHomeSlideShow = async (req, res) => {
  const homeSlideShowId = req.params.id;
  try {
    const homeSlideShow = await HomeSlideShow.findById(homeSlideShowId);
    if(homeSlideShow.image){
      const pathName = homeSlideShow.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    await HomeSlideShow.findByIdAndDelete(homeSlideShowId);
    res.status(200).json({
      status: 'success',
      data: 'home slide show delete successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const getAllHomeSlideShow = async (req, res) => {
  try {
    const homeSlideShows = await HomeSlideShow.find();
    const transformHomeSlideShows = await Promise.all(
      homeSlideShows.map(async (homeSlideShow) => await transformationHomeSlideShow(homeSlideShow))
    );
    res.status(200).json({
      status: 'success',
      data: transformHomeSlideShows,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const createUnit = async (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const newUnit = await Unit.create({ name: req.body.name, maxNumber: req.body.maxNumber });
    res.status(201).json({
      status: 'success',
      data: await transformationUnit(newUnit),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: 'fail',
        message: 'Unit already exists',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
}
export const updateUnit = async (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const updatedUnit = await Unit.findByIdAndUpdate(req.params.id, req.body, {new: true});
    res.status(200).json({
      status: 'success',
      data:  await transformationUnit(updatedUnit),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: 'fail',
        message: 'Unit already exists',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
}
export const deleteUnit = async (req, res) => {
  const unitId = req.params.id;
  try {
    const supplierProductCount = await SupplierProduct.countDocuments({ unit: unitId });
    const productCount = await Product.countDocuments({ units: { $in: unitId }});
    if(supplierProductCount > 0 || productCount > 0){
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete unit as it is referenced by supplierProducts Or products.',
      });
    }

    await Unit.deleteOne({ _id: unitId });
    res.status(200).json({
      status: 'success',
      message: 'Unit deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}
export const getAllUnits = async (req, res) => {
  try {
    const units = await Unit.find();
    const transformationUnits = await Promise.all(
      units.map(async (unit) => await transformationUnit(unit))
    );

    res.status(200).json({
      status: 'success',
      data: transformationUnits,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const createRegion = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try{
    const newRegion = await Region.create({ name: req.body.name });
    res.status(201).json({
      status: 'success',
      data: await transformationRegion(newRegion),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: 'fail',
        message: 'Region already exists',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
}
export const updateRegion = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const updatedRegion = await Region.findByIdAndUpdate(req.params.id, req.body, {new: true});
    res.status(200).json({
      status: 'success',
      data: await transformationRegion(updatedRegion),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: 'fail',
        message: 'Region already exist.',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
}
export const getAllRegion = async (req,res) => {
  try {
    const regions = await Region.find();
    const formattedRegions = await Promise.all(
      regions.map(async (region) => await transformationRegion(region))
    );
    res.status(200).json({
      status: 'success',
      data: formattedRegions,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const deleteRegion = async (req, res) => {
  const regionId = req.params.id;
  try {
    const supplier = await Supplier.find({ deliveryRegion:  { $elemMatch: { _id: regionId } } });
    const deliveryBoys = await DeliveryBoy.find({ region: regionId });
    const customers = await Customer.find({ region: regionId });
    const groups = await Group.find({ region: regionId });
    if(supplier.length > 0 || deliveryBoys.length > 0 || customers.length > 0 || groups.length > 0){
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete region as it is referenced by suppliers, delivery boys, customers or groups.',
      })
    }

    await Region.deleteOne({ _id: regionId });
    await SubRegion.deleteMany({ regionId: regionId });
    res.status(200).json({
      status: 'success',
      message: 'Region deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    })
  }
}
export const createSubRegion = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try{
    const existOldSubRegion = await SubRegion.findOne({ name: req.body.name, regionId: req.body.regionId });
    if(existOldSubRegion){
      return res.status(207).json({
        status: 'fail',
        message: 'SubRegion already exists',
      });
    }
    const newSubRegion = await SubRegion.create({ name: req.body.name, regionId: req.body.regionId });
    res.status(201).json({
      status: 'success',
      data: await transformationSubRegion(newSubRegion),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const updateSubRegion = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name } = req.body;
  const subRegionId = req.params.id;
  try {
    const currentSubRegion = await SubRegion.findById(subRegionId);
    if (!currentSubRegion) {
      return res.status(404).json({
        status: 'fail',
        message: 'SubRegion not found',
      });
    }

    const existOldSubRegion = await SubRegion.findOne({ _id: { $ne: subRegionId }, name: name, regionId: currentSubRegion.regionId });
    if (existOldSubRegion) {
      return res.status(207).json({
        status: 'fail',
        message: 'SubRegion with this name in the same regionId already exists',
      });
    }

    currentSubRegion.name = name;
    await currentSubRegion.save();
    res.status(200).json({
      status: 'success',
      data: await transformationSubRegion(currentSubRegion),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const getSubRegionByRegionId = async (req, res) => {
  try {
    const subRegions = await SubRegion.find({ regionId: req.params.id });
    const formattedSubRegions = await Promise.all(
      subRegions.map(async (subRegion) => await transformationSubRegion(subRegion))
    );
    res.status(200).json({
      status: 'success',
      data: formattedSubRegions,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const getAllSubRegion = async (req,res) => {
  try {
    const subRegions = await SubRegion.find();
    const formattedSubRegions = await Promise.all(
      subRegions.map(async (subRegion) => await transformationSubRegion(subRegion))
    );
    res.status(200).json({
      status: 'success',
      data: formattedSubRegions,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const deleteSubRegion = async (req, res) => {
  const subRegionId = req.params.id;
  try {
    const customers = await Customer.find({ subRegion: subRegionId });
    const supplier = await Supplier.find({deliveryRegion: {$elemMatch: {_id: new mongoose.Types.ObjectId(customer.region)}}});
    const groups = await Group.find({ subRegion: subRegionId });
    if(supplier.length > 0 || customers.length > 0 || groups.length > 0){
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete region as it is referenced by suppliers, customers or groups.',
      })
    }

    await SubRegion.deleteOne({ _id: subRegionId });
    res.status(200).json({
      status: 'success',
      message: 'SubRegion deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}
export const createSubUnit = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const newSubUnit = await SubUnit.create({ name: req.body.name });
    res.status(201).json({
      status: 'success',
      data: await transformationSubUnit(newSubUnit),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: 'fail',
        message: 'SubUnit already exists',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
}
export const updateSubUnit = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const subUnit = await SubUnit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({
      status: 'success',
      data: await transformationSubUnit(subUnit),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: 'fail',
        message: 'SubUnit already exists',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
}
export const deleteSubUnit = async (req, res) => {
  const subUnitId = req.params.id;
  try {
    const supplierProductCount = await SupplierProduct.countDocuments({ subUnit: subUnitId });
    const productCount = await Product.countDocuments({ subUnit: subUnitId });
    if(supplierProductCount > 0 || productCount > 0){
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete subUnit as it is referenced by supplierProducts Or products.',
      });
    }

    await SubUnit.deleteOne({ _id: subUnitId });
    res.status(200).json({
      status: 'success',
      message: 'SubUnit deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    })
  }
};
export const getAllSubUnits = async (req, res) => {
  try {
    const subUnits = await SubUnit.find();
    const transformationUnits = await Promise.all(
      subUnits.map(async (subUnit) => await transformationSubUnit(subUnit))
    );

    res.status(200).json({
      status: 'success',
      data: transformationUnits,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const getAllAdmins = async (req, res) => {
  let query = { deletedAt: null };
  try {
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    const admins = await Admin.find(query);
    const formattedAdmins = await Promise.all(
      admins.map(async (admin) => await transformationAdmin(admin))
    );
  
    res.status(200).json({
      status: 'success',
      data: formattedAdmins
    })
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    })
  }
}
export const createAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const adminData = req.body;
  try {
    const newAdmin = await Admin.create({
      name: adminData.name,
      email: adminData.email.toLowerCase(),
      password: await bcrypt.hash(req.body.password, salt),
      period: adminData.period,
      type: adminData.type ?? 'subAdmin',
      roles: adminData.roles ?? null
    });
    res.status(201).json({
      status: 'success',
      data: await transformationAdmin(newAdmin)
    })
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      res.status(207).json({
        status: 'fail',
        message: 'Email is already in use.'
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message
      });
    }
  }
}
export const updateAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const pass = req.body.password;
    const hashedPassword = pass ? await bcrypt.hash(req.body.password, salt) : null;
    const updatedFields = pass ? { ...req.body, password: hashedPassword } : req.body;
    const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
    res.status(200).json({
      status: 'success',
      data: await transformationAdmin(updatedAdmin),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      res.status(207).json({
        status: 'fail',
        message: 'Email is already in use.'
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message
      });
    }
  }
}
export const deleteAdmin = async (req, res) => {
  try {
    await Admin.updateOne({ _id: req.params.id }, { $set: { deletedAt: Date.now() } });
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}
export const getAdminsByPeriodId = async (req, res) => {
  try{
    const admins = await Admin.find({ period: { $in: req.params.id } });
    const formattedAdmins = await Promise.all(
      admins.map(async (admin) => await transformationAdmin(admin))
    );
    res.status(200).json({
      status: 'success',
      data: formattedAdmins
    })
 } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const getAllReasons = async (req, res) => {
  let query = {};
  try {    
    if (req.query.type) {
      query.type = req.query.type;
    }

    const reasons = await ReasonOfCancelOrReturn.find(query);
    const formattedReasons = await Promise.all(
      reasons.map(async (reason) => await transformationReason(reason))
    );
  
    res.status(200).json({
      status: 'success',
      data: formattedReasons
    })
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    })
  }
}
export const createReason = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const newReason = await ReasonOfCancelOrReturn.create({ description: req.body.description, type: req.body.type });
    res.status(201).json({
      status: 'success',
      data: await transformationReason(newReason)
    })
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.description) {
      res.status(207).json({
        status: 'fail',
        message: 'Reason already exists',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
}
export const updateReason = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const updatedReason = await ReasonOfCancelOrReturn.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({
      status: 'success',
      data: await transformationReason(updatedReason),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const deleteReason = async (req, res) => {
  try {
    await ReasonOfCancelOrReturn.deleteOne({ _id: req.params.id });
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
