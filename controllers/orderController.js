import Fee from "../models/feesSchema.js";
import Order from "../models/orderSchema.js";
import PromoCode from "../models/promocodeSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import Supplier from "../models/supplierSchema.js";
import Offer from "../models/offerSchema.js";
import Product from "../models/productSchema.js";
import {
  transformationCar,
  transformationCategory,
  transformationCustomer,
  transformationGroup,
  transformationOffer,
  transformationOrder,
  transformationProduct,
  transformationSubCategory,
  transformationSubUnit,
  transformationSupplierProduct,
  transformationUnit,
} from "../format/transformationObject.js";
import Car from "../models/carSchema.js";
import {pushNotification} from "../utils/pushNotificationAndSendSMS.js";
import Region from "../models/regionSchema.js";
import Customer from "../models/customerSchema.js";
import {applyFine} from "../utils/applyFineAndElasticOrder.js";
import Group from "../models/groupSchema.js";
import ReasonOfCancelOrReturn from "../models/reasonOfCancelOrReturnSchema.js";
import {egyptHour, insertBalanceSheet, ProcessNames,} from "../utils/balanceSheet.js";
import {calculateDeliveryDate} from "../utils/checkPendingInProgressOrder.js";
import Category from "../models/categorySchema.js";
import SubCategory from "../models/subCategorySchema.js";
import {backProductsToSupplierStock} from "./sharedFunction.js";
import ReturnPartOrder from "../models/returnPartOrderSchema.js";
import mongoose from "mongoose";
import SubUnit from "../models/subUnitSchema.js";
import Unit from "../models/unitSchema.js";
import {validationResult} from "express-validator";

