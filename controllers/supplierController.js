import mongoose from 'mongoose';
import Supplier from './../models/supplierSchema.js';
import Order from './../models/orderSchema.js';
import Product from '../models/productSchema.js';
import SupplierProduct from '../models/supplierProductSchema.js';
import {
  transformationBalanceSheet,
  transformationOrder,
  transformationRegion,
  transformationSupplier,
  transformationSupplierProduct,
} from '../format/transformationObject.js';
import Unit from '../models/unitSchema.js';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import Region from '../models/regionSchema.js';
import Offer from '../models/offerSchema.js';
import BalanceSheet from '../models/balanceSheetSchema.js';
import {checkActiveSupplier} from './sharedFunction.js';
import DeletedProduct from '../models/deletedProductSchema.js';
import {egyptHour, insertBalanceSheet, ProcessNames} from '../utils/balanceSheet.js';
import Rating from '../models/ratingSchema.js';
import {validationResult} from 'express-validator';
import {calculateCompletionPercentage} from '../helper/calculateCompletionPercentage.js';
import {pushNotification} from '../utils/pushNotificationAndSendSMS.js';
import Customer from '../models/customerSchema.js';
import {ObjectId} from "mongodb";


export const getAllSupplier = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const userType = req.headers['user-type'];
    const typeHeader = req.headers['user-type'];
    const { type, search, orderPercentage, sortBy, sortDirection } = req.query;

    const query = { isDeleted: false };

    let pipeline = [
      { $lookup: { from: "orders", localField: "_id", foreignField: "supplierId", as: "orders" } },
      { $addFields: { orderNumber: {$size: "$orders"} } },
      {
				$addFields: {
					completedOrdersPercentage: {
            $cond: {
              if: {$eq: ["$orderNumber", 0]},
              then: 0,
              else: {
                $multiply: [{
                  $divide: [{
                    $size: {
                      $filter: {
                        input: "$orders", as: "order", cond: {$eq: ["$$order.status", "complete"]}
                      }
                    }
                  }, "$orderNumber"]
                }, 100]
              }
            }
          }
        }
		  },
      { $skip: (page - 1) * limit }, // Skip the first 10 documents
      { $limit: limit },
      { $match: query },
	    ... sortBy ? [
				{
					$sort: {
						[sortBy]: sortDirection === "desc" ? -1 : 1
					}
				}
			] : []
    ];
    let isAdmin = typeHeader === 'admin';

    // Adjust the type filter logic
    if (type) {
      switch (type) {
        case 'gomla':
          query.type = { $in: ['gomla', 'blackHorse'] };
          break;
        case 'gomlaGomla':
          query.type = { $in: ['gomlaGomla', 'blackHorse'] };
          break;
        case 'nosGomla':
          query.type = { $in: ['nosGomla', 'blackHorse'] };
          break;
        default:
          if (['company', 'shopEquipment', 'restaurantEquipment'].includes(type)) {
            query.type = type;
          } else {
            return res.status(400).json({
              status: 'fail',
              message: 'Invalid type filter.',
            });
          }
      }
    } else {
      query.type = { $ne: 'company' };
    }

    if (search) {
      query.name = new RegExp(`^${search}`, 'i');
    }

    if (Number(orderPercentage)) {
      query.completedOrdersPercentage = { $gte: Number(orderPercentage) };
    }

    if (userType === 'customer' && req.body.user) {
      const customer = await Customer.findById(req.body.user.id).select('subRegion');

      if (!customer) {
        return res.status(404).json({
          status: 'fail',
          message: 'Customer not found.',
        });
      }

      query.status = 'active';
      query.deliveryRegion = {
        $elemMatch: {_id: new mongoose.Types.ObjectId(customer.region)}
      };
    }

    let totalSuppliers = await Supplier.countDocuments(query);
    let suppliers = await Supplier.aggregate(pipeline).exec();

    const transformSuppliers = await Promise.all(
      suppliers.map(async (supplier) => await transformationSupplier(supplier, isAdmin))
    );

    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(totalSuppliers / limit),
      data: transformSuppliers,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const getAllSupplierForAdmin = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const completionPercentage = req.query.completionPercentage ? parseInt(req.query.completionPercentage) : null;

  try {
    let suppliers = await Supplier.find().limit(limit).skip((page - 1) * limit).exec();
    let transformedSuppliers = await Promise.all(
      suppliers.map(async (supplier) => {
        const supplierData = await transformationSupplier(supplier, true);
        const completion = await calculateCompletionPercentage(supplier._id);
        return { ...supplierData, completion };
      })
    );

    if (completionPercentage !== null) {
      transformedSuppliers = transformedSuppliers.filter(supplier => {
        return supplier.completion >= completionPercentage;
      });
    }

    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(await Supplier.countDocuments() / limit),
      data: transformedSuppliers,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const getAllSupplierForCustomer = async (req, res) => {
  const customerId = req.params.id;  // Correctly using params to get the customer ID
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { type, search } = req.query;

  try {
    // Retrieve the customer to get their subRegion
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        status: 'fail',
        message: 'Customer not found',
      });
    }

    let query = {
      status: 'active',
      isDeleted: false,
      deliveryRegion: {
        $elemMatch: {_id: new mongoose.Types.ObjectId(customer.region)}
      }
    };

    console.log({...query});

    // Adjust the type filter logic
    if (type) {
      switch (type) {
        case 'gomla':
          query.type = { $in: ['gomla', 'blackHorse'] };
          break;
        case 'gomlaGomla':
          query.type = { $in: ['gomlaGomla', 'blackHorse'] };
          break;
        case 'nosGomla':
          query.type = { $in: ['nosGomla', 'blackHorse'] };
          break;
        default:
          if (['company', 'shopEquipment', 'restaurantEquipment'].includes(type)) {
            query.type = type;
          } else {
            return res.status(400).json({
              status: 'fail',
              message: 'Invalid type filter.',
            });
          }
      }
    } else {
      query.type = { $ne: 'company' };
    }

    if (search) {
      query.name = new RegExp(`^${search}`, 'i');
    }

    let totalSuppliers = await Supplier.countDocuments(query);
    let suppliers = await Supplier.find(query).limit(limit).skip((page - 1) * limit).exec();

    const transformSuppliers = await Promise.all(
      suppliers.map(async (supplier) => await transformationSupplier(supplier, true))
    );

    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(totalSuppliers / limit),
      data: transformSuppliers,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const getSuppliersByOrderCount = async (req, res) => {
  const orderCount  = req.query.orderCount; // 'most' or 'least'

  try {
    const orderSort = orderCount === 'most' ? -1 : 1; // Descending for 'most', ascending for 'least'
    console.log(orderSort);

    const suppliers = await Order.aggregate([
      {
        $match: { status: 'complete' } // Only include orders with status 'complete'
      },
      {
        $lookup: {
          from: Supplier.collection.name,
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplierDetails'
        }
      },
      {
        $unwind: {
          path: '$supplierDetails',
          preserveNullAndEmptyArrays: true // Ensures that documents without a corresponding supplier are included
        }
      },
      {
        $group: {
          _id: '$supplierId', // Ensure this is correctly pointing to a field that should be an ObjectId
          totalOrders: { $sum: 1 },
          name: { $first: '$supplierDetails.name' },
          phoneNumber: { $first: '$supplierDetails.phoneNumber' }
        }
      },
      {
        $sort: { totalOrders: orderSort }
      }
    ]);

    // Check if suppliers array is empty and handle it
    if (!suppliers.length) {
      return res.status(404).json({
        status: 'fail',
        message: 'No suppliers found with the given criteria'
      });
    }

    res.status(200).json({
      status: 'success',
      data: suppliers
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};
export const getCompany = async (req, res) => {
  const customerId = req.params.customerId; // Assuming customer ID is passed in the request body
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const typeHeader = req.headers['user-type'];
  const search = req.query.search;
  let isAdmin = false;

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        status: 'fail',
        message: 'Customer not found',
      });
    }

    let matchQuery = {
      status: 'active',
      type: 'company',
      isDeleted: false,
      deliveryRegion: {
        $elemMatch: {_id: new mongoose.Types.ObjectId(customer.region)}
      }
    };

    if (search) {
      matchQuery.name = { $regex: search, $options: 'i' }; // Modify search functionality to be more flexible
    }

    const pipeline = [
      {
        $match: matchQuery
      },
      {
        $limit: limit
      },
      {
        $skip: (page - 1) * limit
      }
    ];

    if (typeHeader === 'admin') {
      isAdmin = true;
    }

    const activeCompanies = await Supplier.aggregate(pipeline);
    const companyTransformation = await Promise.all(
      activeCompanies.map(async (company) => await transformationSupplier(company, isAdmin))
    );

    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(await Supplier.countDocuments(matchQuery) / limit),
      data: companyTransformation,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const getSupplier = async (req, res) => {
  const id = req.params.id;
  try {
    const supplier = await Supplier.findById(id);
    if(supplier.isDeleted) {
      return res.status(207).json({
        status: 'fail',
        message: 'Supplier deleted',
      });
    }
    const totalProducts = await SupplierProduct.countDocuments({ supplierId: id });
    const orders = await Order.aggregate([
      { $match: { supplierId: new mongoose.Types.ObjectId(id), status: 'complete' } },
      { $group: { _id: null, totalOrders: { $sum: 1 }, totalSales: { $sum: '$totalPrice' } } }
    ]);
    const rates = await Rating.aggregate([
      { $match: { supplierId: new mongoose.Types.ObjectId(id), userType: { $ne: 'supplier' } } },
      { $group: { _id: null, totalRates: { $avg: '$rate' } } }
    ]);

    if (supplier.type === 'blackHorse') {
      res.status(200).json({
        status: 'success',
        data: {
          ...(await transformationSupplier(supplier)),
          totalProducts: totalProducts,
          totalOrders: orders.length > 0 ? orders[0].totalOrders : 0,
          totalSales: orders.length > 0 ? orders[0].totalSales : 0,
          totalRates: rates.length > 0 ? rates[0].totalRates : 0,
          access_token: jwt.sign({ _id: supplier._id, role: 'blackHorse' }, process.env.JWT_SECRET, {}),
        },
      });
    } else {
      res.status(200).json({
        status: 'success',
        data: {
          ...(await transformationSupplier(supplier)),
          totalProducts: totalProducts,
          totalOrders: orders.length > 0 ? orders[0].totalOrders : 0,
          totalSales: orders.length > 0 ? orders[0].totalSales : 0,
          totalRates: rates.length > 0 ? rates[0].totalRates : 0,
          access_token: jwt.sign({ _id: supplier._id, role: req.role }, process.env.JWT_SECRET, {}),
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const updateSupplier = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const supplier = await Supplier.findById(req.params.id);
  if(!supplier) {
    return res.status(207).json({
      status: 'fail',
      message: 'Supplier not found',
    });
  }

  const supplierData = req.body;
  try {
    if(supplierData.wallet || supplierData.wallet === 0) {
      await insertBalanceSheet(req.params.id, ProcessNames.deposit, null, null, supplier.wallet - supplierData.wallet, 'Debit');
    }
    const updatedSupplier = await Supplier.findByIdAndUpdate(req.params.id, supplierData, { new: true });
    res.status(200).json({
      status: 'success',
      data: await transformationSupplier(await checkActiveSupplier(updatedSupplier)),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.phoneNumber === 1) {
      res.status(207).json({
        status: 'fail',
        message: 'Duplicate phoneNumber',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
};
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    const basePhoneNumber = supplier.phoneNumber.split('-deleted')[0];
    let suffix = 1;
    let newPhoneNumber = `${basePhoneNumber}-deleted${suffix}`;

    let existingSupplier = await Supplier.findOne({ phoneNumber: newPhoneNumber });
    while (existingSupplier) {
      suffix++;
      newPhoneNumber = `${basePhoneNumber}-deleted${suffix}`;
      existingSupplier = await Supplier.findOne({ phoneNumber: newPhoneNumber });
    }

    supplier.phoneNumber = newPhoneNumber;
    supplier.isDeleted = true;
    await supplier.save();

    res.status(204).json({
      status: 'success',
      data: 'supplier deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status:'fail',
      message: error.message
    });
  }
}
export const createSupplierProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const supplierId = req.body.supplierId;
  const productId = req.body.productId;
  const productData = req.body;
  const unitId = req.body.unit;
  try {
    const product = await Product.findById(productId);
    // if (!product) {
    //   return res.status(206).json({
    //     status: 'fail',
    //     message: 'Product not found',
    //   });
    // }
    const unit = await Unit.findById(unitId);
    let productWeight = product.weight;
    if (unit) {
      productWeight *= unit.maxNumber;
    }
    // const supplier = await Supplier.findById(supplierId);
    // if (supplier.status === 'inactive') {
    //   return res.status(401).json({
    //     status: 'fail',
    //     message: 'Supplier is inactive',
    //   });
    // }
    // if (!supplier) {
    //   return res.status(207).json({
    //     status: 'fail',
    //     message: 'Supplier not found',
    //   });
    // }

    const oldSupplierProduct = await SupplierProduct.find({ productId: productId, supplierId: supplierId });
    if (oldSupplierProduct.length > 0) {
      for (const sp of oldSupplierProduct) {
        if (!unit && !sp.unit && sp.subUnit) {
          return res.status(211).json({
            status: 'fail',
            message: 'Product already exists in supplier list with sub unit',
          });
        } else if (unit && sp.unit) {
          return res.status(212).json({
            status: 'fail',
            message: 'Product already exists in supplier list with primary unit',
          });
        }
      }
    }

    const newSupplierProduct = await SupplierProduct.create({
      supplierId: supplierId,
      productId: productId,
      price: productData.price,
      stock: productData.stock,
      afterSale: productData.afterSale ?? null,
      minLimit: productData.minLimit ?? null,
      maxLimit: productData.maxLimit ?? null,
      unit: unitId ? unitId : null,
      subUnit: product.subUnit,
      productWeight: productWeight,
    });
    res.status(200).json({
      status: 'success',
      data: await transformationSupplierProduct(newSupplierProduct),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail here',
      message: error.message,
    });
  }
};

export const updateSupplierProducts = async (req, res) => {
  try {
    const { products } = req.body;
    const { id } = req.params;

    const supplierProducts = await SupplierProduct.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product"
        },
      },
      {
        $unwind: "$product"
      },
      {
        $match: {
          supplierId: new ObjectId(id),
          "product.barcode": {
            $in: Object.keys(products)
          }
        }
      },
      {
        $project: {
          barcode: "$product.barcode"
        }
      }
    ]).exec();

    for (const s_product of supplierProducts) {
      const q = {};
      const product = products[s_product.barcode];

      if (product.offerPrice || product.offerPrice === 0) {
        q.afterSale = product.offerPrice;
      }

      if (product.offerPriceExpireyDate) {
        q.afterSaleExpireDate = product.offerPriceExpireyDate;
      }

      await SupplierProduct.findByIdAndUpdate(s_product._id, q);
    }

    res.status(200).json({
      status: 'success',
      data: `(${supplierProducts.length}/${Object.keys(products).length}) Updated!`,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      data: error.message
    })
  }
}

export const updateSupplierProduct = async (req, res) => {
  try {
    const updatedSupplierProduct = await SupplierProduct.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({
      status: 'success',
      data: await transformationSupplierProduct(updatedSupplierProduct),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const deleteProductSupplier = async (req, res) => {
  const productId = req.params.id;
  try {
    const ordersPending = await Order.find({
      status: { $in: ['pending', 'inProgress', 'delivery', 'delivered', 'supplierCompleted', 'trash', 'edited'] },
      'products.product': productId
    }).limit(1);
    if (ordersPending.length > 0) {
      return res.status(241).json({
        status: 'fail',
        message: 'This product is already included in order',
      });
    }

    const offers = await Offer.find({ 'products.productId': productId }).limit(1);
    if (offers.length > 0) {
      return res.status(242).json({
        status: 'fail',
        message: 'This product is already included in offer',
      });
    }

    const supplierProduct = await SupplierProduct.findById(productId);
    await DeletedProduct.create({
      productId: productId,
      supplierId: supplierProduct.supplierId,
    });
    await SupplierProduct.findByIdAndDelete(productId);
    return res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const totalSalesBySupplierId = async (req, res) => {
  const monthSales = req.query.month;
  let query = { supplierId: req.params.id };
  try {
    if (monthSales && !isNaN(monthSales) && monthSales >= 1 && monthSales <= 12) {
      const startDate = new Date(Date.UTC(new Date().getFullYear(), monthSales - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(new Date().getFullYear(), monthSales, 0, 23, 59, 59, 999));

      const start = new Date(new Date(startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(endDate).getTime() - egyptHour * 60 * 60 * 1000);
      query.orderDate = { $gte: start, $lte: end };
    } else if (req.query.date) {
      const startDay = new Date(req.query.date);
      const nextDay = new Date(startDay);
      nextDay.setDate(nextDay.getDate() + 1);

      const start = new Date(new Date(startDay).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(nextDay).getTime() - egyptHour * 60 * 60 * 1000);
      query.orderDate = { $gte: start, $lte: end };
    }
    const orders = await Order.find({ ...query, status: 'complete' });
    const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    res.status(200).json({ status: 'success', data: totalSales });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
export const getTotalSales = async (req, res) => {
  try {
    let monthSales = req.query.month;
    let query = {};
    if (monthSales && !isNaN(monthSales) && monthSales >= 1 && monthSales <= 12) {
      const startDate = new Date(Date.UTC(new Date().getFullYear(), monthSales - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(new Date().getFullYear(), monthSales, 0, 23, 59, 59, 999));

      const start = new Date(new Date(startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(endDate).getTime() - egyptHour * 60 * 60 * 1000);
      query.orderDate = { $gte: start, $lte: end };
    } else if (req.query.date) {
      const startDay = new Date(req.query.date);
      const nextDay = new Date(startDay);
      nextDay.setDate(nextDay.getDate() + 1);

      const start = new Date(new Date(startDay).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(nextDay).getTime() - egyptHour * 60 * 60 * 1000);
      query.orderDate = { $gte: start, $lte: end };
    }

    const orders = await Order.find({ ...query, status: 'complete' });
    const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    res.status(200).json({ status: 'success', data: totalSales });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
export const getTotalSalesForEveryDay = async (req, res) => {
  let dailySales = {};
  const startQuery = new Date(req.query.startDate), endQuery = new Date(req.query.endDate);
  const startDate = new Date(new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000);
  const endDate = new Date(new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000);
  try {
    endDate.setDate(endDate.getDate() + 1);
    console.log(startDate, endDate);
    const query = { status: 'complete', updatedAt: { $gte: startDate, $lt: endDate } };
    if (req.query.supplierType) {
      query.supplierType = req.query.supplierType;
    }

    const orders = await Order.find(query);
    for(let date = startQuery; date <= endQuery; date.setDate(date.getDate() + 1)) {
      dailySales[formatDate(date)] = 0;
    }

    orders.forEach((order) => {
      dailySales[formatDate(new Date(new Date(order.updatedAt).getTime() + egyptHour * 60 * 60 * 1000))] += order.totalPrice;
    });
    res.status(200).json({ status: 'success', data: dailySales });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
export const getOrdersForSupplierInCurrentMonth = async (req, res) => {
  const supplierId = req.params.id;
  const startOfMonth = new Date();
  startOfMonth.setDate(1); // Set to the 1st day of the current month
  startOfMonth.setHours(0, 0, 0, 0); // Set time to midnight

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1); // Move to the next month
  endOfMonth.setDate(0); // Set to the last day of the current month
  endOfMonth.setHours(23, 59, 59, 999); // Set time to end of day

  try {
    const orders = await Order.find({
      supplierId,
      orderDate: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    res.status(200).json({
      status: 'success',
      data: totalSales,
    });
  } catch (error) {
    throw new Error('Error fetching orders for supplier: ' + error.message);
  }
};
export const lastOrdersBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 3;
  try {
    const lastOrders = await Order.find({ supplierId }).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).exec();
    const formattedOrders = await Promise.all(
      lastOrders.map(async (order) => await transformationOrder(order))
    );
    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(await Order.countDocuments({ supplierId }) / limit),
      data: formattedOrders,
    })
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const uploadPhoto = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(207).json({
        status: 'fail',
        message: 'Supplier not found',
      });
    }

    if(supplier.image){
      const pathName = supplier.image.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }

    supplier.image = `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`;
    await supplier.save();
    await checkActiveSupplier(supplier);
    return res.status(200).json({
      status: 'success',
      data: supplier.image,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
export const uploadPlaceImages = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(207).json({
        status: 'fail',
        message: 'Supplier not found',
      });
    }

    const imagePath = `${process.env.SERVER_URL}${req.file.path
      .replace(/\\/g, '/')
      .replace(/^upload\//, '')}`;
    supplier.placeImage = supplier.placeImage.concat(imagePath);
    await supplier.save();
    await checkActiveSupplier(supplier);
    res.status(200).json({
      status: 'success',
      data: supplier.placeImage,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
export const deletePlaceImages = async (req, res) => {
  const supplierId = req.params.id;
  const placeImage = req.body.placeImage;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(207).json({
        status: 'fail',
        message: 'Supplier not found',
      });
    }

    if(supplier.placeImage.includes(placeImage)){
      const pathName = placeImage.split('/').slice(3).join('/');
      fs.unlink('upload/' + pathName, (err) => {});
    }

    supplier.placeImage = supplier.placeImage.filter((image) => image !== placeImage);
    await supplier.save();
    await checkActiveSupplier(supplier);
    res.status(200).json({
      status: 'success',
      data: supplier.placeImage,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
export const getRegionBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(207).json({
        status: 'fail',
        message: 'Supplier not found',
      });
    }
    const regions = await Promise.all(
      supplier.deliveryRegion.map(async (supplierRegion) => {
        const region = await Region.findById(supplierRegion);
        return await transformationRegion(region);
      })
    );
    res.status(200).json({
      status: 'success',
      data: regions,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
export const getBalanceSheetBySupplier = async (req, res) => {
  const supplierId = req.params.supplierId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    let query = {supplierId};
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000);
      query.createdAt = { $gte: start, $lte: end };
    }

    const balanceSheets = await BalanceSheet.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).exec();
    const formattedBalanceSheets = await Promise.all(
      balanceSheets.map(async (balanceSheet) => await transformationBalanceSheet(balanceSheet))
    );
    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(await BalanceSheet.countDocuments(query) / limit),
      data: formattedBalanceSheets,
    })
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
export const getBalanceSheetSummaryBySupplier = async (req, res) => {
  const supplierId = req.params.supplierId;
  try {
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000);

      const [previousBalanceSheets, balanceSheets] = await Promise.all([
        BalanceSheet.find({ supplierId, createdAt: { $lt: start } }),
        BalanceSheet.find({ supplierId, createdAt: { $gte: start, $lte: end } })
      ]);

      const creditPreviousBalance = calculateBalance(previousBalanceSheets, 'Credit');
      const debitPreviousBalance = calculateBalance(previousBalanceSheets, 'Debit');
      const creditBalance = calculateBalance(balanceSheets, 'Credit');
      const debitBalance = calculateBalance(balanceSheets, 'Debit');

      return res.status(200).json({
        status: 'success',
        data: {
          totalBalance: debitPreviousBalance - creditPreviousBalance + debitBalance - creditBalance,
          previousBalance: debitPreviousBalance - creditPreviousBalance,
          creditBalance,
          debitBalance,
        },
      });
    } else {
      const balanceSheets = await BalanceSheet.find({ supplierId });
      const creditBalance = calculateBalance(balanceSheets, 'Credit');
      const debitBalance = calculateBalance(balanceSheets, 'Debit');

      return res.status(200).json({
        status: 'success',
        data: {
          totalBalance: debitBalance - creditBalance,
          previousBalance: 0,
          creditBalance,
          debitBalance,
        },
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
export const getBalanceSheetByDelivery = async (req, res) => {
  const deliveryId = req.params.deliveryId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    let query = {deliveryId};
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000);
      query.createdAt = { $gte: start, $lte: end };
    }

    const balanceSheets = await BalanceSheet.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).exec();
    const formattedBalanceSheets = await Promise.all(
      balanceSheets.map(async (balanceSheet) => await transformationBalanceSheet(balanceSheet))
    );
    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(await BalanceSheet.countDocuments(query) / limit),
      data: formattedBalanceSheets,
    })
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
}
export const updateBalanceSheet = async (req, res) => {
  const balanceSheetId = req.params.id;
  try {
    if (balanceSheetId) {
      const updatedBalanceSheet = await BalanceSheet.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      return res.status(200).json({
        status: 'success',
        data: await transformationBalanceSheet(updatedBalanceSheet),
      });
    } else {
      throw new Error(`BalanceSheet can not be founded`);
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const deleteBalanceSheet = async (req, res) => {
  const balanceSheetId = req.params.id;
  try {
    if (balanceSheetId) {
      await BalanceSheet.deleteOne({ _id: balanceSheetId });
      res.status(204).json({
        status: 'success',
        data: null,
      });
    } else {
      throw new Error(`BalanceSheet can not be founded`);
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: 'fail',
      message: error.message,
    });
  }
};
export const getGraphSalesBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  const type = req.query.type;
  try {
    if (type === 'year') {
      const currentYear = new Date().getFullYear();
      const order = await Order.aggregate([
        {
          $match: {
            supplierId: new mongoose.Types.ObjectId(supplierId),
            status: 'complete',
            updatedAt: {
              $gte: new Date(currentYear, 0, 1),
              $lt: new Date(currentYear + 1, 0, 1)
            }
          }
        },
        {
          $group: {
            _id: { month: { $month: '$updatedAt' } },
            sales: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.month': 1 }
        },
        {
          $project: {
            _id: 0,
            index: '$_id.month',
            sales: 1
          }
        }
      ]);

      // Initialize the array with 12 months
      const monthlySales = Array.from({ length: 12 }, (_, i) => ({
        index: i + 1,
        sales: 0
      }));

      // Update the array with actual sales data
      order.forEach(({ index, sales }) => {
        monthlySales[index - 1].sales = sales;
      });

      return res.status(200).json({
        status: 'success',
        data: monthlySales,
      });
    } else if (type === 'week') {
      const now = new Date();
      const currentDay = now.getUTCDay();
      const daysSinceSaturday = (currentDay + 1) % 7;
      const startOfWeek = new Date(now);
      startOfWeek.setUTCDate(now.getUTCDate() - daysSinceSaturday);
      startOfWeek.setUTCHours(0, 0, 0, 0);  // Start of current week (Saturday)

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7); // End of current week (Friday)
      // console.log(startOfWeek, ' - ', endOfWeek);
      const order = await Order.aggregate([
        {
          $match: {
            supplierId: new mongoose.Types.ObjectId(supplierId),
            status: 'complete',
            updatedAt: {
              $gte: startOfWeek,
              $lt: endOfWeek
            }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$updatedAt' },
            sales: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        },
        {
          $project: {
            _id: 0,
            index: '$_id',
            sales: 1
          }
        }
      ]);

      // Initialize the array with 7 days (assuming a week has 7 days)
      const weeklySales = Array.from({ length: 7 }, (_, i) => ({
        index: i + 1, // Assuming 1 for Saturday, 2 for Sunday, ..., 7 for Friday
        sales: 0
      }));

      // Update the array with actual sales data
      order.forEach(({ index, sales }) => {
        weeklySales[index % 7].sales = sales;
      });

      return res.status(200).json({
        status: 'success',
        data: weeklySales,
      });
    } else if (type === 'month') {
      const today = new Date();
      const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      const endOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

      const order = await Order.aggregate([
        {
          $match: {
            supplierId: new mongoose.Types.ObjectId(supplierId),
            status: 'complete',
            updatedAt: {
              $gte: startOfMonth,
              $lt: endOfMonth
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%d', date: '$updatedAt' } },
            sales: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        },
        {
          $project: {
            _id: 0,
            index: { $toInt: '$_id' },
            sales: 1
          }
        }
      ]);

      const monthlySales = Array.from({ length: 10 }, (_, i) => ({
        index: i + 1,
        sales: 0
      }));

      // 1-3 => 1, 4-6 => 2, 7-9 => 3, 10-12 => 4, 13-15 => 5, 16-18 => 6, 19-21 => 7, 22-24 => 8, 25-27 => 9, 28-31 => 10
      order.forEach(({ index, sales }) => {
        const targetIndex = index === 31 ? 9 : Math.ceil(index / 3) - 1;
        monthlySales[targetIndex].sales += sales;
      });
      return res.status(200).json({
        status: 'success',
        data: monthlySales
      });
    }
    res.status(207).json({
      type: "must be week, month, or year",
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
}
export const addBonusToSupplier = async (req, res) => {
  const supplierId = req.params.id;
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(207).json({
        status: 'fail',
        message: 'Supplier not found',
      });
    }
    if(!req.body.bonus || req.body.bonus < 0){
      return res.status(207).json({
        status: 'fail',
        message: 'bonus must be greater than 0',
      });
    }
    const newBalanceSheet = await insertBalanceSheet(supplier._id, ProcessNames.processAddBonus,null, null,req.body.bonus, ProcessNames.debit);
    console.log(newBalanceSheet);
    supplier.wallet += req.body.bonus;
    await supplier.save();
    await pushNotification( 'تم اضافة البونص بنجاح', 'تم اضافة البونص بنجاح',null, null, supplier._id, null, supplier.deviceToken);
    res.status(201).json({
      status: 'success',
      data: await transformationSupplier(supplier),
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
}

/****************************************** Helper Function ****************************************/
function formatDate(date){ // change format form MM/DD/YYYY to DD/MM/YYYY
  const parts = date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).split('/');
  return `${parts[1]}/${parts[0]}/${parts[2]}`;
}

const calculateBalance = (balanceSheets, type) =>
  balanceSheets.filter(balance => balance.type === type).reduce((total, balance) => total + balance.balance, 0);