import { validationResult } from "express-validator";
import { transformationGroup } from "../format/transformationObject.js";
import Customer from "../models/customerSchema.js";
import DeliveryBoy from "../models/deliveryBoySchema.js";
import Group from "../models/groupSchema.js";
import Offer from "../models/offerSchema.js";
import Order from "../models/orderSchema.js";
import Product from "../models/productSchema.js";
import ReasonOfCancelOrReturn from "../models/reasonOfCancelOrReturnSchema.js";
import Region from "../models/regionSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import Supplier from "../models/supplierSchema.js";
import { applyFineGroup } from "../utils/applyFineAndElasticOrder.js";
import { egyptHour } from "../utils/balanceSheet.js";
import { calculateDeliveryDate } from "../utils/checkPendingInProgressOrder.js";
import { pushNotification } from "../utils/pushNotificationAndSendSMS.js";
import { cancelOrReturnOrderForGroup, updateOrderForGroup } from "../utils/updateOrderForGroup.js";
import SubRegion from "../models/subRegionSchema.js";

export const createGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const region = req.body.region;
  const subRegion = req.body.subRegion;
  const supplierId = req.body.supplierId;
  let regionData = null;
  let subRegionData = null;
  try {
    const supplier = await Supplier.findById(supplierId);
    if(region !== null){
      regionData = await Region.findOne({ name: region });
      subRegionData = await SubRegion.findOne({ name: subRegion, regionId: regionData._id });

      const regionExists = supplier.deliveryRegion.some(
        (r) => r._id.toString() === regionData._id.toString()
      );
      if(!regionExists){
        return res.status(404).json({
          status: "fail",
          message: `Region: ${regionData.name} Not Found For Supplier`,
        });
      }

      const subRegionExists = supplier.deliveryRegion.some(
        (r) => r.subRegions.some((s) => s._id.toString() === subRegionData._id.toString())
      );
      if(!subRegionExists){
        return res.status(404).json({
          status: "fail",
          message: `SubRegion: ${subRegionData.name} Not Found For Supplier`,
        });
      }
    }

    const group = await Group.findOne({ 
      status: "pending",
      region: regionData ? regionData._id : null, 
      subRegion: subRegionData ? subRegionData._id : null, 
      supplierId, 
    });
    if (group) {
      return res.status(400).json({
        status: "fail",
        message: "Group already exists",
      });
    }
   
    const newGroup = new Group({
      region: regionData ? regionData._id : null,
      subRegion: subRegionData ? subRegionData._id : null,
      supplierId: supplierId,
      minOrderPrice: supplier.minOrderPrice,
    });
    await newGroup.save();
    res.status(201).json({
      status: "success",
      data: await transformationGroup(newGroup),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllGroupForAdmin = async (req, res) => {
  const queryConditions = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if (req.query.groupNumber) {
      queryConditions.groupNumber = req.query.groupNumber.trim();
    }
    // if (req.query.supplierName) {
    //   const supplierNameLowerCase = req.query.supplierName.trim().toLowerCase();
    //   queryConditions.supplierName = { $regex: new RegExp(supplierNameLowerCase, 'i') };
    // }
    if (req.query.day) {
      const startDate = new Date(req.query.day.split('T')[0]);
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const start = new Date(new Date(startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(nextDay).getTime() - egyptHour * 60 * 60 * 1000);
      queryConditions.createdAt = { $gte: start, $lte: end };
    }
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000);
      queryConditions.createdAt = { $gte: start, $lte: end };
    }

    const groups = await Group.find(queryConditions).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).exec();
    const transformationGroups = await Promise.all(
      groups.map(async (group) => await transformationGroup(group))
    )
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await Group.countDocuments(queryConditions) / limit),
      data: transformationGroups,
    })
  } catch (error) {
    res.status(500).json({
      status:"fail",
      message:error.message
    })
  }
};
export const updateGroup = async (req, res) => {
  const groupId = req.params.id;
  const groupStatus = req.body.status;
  const deliveryBoy = req.body.deliveryBoy;
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: "fail",
        message: "No Group Found By This Id",
      });
    }

    const orders = await Order.find({ group: groupId, control: 'supplier' }).sort({ createdAt: -1 });
    if (deliveryBoy) {
      group.deliveryBoy = deliveryBoy;
      await Promise.all(
        orders.map(async (order) => {
          await updateOrderForGroup(order._id, deliveryBoy);
        })
      )
    }
    if (groupStatus === "completed") {
      group.status = "completed";
      for (const order of orders){
        await updateOrderForGroup(order._id, "completed");
      }
    } else if (groupStatus === "supplierCompleted") {
      group.status = "supplierCompleted";
      for (const order of orders){
        await updateOrderForGroup(order._id, "supplierCompleted");
      }
    } else if(groupStatus === 'delivery'){
      group.status = "delivery";
      const ordersHaveSameStatusAsGroup = orders.filter((order) => order.status === 'inProgress');
      for (const order of ordersHaveSameStatusAsGroup){
        await updateOrderForGroup(order._id, "delivery");
      }
    } else if(groupStatus === 'delivered'){
      group.status = "delivered";
      for (const order of orders){
        await updateOrderForGroup(order._id, "delivered");
      }
    } else if(groupStatus === 'complete'){
      group.status = "complete";
      for (const order of orders){
        await updateOrderForGroup(order._id, "complete");
      }
    } else if(groupStatus === 'trash'){
      const beforeTrash = group.status;
      group.status = "trash";
      group.beforeTrash = beforeTrash;
      for (const order of orders){
        await updateOrderForGroup(order._id, "trash", beforeTrash);
      }
    } else if (groupStatus === "inProgress") {
      const productsMap = new Map();
      const ordersHaveSameStatusAsGroup = orders.filter((order) => order.status === 'pending');

      for(const order of ordersHaveSameStatusAsGroup){
        const products = order.products;
        const offers = order.offers;
        for (const product of products) {
          const supplierProduct = await SupplierProduct.findById(product.product);
          if (!supplierProduct || supplierProduct.stock < product.quantity) { // check quantity of products
            const prod = await Product.findById(supplierProduct.productId);
            return res.status(220).json({
              status: "fail",
              message: prod.title // `Product with title ${prod.title} is not available or out of stock`,
            });
          }
  
          if (productsMap.has(product.product.toString())) {
            productsMap.set(product.product.toString(), productsMap.get(product.product.toString()) + product.quantity);
          } else {
            productsMap.set(product.product.toString(), product.quantity);
          }
        }
  
        for (const offer of offers) {
          const offerData = await Offer.findById(offer.offer); // offer quantity available in stock
          if (!offerData || offerData.stock < offer.quantity) {
            return res.status(221).json({
              status: "fail",
              message: offerData.title // `Offer with title ${offerData.title} is not available or out of stock`,
            });
          }
  
          for (const iterProduct of offerData.products) { // check products in offer available in stock
            const sp = await SupplierProduct.findById(iterProduct.productId);
            if (!sp || sp.stock < iterProduct.quantity) {
              const prod = await Product.findById(sp.productId);
              return res.status(222).json({
                status: "fail",
                message: prod.title // `Product with title ${prod.title} in offer ${offerData.title} is not available or out of stock`,
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
      }
     
      for (const [key, value] of productsMap.entries()) { // check total quantity of products available in supplier stock
        const supplierProduct = await SupplierProduct.findById(key);
        if (supplierProduct.stock < value) {
          const prod = await Product.findById(supplierProduct.productId);
          return res.status(220).json({
            status: "fail",
            message: prod.title // `Product with title ${prod.title} is not available or out of stock`,
          });
        }
      }

      for (const order of orders) {
        const products = order.products;
        const offers = order.offers;
        for (const product of products) { // decrement products
          const supplierProduct = await SupplierProduct.findById(product.product);
          supplierProduct.stock -= product.quantity;
          await supplierProduct.save();
        }

        for (const offer of offers) { // decrement offers
          const offerData = await Offer.findById(offer.offer);
          offerData.stock -= offer.quantity;
          await offerData.save();
  
          for (const iterProduct of offerData.products) { // decrement offer's product
            const sp = await SupplierProduct.findById(iterProduct.productId);
            sp.stock -= iterProduct.quantity * offer.quantity;
            await sp.save();
          }
        }
      }

      group.status = "inProgress";
      for (const order of ordersHaveSameStatusAsGroup){
        await updateOrderForGroup(order._id, "inProgress");
      }
    } else if (groupStatus === "returned") {
      const reason = await ReasonOfCancelOrReturn.findById(req.body.reasonId);   
      for (const order of orders){
        await cancelOrReturnOrderForGroup(order._id, reason ? reason._id : null, req.body.otherReason, req.headers["user-type"], "returned");
      }

      const returnedGroup = await Group.findByIdAndUpdate(req.params.id, {
        status: "returned",
        reason: reason ? {_id: reason._id, description: reason.description, type: reason.type} : null,
        otherReason: req.body.otherReason.length === 0 ? null : req.body.otherReason,
      },{ new: true });
      return res.status(200).json({
        status: "success",
        data: await transformationGroup(returnedGroup),
      });
    } else if (groupStatus === "cancelled") {
      const reason = await ReasonOfCancelOrReturn.findById(req.body.reasonId);
      if (req.headers["user-type"] === "supplier" && group.status === "complete") {
        await applyFineGroup(group, group.supplierId, "fineForCancel", req.body.otherReason.length === 0 ? reason.description : req.body.otherReason);
      }
      for (const order of orders){
        await cancelOrReturnOrderForGroup(order._id, reason ? reason._id : null, req.body.otherReason, req.headers["user-type"], "cancelled");
      }

      const cancelGroup = await Group.findByIdAndUpdate(req.params.id, {
        status: "cancelled",
        reason: reason ? {_id: reason._id, description: reason.description, type: reason.type} : null,
        otherReason: req.body.otherReason.length === 0 ? null : req.body.otherReason,
      },{ new: true });
      return res.status(200).json({
        status: "success",
        data: await transformationGroup(cancelGroup),
      });
    }

    await group.save();
    return res.status(200).json({
      status: "success",
      data: await transformationGroup(await Group.findById(groupId)),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const joinGroup = async (req, res) => {
  const groupId = req.params.id;
  const orderId = req.body.order;
  const customerId = req.body.customerId;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order Not Found",
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(406).json({
        status: "fail",
        message: "Customer Not Found",
      });
    }
    const group = await Group.findById(groupId).populate("region");
    if (!group) {
      return res.status(405).json({
        status: "fail",
        message: "Group Not Found",
      });
    }

    const supplier = await Supplier.findById(group.supplierId);
    if (group.customer.includes(customerId)) {
      return res.status(403).json({
        status: "fail",
        message: "Customer Already Joined",
      });
    }
    if (!order.supplierId.equals(group.supplierId)) {
      return res.status(403).json({
        status: "fail",
        message: "Can Not Join To This Group As Supplier Is Different",
      });
    }

    order.group = groupId;
    await order.save();
    let totalPrice = order.totalPrice;
    let totalWeight = order.orderWeight;
    group.customer.push(customerId);
    group.totalPrice += totalPrice;
    group.totalWeight += totalWeight;
    group.numberOfCustomer += 1;
    if (group.totalPrice >= group.minOrderPrice) {
      group.status = "complete";
      group.deliveryDate = await calculateDeliveryDate(supplier, new Date() + 24 * 60 * 60 * 1000);
      await pushNotification("لديك جروب جديد", `تم اكتمال جروب ف منطقة ${group.region.name} ينتظر موافقتك`, null, null, group.supplierId, null, supplier.deviceToken);
    }
    await group.save();
    res.status(200).json({
      status: "success",
      data: await transformationGroup(group),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllGroupCompleteForSupplier = async (req, res) => {
  const supplierId = req.params.id;
  const status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    let query = {supplierId};
    query.status = status ? status : {$ne:"pending"};
    const groups = await Group.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).exec();
    const transformationGroupData = await Promise.all(
      groups.map(async (group) =>  await transformationGroup(group))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await Group.countDocuments(query) / limit),
      data: transformationGroupData,
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getGroupByDelivery = async (deliveryId) => { // use socket
  const groups = await Group.find({ 
    deliveryBoy: deliveryId, 
    status: { $in: ['delivery'] } // , 'delivered'
  }).sort({ createdAt: -1 });

  return await Promise.all(
    groups.map(async (group) => await transformationGroup(group))
  );
};
export const getGroupByDeliveryRoute = async (req, res) => { // use http
  const deliveryId = req.params.deliveryId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const groups = await Group.find({ deliveryBoy: deliveryId, status: { $in: ['delivered', 'supplierCompleted', 'completed'] } }).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).exec();
    const groupByDelivery = await Promise.all(
      groups.map(async (group) => await transformationGroup(group))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await Group.countDocuments({ deliveryBoy: deliveryId, status: 'completed' }) / limit),
      data: groupByDelivery
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllGroupPending = async (req, res) => {
  let region = req.query.region;
  let subRegion = req.query.subRegion;
  const supplierId = req.query.supplierId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if(!region || region === '' || !subRegion || subRegion === '') {
    region = null;
    subRegion = null;
  } else {
    region = await Region.findOne({ name: region });
    subRegion = await SubRegion.findOne({ name: subRegion, regionId: region._id });
  }

  try {
    let query = { 
      status: "pending",
      region: region ? region._id : null,
      subRegion: subRegion ? subRegion._id : null,
      supplierId: supplierId
    };

    const groups = await Group.find(query).limit(limit).skip((page - 1) * limit).exec();
    const transformationGroupData = await Promise.all(
      groups.map(async (group) => await transformationGroup(group))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await Group.countDocuments(query) / limit),
      data: transformationGroupData
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getGroupById = async (req, res) => {
  const groupId = req.params.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        status: "fail",
        message: "Group Not Found",
      });
    }
    res.status(200).json({
      status: "success",
      data: await transformationGroup(group),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

// export const canceledGroupByCustomerId = async (req, res) => {
//   const groupId = req.params.id;
//   const customerId = req.body.customerId;
//   try {
//     const group = await Group.findOne({ _id: groupId, status: "pending" });
//     if (!group) {
//       return res.status(404).json({
//         status: "fail",
//         message: "Group Not Found",
//       });
//     }
//     const existingCustomer = group.customer.includes(customerId);
//     if (!existingCustomer) {
//       return res.status(404).json({
//         status: "fail",
//         message: "Customer Not Found",
//       });
//     }
//     group.customer = group.customer.filter((customer) => customer !== customerId);
//     group.numberOfCustomer -= 1;
//     const order = await Order.findOne({ group: groupId, customerId: customerId });
//     await cancelOrReturnOrderForGroup(order._id, null, "العميل ألغي الاوردر", "customer", "cancelled");
//     group.save();
//     res.status(200).json({
//       status: "success",
//       data: await transformationGroup(group),
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: "fail",
//       message: error.message,
//     });
//   }
// };