export const getOrdersStatus = async (req, res) => {
  try {
    const status = Order.aggregate([
      {$match: {status: "complete"}},
      {
        $lookup: {
          from: "suppliers", localField: "supplierId", foreignField: "_id", as: "supplier"
        }
      },
      {$unwind: "$supplier"},
      {
        $group: {
          _id: null,
          blackhorseProfit: {$sum: {$multiply: [{$divide: ["$supplier.blackHorseFees", 100]}, "$totalPrice"]}},
          totalPrice: {$sum: "$totalPrice"}
        }
      }
    ]);

    res.status(200).json({
      status: "success",
      data: {
        totalPrice: status[0]?.totalPrice ?? 0,
        blackhorseProfit: status[0]?.blackhorseProfit ?? 0,
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}

export const getAllOrder = async (req, res) => {
  const queryConditions = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    queryConditions.group = { $exists: false };
    if (req.query.orderNumber) {
      queryConditions.orderNumber = req.query.orderNumber.trim();
    }
    if (req.query.supplierName) {
      const supplierNameLowerCase = req.query.supplierName.trim().toLowerCase();
      queryConditions.supplierName = {
        $regex: new RegExp(supplierNameLowerCase, "i"),
      };
    }
    if (req.query.customerName) {
      const customerNameLowerCase = req.query.customerName.trim().toLowerCase();
      queryConditions.customerName = {
        $regex: new RegExp(customerNameLowerCase, "i"),
      };
    }
    if (req.query.status) {
      queryConditions.status = req.query.status;
    }
    if (req.query.day) {
      const startDate = new Date(req.query.day.split("T")[0]);
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const start = new Date(
        new Date(startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(nextDay).getTime() - egyptHour * 60 * 60 * 1000
      );
      queryConditions.orderDate = { $gte: start, $lte: end };
    }
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(
        new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      queryConditions.orderDate = { $gte: start, $lte: end };
    }

    const orders = await Order.find(queryConditions)
      .sort({ orderDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();
    const formattedOrders = await Promise.all(
      orders.map(async (order) => await transformationOrder(order))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(
        (await Order.countDocuments(queryConditions)) / limit
      ),
      data: formattedOrders,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const updateOrder = async (req, res, next) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }
    const supplier = await Supplier.findById(order.supplierId);
    if (!supplier) {
      return res.status(404).json({
        status: "fail",
        message: "Supplier not found",
      });
    }

    if (req.body.status === "complete") {
      const customer = await Customer.findById(order.customerId);
      customer.wallet += order.totalPrice;
      order.status = "complete";

      const fee = supplier.blackHorseFees ?? (await Fee.findOne({ type: "fee" })).amount;
      const balance = Math.round(order.totalPrice * fee) / 100;

      await insertBalanceSheet(
        order.supplierId,
        ProcessNames.processComplete,
        order.customerName,
        order.orderNumber,
        balance,
        "Credit"
      );

      supplier.wallet += balance;

      await customer.save();
      await order.save();
      await supplier.save();
      if (order.group) {
        const groupOrders = await Order.find({
          group: order.group,
          control: "supplier",
        });
        if (
          groupOrders.every((groupOrder) => groupOrder.status === "complete")
        ) {
          const group = await Group.findById(order.group);
          group.status = "completed";
          await group.save();
          await pushNotification(
            "اكتمال تسليم اوردرات جروب",
            `تم اكتمال الموافقة من كل العملاء ع استلام الاوردر الخاص بيهم داخل جروب رقم ${group.groupNumber}`,
            null,
            null,
            group.supplierId,
            null,
            supplier.deviceToken
          );
        }
      } else {
        await pushNotification(
          "عملية شراء مكتمله",
          `قام العميل باستلام الاروردر رقم ${order.orderNumber} بنجاح`,
          null,
          null,
          order.supplierId,
          null,
          supplier.deviceToken
        );
      }
      for (const prod of order.products) {
        await Product.findByIdAndUpdate(prod.productAdminId, {
          $inc: { frequency: prod.quantity },
        });
        await SupplierProduct.findByIdAndUpdate(prod.product, {
          $inc: { frequency: prod.quantity },
        });
      }
    } else if (req.body.status === "supplierCompleted") {
      const customer = await Customer.findById(order.customerId);
      await pushNotification(
        "طلب شراء مكتمل",
        `تم اكتمال مرحلة تستلم اوردر رقم ${order.orderNumber} بنجاح ننتظر موافقتك بالاستلام`,
        null,
        order.customerId,
        null,
        null,
        customer.deviceToken
      );
    } else if (req.body.status === "cancelled") {
      const customer = await Customer.findById(order.customerId);
      const reason = await ReasonOfCancelOrReturn.findById(req.body.reasonId);
      if (req.headers["user-type"] === "supplier") {
        if (order.status === "pending") {
          await applyFine(
            order,
            order.supplierId,
            "fineForCancel",
            req.body.otherReason.length === 0
              ? reason.description
              : req.body.otherReason
          );
        }
        if (
          order.status === "inProgress" ||
          order.status === "delivery" ||
          order.status === "delivered" ||
          order.status === "supplierCompleted" ||
          order.status === "complete"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash !== "pending" &&
          order.beforeTrash !== "edited"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash === "edited" &&
          order.beforeEdited === "inProgress"
        ) {
          await backProductsToSupplierStock(order, true);
        }
        if (order.status === "edited" && order.beforeEdited === "inProgress") {
          await backProductsToSupplierStock(order, true);
        }
        await pushNotification(
          "الغاء اوردر!",
          `تم الغاء اوردرك برقم ${order.orderNumber}`,
          null,
          order.customerId,
          null,
          null,
          customer.deviceToken
        );
      } else if (req.headers["user-type"] === "customer") {
        if (order.status === "inProgress" || order.status === "delivery") {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash !== "pending" &&
          order.beforeTrash !== "edited"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash === "edited" &&
          order.beforeEdited === "inProgress"
        ) {
          await backProductsToSupplierStock(order, true);
        }
        if (order.status === "edited" && order.beforeEdited === "inProgress") {
          await backProductsToSupplierStock(order, true);
        }
        await pushNotification(
          "الغاء اوردر!",
          `تم الغاء اوردر رقم ${order.orderNumber} من طرف العميل`,
          null,
          null,
          order.supplierId,
          null,
          supplier.deviceToken
        );
      } else if (req.headers["user-type"] === "admin") {
        if (
          order.status === "inProgress" ||
          order.status === "delivery" ||
          order.status === "delivered" ||
          order.status === "supplierCompleted" ||
          order.status === "complete"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash !== "pending" &&
          order.beforeTrash !== "edited"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash === "edited" &&
          order.beforeEdited === "inProgress"
        ) {
          await backProductsToSupplierStock(order, true);
        }
        if (order.status === "edited" && order.beforeEdited === "inProgress") {
          await backProductsToSupplierStock(order, true);
        }
        await pushNotification(
          "الغاء اوردر!",
          `تم الغاء اوردرك برقم ${order.orderNumber} من قبل الادمن المسئول`,
          null,
          order.customerId,
          null,
          null,
          customer.deviceToken
        );
        await pushNotification(
          "الغاء اوردر!",
          `تم الغاء اوردر رقم ${order.orderNumber} من قبل الادمن المسئول`,
          null,
          null,
          order.supplierId,
          null,
          supplier.deviceToken
        );
      }

      const cancelOrder = await Order.findByIdAndUpdate(
        req.params.id,
        {
          status: "cancelled",
          reason: reason
            ? {
                _id: reason._id,
                description: reason.description,
                type: reason.type,
              }
            : null,
          otherReason:
            req.body.otherReason.length === 0 ? null : req.body.otherReason,
          control: req.headers["user-type"],
        },
        { new: true }
      );
      if (order.group) {
        const group = await Group.findById(order.group);
        group.totalWeight -= order.orderWeight;
        group.totalPrice -= order.totalPrice;
        await group.save();
      }

      return res.status(200).json({
        status: "success",
        data: await transformationOrder(cancelOrder),
      });
    } else if (req.body.status === "returned") {
      const customer = await Customer.findById(order.customerId);
      const reason = await ReasonOfCancelOrReturn.findById(req.body.reasonId);
      if (req.headers["user-type"] === "supplier") {
        if (
          order.status === "inProgress" ||
          order.status === "delivery" ||
          order.status === "delivered" ||
          order.status === "supplierCompleted" ||
          order.status === "complete"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash !== "pending" &&
          order.beforeTrash !== "edited"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash === "edited" &&
          order.beforeEdited === "inProgress"
        ) {
          await backProductsToSupplierStock(order, true);
        }
        if (order.status === "edited" && order.beforeEdited === "inProgress") {
          await backProductsToSupplierStock(order, true);
        }
        await pushNotification(
          "ارجاع اوردر!",
          `تم ارجاع اوردرك برقم ${order.orderNumber}`,
          null,
          order.customerId,
          null,
          null,
          customer.deviceToken
        );
      } else if (req.headers["user-type"] === "customer") {
        if (order.status === "inProgress" || order.status === "delivery") {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash !== "pending" &&
          order.beforeTrash !== "edited"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash === "edited" &&
          order.beforeEdited === "inProgress"
        ) {
          await backProductsToSupplierStock(order, true);
        }
        if (order.status === "edited" && order.beforeEdited === "inProgress") {
          await backProductsToSupplierStock(order, true);
        }
        await pushNotification(
          "ارجاع اوردر!",
          `تم ارجاع اوردر رقم ${order.orderNumber} من طرف العميل`,
          null,
          null,
          order.supplierId,
          null,
          supplier.deviceToken
        );
      } else if (req.headers["user-type"] === "admin") {
        if (
          order.status === "inProgress" ||
          order.status === "delivery" ||
          order.status === "delivered" ||
          order.status === "supplierCompleted" ||
          order.status === "complete"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash !== "pending" &&
          order.beforeTrash !== "edited"
        ) {
          await backProductsToSupplierStock(order);
        }
        if (
          order.status === "trash" &&
          order.beforeTrash === "edited" &&
          order.beforeEdited === "inProgress"
        ) {
          await backProductsToSupplierStock(order, true);
        }
        if (order.status === "edited" && order.beforeEdited === "inProgress") {
          await backProductsToSupplierStock(order, true);
        }
        await pushNotification(
          "ارجاع اوردر!",
          `تم ارجاع اوردرك برقم ${order.orderNumber} من طرف الادمن المسئول`,
          null,
          order.customerId,
          null,
          null,
          customer.deviceToken
        );
        await pushNotification(
          "ارجاع اوردر!",
          `تم ارجاع اوردر رقم ${order.orderNumber} من طرف الادمن المسئول`,
          null,
          null,
          order.supplierId,
          null,
          supplier.deviceToken
        );
      }

      const returnedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        {
          status: "returned",
          reason: reason
            ? {
                _id: reason._id,
                description: reason.description,
                type: reason.type,
              }
            : null,
          otherReason:
            req.body.otherReason.length === 0 ? null : req.body.otherReason,
          control: req.headers["user-type"],
        },
        { new: true }
      );
      if (order.group) {
        const group = await Group.findById(order.group);
        group.totalWeight -= order.orderWeight;
        group.totalPrice -= order.totalPrice;
        await group.save();
      }

      return res.status(200).json({
        status: "success",
        data: await transformationOrder(returnedOrder),
      });
    } else if (req.body.status === "inProgress") {
      const products = order.products;
      const offers = order.offers;
      const customer = await Customer.findById(order.customerId);

      try {
        await checkStockQuantity(res, products, offers);
      } catch (_) {
        return;
      }

      // customer.wallet -= order.totalPrice;
      // await customer.save();
      await pushNotification(
        "تم موافقة الطلب",
        `تم الموافقة علي طلب اوردر رقم ${order.orderNumber}`,
        null,
        order.customerId,
        null,
        null,
        customer.deviceToken
      );
    } else if (req.body.status === "delivery") {
      const customer = await Customer.findById(order.customerId);
      await pushNotification(
        "وافق عامل التوصيل",
        `تم الموافقة ع توصيل الاوردر برقم ${order.orderNumber}`,
        null,
        order.customerId,
        null,
        null,
        customer.deviceToken
      );
    } else if (req.body.status === "delivered") {
      const customer = await Customer.findById(order.customerId);
      await pushNotification(
        "تم شحن الاوردر!",
        `قام عامل التوصيل بشحن الاوردر الخاص بك رقم ${order.orderNumber}`,
        null,
        order.customerId,
        null,
        null,
        customer.deviceToken
      );
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    return res.status(200).json({
      status: "success",
      data: await transformationOrder(updatedOrder),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getOrderByDelivery = async (deliveryId) => {
  // use socketIO
  try {
    const orders = await Order.find({
      deliveryBoy: deliveryId,
      group: { $exists: false },
      status: { $in: ["delivery"] }, // , "delivered"
    }).sort({ orderDate: -1 });

    return await Promise.all(
      orders.map(async (order) => await transformationOrder(order))
    );
  } catch (error) {
    return [];
  }
};
export const getOrderByDeliveryRoute = async (req, res) => {
  // use http
  const deliveryId = req.params.deliveryId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    let query = {
      deliveryBoy: deliveryId,
      status: { $in: ["delivered", "supplierCompleted", "complete"] },
      group: { $exists: false },
    };
    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();
    const ordersByDelivery = await Promise.all(
      orders.map(async (order) => await transformationOrder(order))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil((await Order.countDocuments(query)) / limit),
      data: ordersByDelivery,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const orderData = req.body;
  const promoCode = req.body.promoCode;
  const customerId = req.body.customerId;
  const supplierId = req.body.supplierId;
  const products = req.body.products ?? []; // Array of products with { productId, quantity }
  const offers = req.body.offers ?? []; // Array of offers with { offerId, quantity }
  const carId = req.body.car;
  const totalPrice = req.body.totalPrice;
  const district = req.body.district;
  let discountCoupon = 0;
  try {
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(205).json({
        status: "fail",
        message: "Car not found",
      });
    }

    if (district) {
      const region = await Region.findOne({ name: district });
      if (!region) {
        return res.status(218).json({
          status: "fail",
          message: "Region not found",
        });
      }
    }
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(206).json({
        status: "fail",
        message: "Supplier not found",
      });
    }
    if (!req.body.isGroup) {
      if (totalPrice < supplier.minOrderPrice) {
        return res.status(207).json({
          status: "fail",
          message: "Total price should be greater than min order price",
        });
      }
    }

    if (promoCode) {
      const existingPromoCode = await PromoCode.findOne({ code: promoCode });
      if (!existingPromoCode) {
        // check promo code exists
        return res.status(208).json({
          status: "fail",
          message: "Promo code not found",
        });
      }

      if (existingPromoCode.customerId.includes(customerId)) {
        // Check customer used promocode
        return res.status(209).json({
          status: "fail",
          message: "Promo code already used",
        });
      }

      if (existingPromoCode.numOfUsage <= 0) {
        // check number of usage
        return res.status(210).json({
          status: "fail",
          message: "The Promo code has reached its maximum usage limit.",
        });
      }

      const currentDate = new Date(); // check expiry date
      const newDate = new Date(
        currentDate.getTime() + egyptHour * 60 * 60 * 1000
      );
      if (existingPromoCode.expiryDate < newDate) {
        return res.status(211).json({
          status: "fail",
          message: "The Promo code has expired.",
        });
      }
    }
    const nowDate = new Date(Date.now() + egyptHour * 60 * 60 * 1000);
    const deliveryDate = await calculateDeliveryDate(supplier, nowDate);

    const productsMap = new Map();
    for (const product of products) {
      const supplierProduct = await SupplierProduct.findById(product.product);
      if (!supplierProduct || supplierProduct.stock < product.quantity) {
        // check quantity of products
        const prod = await Product.findById(supplierProduct.productId);
        return res.status(212).json({
          status: "fail",
          message: prod.title, // `Product with title ${prod.title} is not available or out of stock`,
        });
      }

      if (
        (!supplierProduct || supplierProduct.maxLimit < product.quantity) &&
        supplierProduct.maxLimit !== null
      ) {
        const prod = await Product.findById(supplierProduct.productId); // check products max limit
        return res.status(213).json({
          status: "fail",
          message: prod.title, //`The maximum quantity allowed for purchasing ${prod.title} is ${supplierProduct.maxLimit}.`,
        });
      } else if (
        (!supplierProduct || supplierProduct.minLimit > product.quantity) &&
        supplierProduct.minLimit !== null
      ) {
        const prod = await Product.findById(supplierProduct.productId); // check products min limit
        return res.status(220).json({
          status: "fail",
          message: prod.title, // `The minimum quantity allowed for purchasing ${prod.title} is ${supplierProduct.minLimit}.`,
        });
      }
      if (productsMap.has(product.product.toString())) {
        productsMap.set(
          product.product.toString(),
          productsMap.get(product.product.toString()) + product.quantity
        );
      } else {
        productsMap.set(product.product.toString(), product.quantity);
      }
    }

    for (const offer of offers) {
      const offerData = await Offer.findById(offer.offer); // offer quantity available in stock
      if (!offerData || offerData.stock < offer.quantity) {
        return res.status(214).json({
          status: "fail",
          message: offerData.title, // `Offer with title ${offerData.title} is not available or out of stock`,
        });
      }

      if (
        ((!offerData || offerData.maxLimit < offer.quantity) &&
          offerData.maxLimit !== null) ||
        ((!offerData || offerData.minLimit > offer.quantity) &&
          offerData.minLimit !== null)
      ) {
        return res.status(215).json({
          // check offer main, max limit
          status: "fail",
          message: offerData.title, //`The minimum quantity allowed for purchasing ${offerData.title} is ${offerData.minLimit}, and The maximum quantity allowed for purchasing ${offerData.title} is ${offerData.maxLimit}`,
        });
      }

      for (const iterProduct of offerData.products) {
        // check products in offer available in stock
        const sp = await SupplierProduct.findById(iterProduct.productId);
        if (!sp || sp.stock < iterProduct.quantity) {
          const prod = await Product.findById(sp.productId);
          return res.status(216).json({
            status: "fail",
            message: prod.title, // `Product with title ${prod.title} in offer ${offerData.title} is not available or out of stock`,
          });
        }
        if (productsMap.has(iterProduct.productId.toString())) {
          productsMap.set(
            iterProduct.productId.toString(),
            productsMap.get(iterProduct.productId.toString()) +
              iterProduct.quantity * offer.quantity
          );
        } else {
          productsMap.set(
            iterProduct.productId.toString(),
            iterProduct.quantity * offer.quantity
          );
        }
      }
    }

    for (const [key, value] of productsMap.entries()) {
      // check total quantity of products available in supplier stock
      const supplierProduct = await SupplierProduct.findById(key);
      if (supplierProduct.stock < value) {
        const prod = await Product.findById(supplierProduct.productId);
        return res.status(217).json({
          status: "fail",
          message: prod.title, // `Product with title ${prod.title} is not available or out of stock`,
        });
      }
    }

    if (promoCode) {
      const promoCodeData = await PromoCode.findOne({ code: promoCode });
      discountCoupon = promoCodeData.discount;
    }

    // console.log("productsMap:", productsMap);
    const newOrder = await Order.create({
      supplierId: orderData.supplierId,
      supplierName: supplier.name,
      supplierType: supplier.type,
      promoCode: orderData.promoCode ?? null,
      discountCoupon: discountCoupon,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerPhoneNumber: orderData.customerPhoneNumber,
      totalPrice: orderData.totalPrice,
      subTotalPrice: orderData.subTotalPrice,
      deliveryFees: orderData.deliveryFees,
      discount: orderData.discount,
      type: orderData.type,
      address: orderData.address ?? null,
      district: orderData.district ?? null,
      subRegion: orderData.subRegion ?? null,
      deliveryDaysNumber: orderData.deliveryDaysNumber ?? null,
      orderWeight: orderData.orderWeight,
      deliveryDate: deliveryDate,
      ...(await formatProductsAndOffers(orderData)),
      latitude: orderData.latitude ?? null,
      longitude: orderData.longitude ?? null,
      car: await (async () => {
        const carObject = await Car.findById(orderData.car);
        const carData = await transformationCar(carObject);
        return {
          car: carData._id,
          type: carData.type,
          maxWeight: carData.maxWeight,
          image: carData.image ?? null,
          number: carData.number,
        };
      })(),
    });
    await newOrder.save();
    if (promoCode) {
      const existingPromoCode = await PromoCode.findOne({ code: promoCode });
      existingPromoCode.numOfUsage--;
      existingPromoCode.customerId.push(customerId);
      await existingPromoCode.save();
    }
    await pushNotification(
      "لديك طلب جديد",
      "قام احد العملاء بطلب اوردر جديد ينتظر موافقتك",
      null,
      null,
      supplierId,
      null,
      supplier.deviceToken
    );

    res.status(201).json({
      status: "success",
      data: await transformationOrder(newOrder),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllOrderByCustomerId = async (req, res) => {
  const customerId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const orders = await Order.find({ customerId })
      .sort({ orderDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();
    const formattedOrders = await Promise.all(
      orders.map(async (order) => await transformationOrder(order))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(
        (await Order.countDocuments({ customerId })) / limit
      ),
      data: formattedOrders,
    });

    formattedOrders.reverse();
    const completeNotRatingOrder = formattedOrders.find(
      (order) =>
        order.status === "complete" && order.supplierRating === "notRating"
    );
    if (completeNotRatingOrder) {
      await Order.findOneAndUpdate(
        { _id: completeNotRatingOrder._id },
        { supplierRating: "ignore" },
        { new: true }
      );
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllOrderBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  const status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    let query = { supplierId: supplierId, group: { $exists: false } };

    if (status) {
      if (status === "pending") {
        query.$or = [
          { status: "pending" },
          {
            status: "edited",
            control: "customer",
            beforeEdited: "pending"
          }
        ];
      } else {
        query.status = status;
      }
    }
    const orders = await Order.find(query)
    .sort({ orderDate: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .exec();

    const formattedOrders = await Promise.all(
      orders.map(async (order) => await transformationOrder(order))
    );

    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil((await Order.countDocuments(query)) / limit),
      data: formattedOrders,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const totalOrderBySupplierId = async (req, res) => {
  const supplierId = req.params.id;
  const month = req.query.month;
  try {
    let query = { supplierId: supplierId, group: { $exists: false } };
    if (
      month &&
      !isNaN(month) &&
      parseInt(month) >= 1 &&
      parseInt(month) <= 12
    ) {
      const startDate = new Date(
        Date.UTC(new Date().getFullYear(), month - 1, 1, 0, 0, 0)
      );
      const endDate = new Date(
        Date.UTC(new Date().getFullYear(), month, 0, 23, 59, 59, 999)
      );

      const start = new Date(
        new Date(startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(endDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      query.orderDate = { $gte: start, $lte: end };
    }

    const totalOrders = await Order.countDocuments(query);
    res.status(200).json({
      status: "success",
      data: totalOrders,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getBestSeller = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ frequency: -1 })
      .limit(3)
      .exec();
    const formattedProducts = await Promise.all(
      products.map(async (product) => await transformationProduct(product))
    );
    res.status(200).json({
      status: "success",
      data: formattedProducts,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const mostFrequentDistricts = async (req, res) => {
  try {
    const mostFrequentDistricts = await Order.aggregate([
      {
        $match: { status: "complete" },
      },
      {
        $group: {
          _id: "$district",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
    res.status(200).json({
      status: "success",
      data: mostFrequentDistricts,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getBestSellerForSupplier = async (req, res) => {
  const supplierId = req.params.id;
  const { month } = req.query;
  try {
    const firstDayOfMonth = new Date(
      new Date().getFullYear(),
      parseInt(month) - 1,
      1
    );
    const lastDayOfMonth = new Date(
      new Date().getFullYear(),
      parseInt(month),
      0,
      23,
      59,
      59
    );

    const bestSellers = await Order.aggregate([
      {
        $match: {
          supplierId: new mongoose.Types.ObjectId(supplierId),
          products: { $exists: true, $ne: [] },
          status: "complete",
          orderDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        },
      },
      { $unwind: "$products" }, // Deconstruct the products array
      {
        $group: {
          _id: "$products.product",
          totalQuantity: { $sum: "$products.quantity" },
        },
      }, // Group by product ID and sum quantities
      { $sort: { totalQuantity: -1 } }, // Sort by total quantity in descending order
      { $limit: 3 }, // Limit the result to the top 3 products
      {
        $lookup: {
          from: "products", // Assuming the name of the product collection is "products"
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      }, // Join with the products collection to get product details
    ]);

    const productIds = bestSellers.map((seller) => seller._id);
    const products = await SupplierProduct.find({
      _id: { $in: productIds },
    });

    const formattedProducts = await Promise.all(
      products.map(
        async (product) => await transformationSupplierProduct(product)
      )
    );
    res.status(200).json({
      status: "success",
      data: formattedProducts,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getNumOfOrders = async (req, res) => {
  try {
    let dataMap = {},
      query = { group: { $exists: false } };
    const statuses = [
      "pending",
      "inProgress",
      "delivery",
      "delivered",
      "edited",
      "supplierCompleted",
      "complete",
      "cancelled",
      "trash",
      "returned",
    ];
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(
        new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      query.orderDate = { $gte: start, $lte: end };
    }

    const counts = await Promise.all(
      statuses.map((status) => Order.countDocuments({ status, ...query }))
    );
    statuses.forEach((status, index) => {
      dataMap[status] = counts[index];
    });
    res.status(200).json({
      status: "success",
      data: dataMap,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getOrdersAndGroupByDeliveryId = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const query1 = {
      deliveryBoy: new mongoose.Types.ObjectId(req.params.deliveryId),
      status: { $in: ["delivered", "supplierCompleted", "complete"] },
      group: { $exists: false },
    };
    const query2 = {
      deliveryBoy: new mongoose.Types.ObjectId(req.params.deliveryId),
      status: { $in: ["delivered", "supplierCompleted", "completed"] },
    };

    if (req.query.startDate && req.query.endDate) {
      const start = new Date(
        new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      query1.deliveryTimeOfArrival = { $gte: start, $lte: end };
      query2.deliveryTimeOfArrival = { $gte: start, $lte: end };
    }

    const ordersPipeline = [
      { $match: query1 },
      { $sort: { deliveryTimeOfArrival: -1 } },
      {
        $project: {
          deliveryTimeOfArrival: 1,
          orderDetails: 1,
          operationType: { $literal: "order" },
        },
      },
    ];

    const groupsPipeline = [
      { $match: query2 },
      { $sort: { deliveryTimeOfArrival: -1 } },
      {
        $project: {
          deliveryTimeOfArrival: 1,
          groupDetails: 1,
          operationType: { $literal: "group" },
        },
      },
    ];

    const combinedPipeline = [
      { $unionWith: { coll: "groups", pipeline: groupsPipeline } },
      { $sort: { deliveryTimeOfArrival: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const paginatedData = await Order.aggregate([
      ...ordersPipeline,
      ...combinedPipeline,
    ]).exec();
    const transformEntries = paginatedData.map(async (entry) => {
      if (entry.operationType === "order") {
        const orderData = await Order.findById(entry._id);
        return await transformationOrder(orderData);
      } else if (entry.operationType === "group") {
        const groupData = await Group.findById(entry._id);
        return await transformationGroup(groupData);
      }
      return entry;
    });

    return res.status(200).json({
      status: "success",
      data: await Promise.all(transformEntries),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getOrderByIdOrOrderNumber = async (req, res) => {
  const orderId = req.params.id;
  try {
    let order;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    } else if (/^\d+$/.test(orderId)) {
      order = await Order.findOne({ orderNumber: orderId });
    }

    res.status(200).json({
      status: "success",
      data: await transformationOrder(order),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const returnPartOfOrder = async (req, res) => {
  const orderId = req.params.id;
  try {
    let products = req.body.products ?? [],
      offers = req.body.offers ?? [];
    const order = await Order.findById(orderId)
      .populate("supplierId")
      .populate("customerId");
    const reason = await ReasonOfCancelOrReturn.findById(req.body.reasonId);

    const idsUsingProduct = order.products.map((item) => {
      return { productId: item.product.toString(), quantity: item.quantity };
    });
    for (const prod of products) {
      if (!idsUsingProduct.some((item) => item.productId === prod.product)) {
        return res.status(206).json({
          status: "fail",
          message: `product: ${prod.product} not included in order`,
        });
      }
      if (
        idsUsingProduct.some(
          (item) =>
            item.productId === prod.product && item.quantity < prod.quantity
        )
      ) {
        return res.status(207).json({
          status: "fail",
          message: `product: ${prod.product} not enough in order`,
        });
      }
    }

    const idsUsingOffer = order.offers.map((item) => {
      return { offerId: item.offer.toString(), quantity: item.quantity };
    });
    for (const offer of offers) {
      if (!idsUsingOffer.some((item) => item.offerId === offer.offer)) {
        return res.status(208).json({
          status: "fail",
          message: `offer: ${offer.offer} not included in order`,
        });
      }
      if (
        idsUsingOffer.some(
          (item) =>
            item.offerId === offer.offer && item.quantity < offer.quantity
        )
      ) {
        return res.status(209).json({
          status: "fail",
          message: `offer: ${offer.offer} not enough in order`,
        });
      }
    }

    for (const prod of products) {
      const oldProdIndex = order.products.findIndex(
        (item) => item.product.toString() === prod.product
      );
      if (oldProdIndex !== -1) {
        order.products[oldProdIndex].quantity -= prod.quantity;
        order.orderWeight -=
          order.products[oldProdIndex].productWeight * prod.quantity;
        if (order.products[oldProdIndex].afterSale) {
          order.subTotalPrice -=
            order.products[oldProdIndex].afterSale * prod.quantity;
        } else {
          order.subTotalPrice -=
            order.products[oldProdIndex].price * prod.quantity;
        }

        if (order.promoCode) {
          if (order.products[oldProdIndex].afterSale) {
            order.totalPrice -=
              order.products[oldProdIndex].afterSale *
              prod.quantity *
              (1 - order.discountCoupon / 100);
          } else {
            order.totalPrice -=
              order.products[oldProdIndex].price *
              prod.quantity *
              (1 - order.discountCoupon / 100);
          }
        } else {
          if (order.products[oldProdIndex].afterSale) {
            order.totalPrice -=
              order.products[oldProdIndex].afterSale * prod.quantity;
          } else {
            order.totalPrice -=
              order.products[oldProdIndex].price * prod.quantity;
          }
        }
        if (order.group) {
          const group = await Group.findById(order.group);
          group.totalWeight -=
            order.products[oldProdIndex].productWeight * prod.quantity;
          if (order.products[oldProdIndex].afterSale) {
            group.totalPrice -=
              order.products[oldProdIndex].afterSale *
              prod.quantity *
              (1 - order.discountCoupon / 100);
          } else {
            group.totalPrice -=
              order.products[oldProdIndex].price *
              prod.quantity *
              (1 - order.discountCoupon / 100);
          }
          await group.save();
        }
        order.markModified("products");
        await order.save();
        const validOrderStatuses = [
          "inProgress",
          "delivery",
          "delivered",
          "supplierCompleted",
          "complete",
        ];
        if (
          validOrderStatuses.includes(order.status) ||
          (order.status === "trash" && order.beforeTrash !== "pending")
        ) {
          const sp = await SupplierProduct.findById(prod.product);
          sp.stock += prod.quantity;
          await sp.save();
        }
      }
    }
    for (const offer of offers) {
      const oldOfferIndex = order.offers.findIndex(
        (item) => item.offer.toString() === offer.offer
      );
      if (oldOfferIndex !== -1) {
        order.offers[oldOfferIndex].quantity -= offer.quantity;
        order.orderWeight -=
          order.offers[oldOfferIndex].offerWeight * offer.quantity;
        if (order.offers[oldOfferIndex].afterSale) {
          order.subTotalPrice -=
            order.offers[oldOfferIndex].afterSale * offer.quantity;
        } else {
          order.subTotalPrice -=
            order.offers[oldOfferIndex].price * offer.quantity;
        }

        if (order.promoCode) {
          if (order.offers[oldOfferIndex].afterSale) {
            order.totalPrice -=
              order.offers[oldOfferIndex].afterSale *
              offer.quantity *
              (1 - order.discountCoupon / 100);
          } else {
            order.totalPrice -=
              order.offers[oldOfferIndex].price *
              offer.quantity *
              (1 - order.discountCoupon / 100);
          }
        } else {
          if (order.offers[oldOfferIndex].afterSale) {
            order.totalPrice -=
              order.offers[oldOfferIndex].afterSale * offer.quantity;
          } else {
            order.totalPrice -=
              order.offers[oldOfferIndex].price * offer.quantity;
          }
        }
        if (order.group) {
          const group = await Group.findById(order.group);
          group.totalWeight -=
            order.offers[oldOfferIndex].offerWeight * offer.quantity;
          if (order.offers[oldOfferIndex].afterSale) {
            group.totalPrice -=
              order.offers[oldOfferIndex].afterSale *
              offer.quantity *
              (1 - order.discountCoupon / 100);
          } else {
            group.totalPrice -=
              order.offers[oldOfferIndex].price *
              offer.quantity *
              (1 - order.discountCoupon / 100);
          }
          await group.save();
        }
        order.markModified("offers");
        await order.save();
        const validOrderStatuses = [
          "inProgress",
          "delivery",
          "delivered",
          "supplierCompleted",
          "complete",
        ];
        if (
          validOrderStatuses.includes(order.status) ||
          (order.status === "trash" && order.beforeTrash !== "pending")
        ) {
          const offerData = await Offer.findById(offer.offer);
          offerData.stock += offer.quantity;
          await offerData.save();
          for (const subOffer of offerData.products) {
            const sp = await SupplierProduct.findById(subOffer.productId);
            sp.stock += offer.quantity * subOffer.quantity;
            await sp.save();
          }
        }
      }
    }

    const newReturnPartOrder = await ReturnPartOrder.create({
      orderId: orderId,
      products: await Promise.all(
        products.map(async (product) => {
          return {
            product: product.product,
            quantity: product.quantity,
          };
        })
      ),
      offers: await Promise.all(
        offers.map(async (offer) => {
          return {
            offer: offer.offer,
            quantity: offer.quantity,
          };
        })
      ),
      reason: reason
        ? {
            _id: reason._id,
            description: reason.description,
            type: reason.type,
          }
        : null,
      otherReason:
        req.body.otherReason.length === 0 ? null : req.body.otherReason,
    });
    await pushNotification(
      "تم إرجاع جزء الاوردر!",
      `قام الادمن المسئول بارجاع جزء من الاوردر الخاص بك رقم ${order.orderNumber}`,
      null,
      order.customerId,
      null,
      null,
      order.customerId.deviceToken
    );
    await pushNotification(
      "تم إرجاع جزء الاوردر!",
      `قام الادمن المسئول بارجاع جزء من الاوردر الخاص بك رقم ${order.orderNumber}`,
      null,
      null,
      order.supplierId,
      null,
      order.supplierId.deviceToken
    );

    await newReturnPartOrder.save();
    const orderAfferUpdate = await Order.findById(orderId);
    res.status(200).json({
      status: "success",
      data: await transformationOrder(orderAfferUpdate),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getCustomerNotConfirmedOrders = async (req, res) => {
  let query = { group: { $exists: false } };
  try {
    if (
      req.query.status === "edited" ||
      req.query.status === "supplierCompleted"
    ) {
      query.status = req.query.status;
    } else {
      query.status = { $in: ["edited", "supplierCompleted"] };
    }

    const orders = await Order.find(query).populate("customerId");
    const transformCustomer = await Promise.all(
      orders.map(async (order) => ({
        ...(await transformationCustomer(order.customerId)),
        orderNumber: order.orderNumber,
      }))
    );

    res.status(200).json({
      status: "success",
      data: transformCustomer,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const editProductsAndOffersInOrder = async (req, res) => {
  const orderData = req.body;
  try {
    const order = await Order.findById(req.params.id).populate("customerId").populate("supplierId").lean();
    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "order not found",
      });
    }

    if (orderData.status !== "edited" && orderData.beforeEdited !== "pending" && orderData.beforeEdited !== "inProgress") {
      return res.status(400).json({
        status: "fail",
        message: "order can't be edited",
      });
    }

    let beforeEditedProducts = order.products.map((product) => ({
      product: product.product,
      quantity: product.quantity,
    }));
    let beforeEditedOffers = order.offers.map((offer) => ({
      offer: offer.offer,
      quantity: offer.quantity,
    }));

    let updatedOrderData = {
      status: orderData.status,
      beforeEdited: orderData.beforeEdited,
      totalPrice: orderData.totalPrice,
      subTotalPrice: orderData.subTotalPrice,
      orderWeight: orderData.orderWeight,
      control: req.headers["user-type"],
      ...(await formatProductsAndOffers(orderData)),
    };
    if (order.status !== "edited") {
      updatedOrderData.beforeEditedProducts = beforeEditedProducts;
      updatedOrderData.beforeEditedOffers = beforeEditedOffers;
    }

    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updatedOrderData, { new: true });
    if(req.headers['user-type'] === "supplier"){
      await pushNotification(
        "تم التعديل علي الاوردر",
        `تم التعديل علي الاوردر الخاص بك عن طريق المورد رقم ${order.orderNumber} ننتظر موافقتك`,
        null,
        order.customerId._id,
        null,
        null,
        order.customerId.deviceToken
      );
    } else if (req.headers['user-type'] === "customer") {
      await pushNotification(
        "تم التعديل علي الاوردر",
        `تم التعديل علي الاوردر الخاص بك عن طريق العميل رقم ${order.orderNumber} ننتظر موافقتك`,
        null,
        null,
        order.supplierId._id,
        null,
        order.supplierId.deviceToken
      );
    }
   
    res.status(200).json({
      status: "success",
      data: await transformationOrder(updatedOrder),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const confirmChangeOrderByCustomer = async (req, res) => {
  const orderData = req.body;
  try {
    const order = await Order.findById(req.params.id)
      .populate("supplierId")
      .lean();
    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "order not found",
      });
    }

    if (orderData.status !== "inProgress" && orderData.status !== "delivery") {
      return res.status(400).json({
        status: "fail",
        message: "order can't be edited",
      });
    }

    if (orderData.status === "inProgress") {
      try {
        await checkStockQuantity(res, order.products, order.offers);
      } catch (_) {
        return;
      }
    } else if (orderData.status === "delivery") {
      const { differentQuantityProducts, differentQuantityOffers } =
        getDifferentQuantity(order);
      try {
        await checkStockQuantity(
          res,
          differentQuantityProducts,
          differentQuantityOffers
        );
      } catch (_) {
        return;
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: orderData.status,
      },
      { new: true }
    );
    await pushNotification(
      "تم الموافقة علي تعديل اوردر",
      `تم الموافقة علي تعديل اوردر من طرف العميل الخاص بك رقم ${order.orderNumber}`,
      null,
      null,
      order.supplierId._id,
      null,
      order.supplierId.deviceToken
    );

    res.status(200).json({
      status: "success",
      data: await transformationOrder(updatedOrder),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

/** helper functions **/
/********************** format products and offers using in createOrder&editProductsAndOffersInOrder **********************/
async function formatProductsAndOffers(orderData) {
  const unitCache = new Map();
  const categoryCache = new Map();
  const subCategoryCache = new Map();
  const subUnitCache = new Map();
  const productCache = new Map();

  const fetchUnitData = async (unitId) => {
    if (!unitId) return null;
    if (unitCache.has(unitId)) return unitCache.get(unitId);
    const unitObject = await Unit.findById(unitId);
    const unitData = await transformationUnit(unitObject);
    const unitInfo = {
      unitId: unitData._id,
      name: unitData.name,
      maxNumber: unitData.maxNumber,
    };
    unitCache.set(unitId, unitInfo);
    return unitInfo;
  };

  const fetchCategoryData = async (categoryId) => {
    if (categoryCache.has(categoryId)) return categoryCache.get(categoryId);
    const categoryObject = await Category.findById(categoryId);
    const categoryData = await transformationCategory(categoryObject);
    const categoryInfo = {
      name: categoryData.name,
      image: categoryData.image ?? null,
    };
    categoryCache.set(categoryId, categoryInfo);
    return categoryInfo;
  };

  const fetchSubCategoryData = async (subCategoryId) => {
    if (subCategoryCache.has(subCategoryId))
      return subCategoryCache.get(subCategoryId);
    const subCategoryObject = await SubCategory.findById(subCategoryId);
    const subCategoryData = await transformationSubCategory(subCategoryObject);
    const subCategoryInfo = {
      name: subCategoryData.name,
      image: subCategoryData.image ?? null,
    };
    subCategoryCache.set(subCategoryId, subCategoryInfo);
    return subCategoryInfo;
  };

  const fetchSubUnitData = async (subUnitId) => {
    if (subUnitCache.has(subUnitId)) return subUnitCache.get(subUnitId);
    const subUnitObject = await SubUnit.findById(subUnitId);
    const subUnitData = await transformationSubUnit(subUnitObject);
    const subUnitInfo = {
      subUnitId: subUnitData._id,
      name: subUnitData.name,
    };
    subUnitCache.set(subUnitId, subUnitInfo);
    return subUnitInfo;
  };

  const fetchProductData = async (productId) => {
    if (productCache.has(productId)) return productCache.get(productId);
    const supplierProduct = await SupplierProduct.findById(productId);
    const productData = await transformationSupplierProduct(supplierProduct);
    productCache.set(productId, productData);
    return productData;
  };

  const formatProduct = async (product) => {
    const productData = await fetchProductData(product.product);
    return {
      product: product.product,
      quantity: product.quantity,
      productWeight: product.productWeight,
      productAdminId: productData.productAdminId,
      title: productData.title,
      price: productData.price,
      afterSale: productData.afterSale ?? null,
      images: productData.images ?? [],
      minLimit: productData.minLimit ?? null,
      maxLimit: productData.maxLimit ?? null,
      supplierId: productData.supplierId,
      desc: productData.desc,
      weight: productData.weight,
      unit: await fetchUnitData(productData.unit?._id),
      subUnit: await fetchSubUnitData(productData.subUnit?._id),
      stock: productData.stock,
      maxNumber: productData.maxNumber ?? null,
      supplierType: productData.supplierType,
      category: await fetchCategoryData(productData.category),
      subCategory: await fetchSubCategoryData(productData.subCategory),
    };
  };

  const formatOfferProduct = async (product) => {
    const productData = await fetchProductData(product.productId);
    return {
      product: productData._id,
      title: productData.title,
      price: productData.price,
      afterSale: productData.afterSale ?? null,
      images: productData.images ?? [],
      minLimit: productData.minLimit ?? null,
      maxLimit: productData.maxLimit ?? null,
      supplierId: productData.supplierId,
      desc: productData.desc,
      unit: await fetchUnitData(productData.unit?._id),
      subUnit: await fetchSubUnitData(productData.subUnit?._id),
      stock: productData.stock,
      maxNumber: productData.maxNumber ?? null,
      supplierType: productData.supplierType,
      quantity: productData.quantity,
      weight: productData.weight,
      category: await fetchCategoryData(productData.category),
      subCategory: await fetchSubCategoryData(productData.subCategory),
    };
  };

  const formatOffer = async (offer) => {
    const offerObject = await Offer.findById(offer.offer);
    const offerData = await transformationOffer(offerObject, offer.quantity);
    const formattedProducts = await Promise.all(
      offerData.products.map(formatOfferProduct)
    );
    return {
      offer: offer.offer,
      quantity: offer.quantity,
      offerWeight: offer.offerWeight,
      supplierId: offerData.supplierId,
      title: offerData.title,
      image: offerData.image ?? null,
      price: offerData.price,
      afterSale: offerData.afterSale ?? null,
      minLimit: offerData.minLimit ?? null,
      maxLimit: offerData.maxLimit ?? null,
      stock: offerData.stock,
      desc: offerData.desc,
      products: formattedProducts,
    };
  };

  const products = await Promise.all(orderData.products.map(formatProduct));
  const offers = await Promise.all(orderData.offers.map(formatOffer));
  return { products, offers };
}

/******************************************* check products and offers in stock *******************************************/
async function checkStockQuantity(res, products, offers) {
  const productIds = products.map((p) => p.product);
  const offerIds = offers.map((o) => o.offer);

  const supplierProducts = await SupplierProduct.find({
    _id: { $in: productIds },
  });
  const offersData = await Offer.find({ _id: { $in: offerIds } });

  const productMap = new Map();
  const offerMap = new Map();
  supplierProducts.forEach((sp) => productMap.set(sp._id.toString(), sp));
  offersData.forEach((offer) => offerMap.set(offer._id.toString(), offer));

  const totalQuantities = new Map();

  for (const product of products) {
    const supplierProduct = productMap.get(product.product.toString());
    if (!supplierProduct || supplierProduct.stock < product.quantity) {
      const prod = await Product.findById(supplierProduct.productId);
      console.log("---------------1---------------");
      res.status(220).json({
        status: "fail",
        message: prod.title, // `Product with title ${prod.title} is not available or out of stock`,
      });
      throw new Error("Product out of stock");
    }

    // Update total quantities map
    if (totalQuantities.has(product.product.toString())) {
      totalQuantities.set(
        product.product.toString(),
        totalQuantities.get(product.product.toString()) + product.quantity
      );
    } else {
      totalQuantities.set(product.product.toString(), product.quantity);
    }
  }

  for (const offer of offers) {
    const offerData = offerMap.get(offer.offer.toString());
    if (!offerData || offerData.stock < offer.quantity) {
      console.log("---------------2---------------");
      res.status(221).json({
        status: "fail",
        message: offerData.title, // `Offer with title ${offerData.title} is not available or out of stock`,
      });
      throw new Error("Offer out of stock");
    }

    for (const iterProduct of offerData.products) {
      let sp = productMap.get(iterProduct.productId.toString());
      if (!sp) {
        sp = await SupplierProduct.findById(iterProduct.productId);
        if (sp) {
          productMap.set(sp._id.toString(), sp);
        }
      }

      if (!sp || sp.stock < iterProduct.quantity * offer.quantity) {
        const prod = await Product.findById(sp.productId);
        console.log("---------------3---------------");
        res.status(222).json({
          status: "fail",
          message: prod.title, // `Product with title ${prod.title} in offer ${offerData.title} is not available or out of stock`,
        });
        throw new Error("Product in offer out of stock");
      }

      // Update total quantities map
      const totalQuantity = iterProduct.quantity * offer.quantity;
      if (totalQuantities.has(iterProduct.productId.toString())) {
        totalQuantities.set(
          iterProduct.productId.toString(),
          totalQuantities.get(iterProduct.productId.toString()) + totalQuantity
        );
      } else {
        totalQuantities.set(iterProduct.productId.toString(), totalQuantity);
      }
    }
  }

  for (const [productId, totalQuantity] of totalQuantities.entries()) {
    // Check total quantities against stock
    const supplierProduct = productMap.get(productId);
    if (supplierProduct.stock < totalQuantity) {
      const prod = await Product.findById(supplierProduct.productId);
      console.log("---------------4---------------");
      res.status(220).json({
        status: "fail",
        message: prod.title, // `Product with title ${prod.title} is not available or out of stock`,
      });
      throw new Error("Product out of stock");
    }
  }

  await Promise.all(
    products.map(async (product) => {
      const supplierProduct = productMap.get(product.product.toString());
      supplierProduct.stock -= product.quantity;
      await supplierProduct.save();
    })
  );

  await Promise.all(
    offers.map(async (offer) => {
      const offerData = offerMap.get(offer.offer.toString());
      offerData.stock -= offer.quantity;
      await offerData.save();

      await Promise.all(
        offerData.products.map(async (iterProduct) => {
          const sp = productMap.get(iterProduct.productId.toString());
          sp.stock -= iterProduct.quantity * offer.quantity;
          await sp.save();
        })
      );
    })
  );
}

/******************************* Different Quantity for products and offers in Change Order *******************************/
function getDifferentQuantity(order) {
  const quantityProductMap = new Map();
  const quantityOfferMap = new Map();
  order.beforeEditedProducts.forEach((item) =>
    quantityProductMap.set(`product_${item.product.toString()}`, item.quantity)
  );
  order.beforeEditedOffers.forEach((item) =>
    quantityOfferMap.set(`offer_${item.offer.toString()}`, item.quantity)
  );

  const adjustQuantities = (items, quantityMap, type) => {
    return items.map((item) => {
      const key =
        type === "product"
          ? `product_${item.product.toString()}`
          : `offer_${item.offer.toString()}`;
      const quantityInOld = quantityMap.get(key) || 0;
      const { __parentArray, ...rest } = item;
      return {
        ...rest,
        quantity: item.quantity - quantityInOld,
      };
    });
  };

  const differentQuantityProducts = adjustQuantities(
    order.products,
    quantityProductMap,
    "product"
  );
  const differentQuantityOffers = adjustQuantities(
    order.offers,
    quantityOfferMap,
    "offer"
  );
  return { differentQuantityProducts, differentQuantityOffers };
}

// async function formatProductsAndOffers(orderData) {
//   return {
//     products: await Promise.all(
//       orderData.products.map(async (product) => {
//         const supplierProduct = await SupplierProduct.findById(product.product);
//         const productData = await transformationSupplierProduct(supplierProduct);
//         return {
//           product: product.product,
//           quantity: product.quantity,
//           productWeight: product.productWeight,

//           productAdminId: productData.productAdminId,
//           title: productData.title,
//           price: productData.price,
//           afterSale: productData.afterSale ?? null,
//           images: productData.images ?? [],
//           minLimit: productData.minLimit ?? null,
//           maxLimit: productData.maxLimit ?? null,
//           supplierId: productData.supplierId,
//           desc: productData.desc,
//           weight: productData.weight,
//           unit: productData.unit ? await (async () => {
//             const unitObject = await Unit.findById(productData.unit._id);
//             const unitData = await transformationUnit(unitObject);
//             return {
//               unitId: unitData._id,
//               name: unitData.name,
//               maxNumber: unitData.maxNumber,
//             };
//           })() : null,
//           subUnit: await (async () => {
//             const subUnitObject = await SubUnit.findById(productData.subUnit._id);
//             const subUnitData = await transformationSubUnit(subUnitObject);
//             return {
//               subUnitId: subUnitData._id,
//               name: subUnitData.name,
//             };
//           })(),
//           stock: productData.stock,
//           maxNumber: productData.maxNumber ?? null,
//           supplierType: productData.supplierType,
//           category: await (async () => {
//             const categoryObject = await Category.findById(productData.category);
//             const categoryData = await transformationCategory(categoryObject);
//             return {
//               name: categoryData.name,
//               image: categoryData.image ?? null,
//             };
//           })(),
//           subCategory: await (async () => {
//             const subCategoryObject = await SubCategory.findById(productData.subCategory);
//             const subCategoryData = await transformationSubCategory(subCategoryObject);
//             return {
//               name: subCategoryData.name,
//               image: subCategoryData.image ?? null,
//             };
//           })(),
//         };
//       })
//     ),
//     offers: await Promise.all(
//       orderData.offers.map(async (offer) => {
//         const offerObject = await Offer.findById(offer.offer);
//         const offerData = await transformationOffer(
//           offerObject,
//           offer.quantity
//         );
//         return {
//           offer: offer.offer,
//           quantity: offer.quantity,
//           offerWeight: offer.offerWeight,

//           supplierId: offerData.supplierId,
//           title: offerData.title,
//           image: offerData.image ?? null,
//           price: offerData.price,
//           afterSale: offerData.afterSale ?? null,
//           minLimit: offerData.minLimit ?? null,
//           maxLimit: offerData.maxLimit ?? null,
//           stock: offerData.stock,
//           desc: offerData.desc,
//           products: await Promise.all(
//             offerData.products.map(async (product) => {
//               const supplierProduct = await SupplierProduct.findById(product.productId);
//               const productData = await transformationSupplierProduct(supplierProduct, product.quantity);
//               return {
//                 product: productData._id,
//                 title: productData.title,
//                 price: productData.price,
//                 afterSale: productData.afterSale ?? null,
//                 images: productData.images ?? [],
//                 minLimit: productData.minLimit ?? null,
//                 maxLimit: productData.maxLimit ?? null,
//                 supplierId: productData.supplierId,
//                 desc: productData.desc,
//                 unit: productData.unit ? await (async () => {
//                   const unitObject = await Unit.findById(productData.unit._id);
//                   const unitData = await transformationUnit(unitObject);
//                   return {
//                     unitId: unitData._id,
//                     name: unitData.name,
//                     maxNumber: unitData.maxNumber,
//                   };
//                 })() : null,
//                 subUnit: await (async () => {
//                   const subUnitObject = await SubUnit.findById(productData.subUnit._id);
//                   const subUnitData = await transformationSubUnit(subUnitObject);
//                   return {
//                     subUnitId: subUnitData._id,
//                     name: subUnitData.name,
//                   };
//                 })(),
//                 stock: productData.stock,
//                 maxNumber: productData.maxNumber ?? null,
//                 supplierType: productData.supplierType,
//                 quantity: productData.quantity,
//                 weight: productData.weight,
//                 category: await (async () => {
//                   const categoryObject = await Category.findById(productData.category);
//                   const categoryData = await transformationCategory(categoryObject);
//                   return {
//                     name: categoryData.name,
//                     image: categoryData.image ?? null,
//                   };
//                 })(),
//                 subCategory: await (async () => {
//                   const subCategoryObject = await SubCategory.findById(productData.subCategory);
//                   const subCategoryData = await transformationSubCategory(subCategoryObject);
//                   return {
//                     name: subCategoryData.name,
//                     image: subCategoryData.image ?? null,
//                   };
//                 })(),
//               };
//             })
//           ),
//         };
//       })
//     ),
//   };
// }
