import Customer from "../models/customerSchema.js";
import Fee from "../models/feesSchema.js";
import Order from "../models/orderSchema.js";
import Supplier from "../models/supplierSchema.js";
import mongoose from 'mongoose'
import { pushNotification } from "./pushNotificationAndSendSMS.js";
import { backProductsToSupplierStock } from "../controllers/sharedFunction.js";
import ReasonOfCancelOrReturn from "../models/reasonOfCancelOrReturnSchema.js";
import Product from "../models/productSchema.js";
import { ProcessNames, insertBalanceSheet } from "./balanceSheet.js";
import SupplierProduct from "../models/supplierProductSchema.js";

export const updateOrderForGroup = async (orderId, updateData, beforeTrash=null) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    const supplier = await Supplier.findById(order.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    if(mongoose.Types.ObjectId.isValid(updateData)){
      order.deliveryBoy = updateData;
      await order.save();
    }
    if (updateData === "completed") {
      let fee = 0 ;
      const blackHorsePercentageProfit = await Fee.findOne({ type: "fee" });
      supplier.blackHorseFees ? fee = supplier.blackHorseFees : fee = blackHorsePercentageProfit.amount;
      order.status = "complete";
      await insertBalanceSheet(order.supplierId, ProcessNames.processComplete, order.customerName, order.orderNumber, order.totalPrice * (fee.amount / 100), 'Credit');
      supplier.wallet += order.totalPrice * (fee / 100);
      await supplier.save();
      await order.save();
      // const customer = await Customer.findById(order.customerId);
      // customer.wallet += order.totalPrice;
      // await customer.save();
      for(const prod of order.products){
        await Product.findByIdAndUpdate(prod.productAdminId, { $inc: { frequency: prod.quantity } });
        await SupplierProduct.findByIdAndUpdate(prod.product, { $inc: { frequency: prod.quantity } });
      }
    } else if (updateData === "supplierCompleted") {
      order.status = "supplierCompleted";
      await order.save();
      const customerData = await Customer.findById(order.customerId);
      await pushNotification(
        "طلب شراء مكتمل",
        `تم اكتمال مرحلة تستلم اوردر رقم ${order.orderNumber} بنجاح ننتظر موافقتك بالاستلام`,
        null,
        order.customerId,
        null,
        null,
        customerData.deviceToken
      );
    } else if (updateData === "pending" || updateData === "complete") {
      order.status = "pending";
      await order.save();
    } else if (updateData === "delivery") {
      order.status = "delivery";
      await order.save();
      const customerData = await Customer.findById(order.customerId);
      await pushNotification('تم الموافقة ع الطلب', `تم اسناد الاوردر الخاص بك رقم ${order.orderNumber} الموجود داخل الجروب الي عامل التوصيل`, null, customerData.customerId, null, null, customerData.deviceToken);
    } else if (updateData === "inProgress") {
      order.status = "inProgress";
      await order.save();
      const customer = await Customer.findById(order.customerId);
      // customer.wallet -= order.totalPrice;
      // await customer.save();
      await pushNotification("تم موافقة الطلب",  `تم الموافقة علي طلب اوردر رقم ${order.orderNumber}`, null, order.customerId, null,  null, customer.deviceToken);
    } else if (updateData === "delivered") {
      order.status = "delivered";
      await order.save();
      const customerData = await Customer.findById(order.customerId);
      await pushNotification('تم شحن الاوردر', `تم شحن الاوردر الخاص بك رقم ${order.orderNumber} داخل الجروب من قبل عامل التوصيل`, null, customerData.customerId, null, null, customerData.deviceToken);
    } else if (updateData === "trash") {
      if(beforeTrash === "inProgress"){
        order.status = "trash";
        order.beforeTrash = "inProgress";
        await order.save();
      } else if(beforeTrash === "complete" || beforeTrash === "pending"){
        order.status = "trash";
        order.beforeTrash = "pending";
        await order.save();
      } 
      // else if(beforeTrash === "willBeDelivered"){
      //   order.status = "trash";
      //   order.beforeTrash = "willBeDelivered";
      //   await order.save();
      // }
    }
  } catch (error) {
    throw error;
  }
};

export const cancelOrReturnOrderForGroup = async (orderId, reasonId, otherReason = "", userType, orderStatus) => { // orderStatus = {cancelled or returned}
  const order = await Order.findById(orderId);
  const reason = await ReasonOfCancelOrReturn.findById(reasonId);
  const validOrderStatuses = ["inProgress", "delivery", "delivered", "supplierCompleted", "complete"];
  if (validOrderStatuses.includes(order.status) || (order.status === "trash" && order.beforeTrash !== "pending")) {
    await backProductsToSupplierStock(order);
  }
  const customer = await Customer.findById(order.customerId);
  const notificationTitle = orderStatus === "cancelled" ? "الغاء اوردر!" : "ارجاع اوردر!";
  const notificationMessage = orderStatus === "cancelled" ? `تم الغاء اوردرك رقم ${order.orderNumber}` : `تم ارجاع اوردرك برقم ${order.orderNumber}`;
  await pushNotification(notificationTitle, notificationMessage, null, order.customerId, null, null, customer.deviceToken);
  await Order.findByIdAndUpdate(orderId, {
    status: orderStatus,
    reason: reason ? { _id: reason._id, description: reason.description, type: reason.type } : null,
    otherReason: otherReason.length === 0 ? null : otherReason,
    control: userType
  }, { new: true });
};
