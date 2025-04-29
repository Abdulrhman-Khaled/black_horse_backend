import {transformationDeliveryBoy, transformationOrder} from "../format/transformationObject.js";
import Car from "../models/carSchema.js";
import DeliveryBoy from "../models/deliveryBoySchema.js";
import Region from "../models/regionSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import Order from "../models/orderSchema.js";
import {insertDeliveryBalanceSheet, ProcessNames} from "../utils/balanceSheet.js";
import {ObjectId} from "mongodb";

const salt = 10 ;

export const getAllDeliveryBoy = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
	const search = new RegExp(`${req.query.search}`, 'i');

	try {
		const deliveryBoys = await DeliveryBoy.find({$or: [{email: search}, {name: search}]})
			.sort({createdAt: -1})
			.limit(limit)
			.skip((page - 1) * limit)
			.exec();

		const allDeliveryBoys = await Promise.all(
      deliveryBoys.map(async (delivery) => await transformationDeliveryBoy(delivery))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await DeliveryBoy.countDocuments() / limit),
      data: allDeliveryBoys,
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
}
export const getDeliveryById = async (req, res) => {
  const deliveryBoyId = req.params.id;
  try{
    const delivery = await DeliveryBoy.findById(deliveryBoyId);
    if (!delivery) {
      return res.status(207).json({
        status: "fail",
        message: "DeliveryBoy not found"
      });
    }

    res.status(200).json({
      status: "success",
      data: {...(await transformationDeliveryBoy(delivery)), access_token: jwt.sign({_id: delivery._id, role: "deliveryBoy"}, process.env.JWT_SECRET, {})},
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const createDeliveryBoy = async (req, res) => {
  const deliverBoyData = req.body;
  const deliveryBoyEmail = req.body.email;
  const deliveryRegion = req.body.region;
  const carId = req.body.car;

  try {
    const region = await Region.findById(deliveryRegion);
    if (!region) {
      return res.status(404).json({
        status: "fail",
        message: "Region not found",
      });
    }
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        status: "fail",
        message: "Car not found",
      });
    }

    const oldDeliveryBoy = await DeliveryBoy.find({ email: deliveryBoyEmail.toLowerCase() });
    if (oldDeliveryBoy.length > 0) {
      return res.status(207).json({
        status: "fail",
        message: "Delivery Boy already exists",
      });
    }
    const password = req.body.password;
    const hashedPassword = await bcrypt.hash(password, salt);
    const deliveryBoy = new DeliveryBoy({
      ...deliverBoyData,
      image: `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`,
      email: deliverBoyData.email.toLowerCase(),
      password: hashedPassword,
    });
    await deliveryBoy.save();
    res.status(201).json({
      status: "success",
      data: await transformationDeliveryBoy(deliveryBoy),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: "fail",
      message: error.message || "Internal Server Error",
    });
  }
};
export const updateDeliveryBoy = async (req,res) => {
  const deliveryBoyId = req.params.id;
  const deliveryBoyData = req.body;
  try {
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        status: "fail",
        message: "Delivery Boy not found",
      });
    }

    if(req.body.car){
      const car = await Car.findById(req.body.car);
      if(!car){
        return res.status(404).json({
          status: "fail",
          message: "Car not found",
        });
      }
    }

    if(deliveryBoyData.wallet || deliveryBoyData.wallet === 0){
      await insertDeliveryBalanceSheet(req.params.id, ProcessNames.deposit, deliveryBoy.wallet - deliveryBoyData.wallet, 'Debit');
    }
    const updatedDeliveryBoy = await DeliveryBoy.findByIdAndUpdate(deliveryBoyId, deliveryBoyData, { new: true });
    if (updatedDeliveryBoy) {
      res.status(200).json({
        status: "success",
        data: await transformationDeliveryBoy(updatedDeliveryBoy),
      });
    } else {
      res.status(404).json({
        status: "fail",
        message: "Delivery Boy not found",
      });
    }
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email === 1) {
      res.status(207).json({
          status: "fail",
          message: "Duplicate email",
          duplicateEmail: error.keyValue.email
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
}
export const changeImageDeliveryBoy = async (req, res) => {
  const deliveryBoyId = req.params.id;
  try{
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(207).json({
        status: "fail",
        message: "DeliveryBoy not found"
      });
    }

    if(deliveryBoy.image){
      const pathName = deliveryBoy.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    deliveryBoy.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`;
    await deliveryBoy.save();
    return res.status(200).json({
      status: "success",
      data: await transformationDeliveryBoy(deliveryBoy),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}
export const getDeliveryBoyByRegion = async (req,res) => {
  const regionName = req.params.regionName;
  try{
    const region = await Region.findOne({name: regionName});
    const deliveryBoys = await DeliveryBoy.find({region: region._id});
    const allDeliveryBoys = await Promise.all(
      deliveryBoys.map(async (delivery) => await transformationDeliveryBoy(delivery))
    );
    res.status(200).json({
      status: "success",
      data: allDeliveryBoys,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: "region not found",
    });
  }
}
export const deleteDeliveryBoy = async (req, res) => {
  const deliveryBoyId = req.params.id;
  try{
    const orders = await Order.find({deliveryBoy: deliveryBoyId, status: { $in: ['pending', 'inProgress', 'delivery', 'delivered', 'supplierCompleted', 'trash']}});
    if (orders.length > 0) {
      return res.status(207).json({
        status: 'fail',
        message: 'This DeliveryBoy is already included in order',
      });
    }
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if(deliveryBoy.image){
      const pathName = deliveryBoy.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    await DeliveryBoy.findByIdAndDelete(deliveryBoyId);
    res.status(200).json({
      status: "success",
      data: "delete success",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const getDeliveryOrders = async (req, res) => {
  try {
    const {deliveryId} = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const delivery = await DeliveryBoy.findById(deliveryId).exec();
    const orders = await Order.find({deliveryBoy: new ObjectId(deliveryId)}).sort({updatedAt: -1}).limit(limit).skip((page - 1) * limit);

    const transformedOrders = await Promise.all(
      orders.map(async (order) => await transformationOrder(order)),
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await Order.countDocuments({deliveryBoy: new ObjectId(deliveryId)}) / limit),
      data: {
        orders: transformedOrders,
        wallet: delivery.wallet,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}