import { transformationCar } from "../format/transformationObject.js";
import Car from "../models/carSchema.js";
import fs from "fs";
import DeliveryBoy from "../models/deliveryBoySchema.js";
import { validationResult } from "express-validator";

export const createCar = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const carData = req.body;
  try {
    const newCar = new Car({
      type: carData.type,
      maxWeight: carData.maxWeight,
      image: `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`,
      number: carData.number,
    });
    await newCar.save();
    res.status(201).json({ status: 'success', data: await transformationCar(newCar) });
  } catch (error) {
    if (error.name === 'MongoError' && error.code === 11000) {
      res.status(400).json({
        status: 'fail',
        message: 'Car number already exists. Please choose a unique number.',
      });
    } else {
      res.status(500).json({ status: 'fail', message: error.message });
    }
  }
};
export const getCars = async (req,res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const cars = await Car.find().limit(limit).skip((page - 1) * limit).exec();
    const allCars = await Promise.all(
      cars.map(async (car) => await transformationCar(car))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await Car.countDocuments() / limit),
      data: allCars,
    })
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message }) 
  }
};
export const updateCar = async (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updatedCar = await Car.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.status(200).json({ status: 'success', data: await transformationCar(updatedCar) });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
export const deleteCar = async (req,res) => {
  const carId = req.params.id;
  try {
    const deliverBoy = await DeliveryBoy.find({ car: carId });
    if (deliverBoy.length > 0) {
      return res.status(207).json({
        status: 'fail',
        message: 'Cannot delete car as it is referenced by delivery boys.',
      })
    }

    const deletedCar = await Car.findByIdAndDelete(carId);
    if (deletedCar) {
      if(deletedCar.image){
        const pathName = deletedCar.image.split('/').slice(3).join('/');
        fs.unlink('upload/' + pathName, (err) => {});
      }
      res.status(200).json({ status: 'success', data: null });
    } else {
      res.status(404).json({ status: 'fail', message: 'Car not found' });
    }
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
export const getCarByWeight = async (req,res) => {
  const orderWeight = req.body.orderWeight;
  try{
    const car = await Car.aggregate([
      {
        $addFields: {
          absoluteDifference: { $abs: { $subtract: ['$maxWeight', orderWeight] } } // Calculate absolute difference
        }
      },
      {
        $match: {
          $or: [
            { maxWeight: orderWeight }, // Include exact match case
            { maxWeight: { $gt: orderWeight } } // Also include cases where maxWeight is greater than orderWeight
          ]
        }
      },
      {
        $sort: { absoluteDifference: 1 } // Sort by absolute difference
      },
      { $limit: 1 } // Limit to the closest car
    ]);
    
    // If no car found, find the car with the maximum weight
    if (car.length === 0) {
      const maxWeightCar = await Car.findOne().sort({ maxWeight: -1 });
      if (!maxWeightCar) {
        return res.status(207).json({ status: 'fail', message: 'Car not found' });
      }
      return res.status(200).json({ status: 'success', data: await transformationCar(maxWeightCar) });
    }
    res.status(200).json({ status: 'success', data: await transformationCar(car[0]) });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
}
export const changeImageCar = async (req, res) => {
  const carId = req.params.id;
  try {
    const car = await Car.findById(carId);
    if(car.image){
      const pathName = car.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }
    car.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`
    await car.save();
    res.status(200).json({
      status:"success",
      data: await transformationCar(car)
    })
   } catch (error) {
    res.status(500).json({
      status:'fail',
      message:error.message,
    })
  }
}
