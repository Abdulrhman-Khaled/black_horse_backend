import Fee from "../models/feesSchema.js";
import Group from "../models/groupSchema.js";
import Order from "../models/orderSchema.js";
import Supplier from "../models/supplierSchema.js";
import { applyFine, applyFineGroup } from "./applyFineAndElasticOrder.js";
import { pushNotification } from "./pushNotificationAndSendSMS.js";
import { ProcessNames } from "./balanceSheet.js";
import { updateOrderForGroup } from "./updateOrderForGroup.js";


/***************************************************** order listeners *****************************************************/
export const checkPendingOrder = async () => {
  const orders = await Order.find({ status: "pending", group: { $exists: false } });
  const pendingDays = await Fee.findOne({ type: "numberOfPendingDays" });
  if(!pendingDays) return;
  const currentDate = new Date();
  for (const order of orders) {
    const orderSupplier = await Supplier.findById(order.supplierId)
    const dateForFine = await getFineDate(orderSupplier, order.updatedAt, pendingDays.amount);
    if (dateForFine < currentDate) {
      await applyFine(order, order.supplierId, "fineForPending", ProcessNames.fineForTrash);
      order.beforeTrash = "pending";
      order.status = "trash";
      await order.save();
      await pushNotification(
        "اوردر مهمل",
        ` تم تغير حالة اوردر خاص بك رقم ${order.orderNumber} من قيد الانتظار الي المهملة`,
        null,
        null,
        order.supplierId,
        null,
        orderSupplier.deviceToken
      );
    }
  }
};
export const checkInProgressOrder = async () => {
  const orders = await Order.find({ status: "inProgress", group: { $exists: false } });
  const inProgressDays = await Fee.findOne({ type: "numberOfInProgressDays" });
  if(!inProgressDays) return;
  const currentDate = new Date();
  for (const order of orders) {
    const orderSupplier = await Supplier.findById(order.supplierId)
    const dateForFine = await getFineDate(orderSupplier, order.updatedAt, inProgressDays.amount);
    if (dateForFine < currentDate) {
      await applyFine(order, order.supplierId, "fineForInProgress", ProcessNames.fineForTrash);
      order.beforeTrash = "inProgress";
      order.status = "trash";
      await order.save();
      await pushNotification(
        "اوردر مهمل",
        `تم تغير حالة اورد خاص بك رقم ${order.orderNumber} من مرحلة التجهيز الي المهملة`,
        null,
        null,
        order.supplierId,
        null,
        orderSupplier.deviceToken
      );
    }
  }
}
export const checkOnDeliveryOrder = async () => {
  const orders = await Order.find({ status: "delivery", group: { $exists: false } });
  const onDeliveryDays = await Fee.findOne({ type: "numberOfOnDeliveryDays" });
  if(!onDeliveryDays) return;
  const currentDate = new Date();
  for (const order of orders) {
    const orderSupplier = await Supplier.findById(order.supplierId)
    const dateForFine = await getFineDate(orderSupplier, order.updatedAt, onDeliveryDays.amount);
    if (dateForFine < currentDate) {
      await applyFine(order, order.supplierId, "fineForOnDelivery", ProcessNames.fineForTrash);
      order.beforeTrash = "delivery";
      order.status = "trash";
      await order.save();
      await pushNotification(
        "اوردر مهمل",
        `تم تغير حالة اورد خاص بك رقم ${order.orderNumber} من مرحلة التوصيل الي المهملة`,
        null,
        null,
        order.supplierId,
        null,
        orderSupplier.deviceToken
      );
    }
  }
}

// export const checkEditedOrders = async () => {
//   const orders = await Order.find({ status: "edited", group: { $exists: false } });
//   const onDeliveryDays = await Fee.findOne({ type: "numberOfOnDeliveryDays" });
//   if(!onDeliveryDays) return;
//   const currentDate = new Date();
//   for (const order of orders) {
//     const orderSupplier = await Supplier.findById(order.supplierId)
//     const dateForFine = await getFineDate(orderSupplier, order.updatedAt, onDeliveryDays.amount);
//     if (dateForFine < currentDate) {
//       await applyFine(order, order.supplierId, "fineForOnDelivery", ProcessNames.fineForTrash);
//       order.beforeTrash = "edited";
//       order.status = "trash";
//       await order.save();
//       await pushNotification(
//         "اوردر مهمل",
//         `تم تغير حالة اورد خاص بك رقم ${order.orderNumber} من مرحلة اوردر معدل الي المهملة`,
//         null,
//         null,
//         order.supplierId,
//         null,
//         orderSupplier.deviceToken
//       );
//     }
//   }
// }

/***************************************************** group listeners *****************************************************/
export const checkCompleteGroup = async () => {
  const groups = await Group.find({ status: "complete" });
  const completeGroupDays = await Fee.findOne({ type: "numberOfCompleteGroupDays" });
  if(!completeGroupDays) return;
  const currentDate = new Date();
  for (const group of groups) {
    const groupSupplier = await Supplier.findById(group.supplierId)
    const dateForFine = await getFineDate(groupSupplier, group.updatedAt, completeGroupDays.amount);
    if (dateForFine < currentDate) {
      await applyFineGroup(group, group.supplierId, "fineForCompleteGroup", ProcessNames.fineForTrash)
      const ordersForGroup = await Order.find({ group: group._id, control: "supplier" })
      await Promise.all(
        ordersForGroup.map(async (order) => await updateOrderForGroup(order._id, "trash", "complete"))
      );
      group.beforeTrash = "complete";
      group.status = "trash";
      await group.save();
      await pushNotification(
        "مجموعة مهمله",
        `تم تغير حالة المجموعة الخاصه رقم ${group.groupNumber} بك من قيد الانتظار الي المهملة`,
        null,
        null,
        group.supplierId,
        null,
        groupSupplier.deviceToken
      );
    }
  }
}
export const checkInProgressGroup = async ()=>{
  const groups = await Group.find({ status: "inProgress" })
  const inProgressGroupDays = await Fee.findOne({ type: "numberOfInProgressDays" })
  if(!inProgressGroupDays) return;
  const currentDate = new Date();
  for (const group of groups) {
    const groupSupplier = await Supplier.findById(group.supplierId)
    const dateForFine = await getFineDate(groupSupplier, group.updatedAt, inProgressGroupDays.amount);
    if (dateForFine < currentDate) {
      await applyFineGroup(group, group.supplierId, "fineForInProgress", ProcessNames.fineForTrash);
      const ordersForGroup = await Order.find({ group: group._id, control: "supplier" })
      await Promise.all(
        ordersForGroup.map(async (order) => await updateOrderForGroup(order._id, "trash", "inProgress"))
      );
      group.beforeTrash = "inProgress";
      group.status = "trash";
      await group.save();
      await pushNotification(
        "مجموعة مهمله",
        `تم تغير حالة المجموعة الخاصه رقم ${group.groupNumber} بك من مرحلة التجهيز الي المهملة`,
        null,
        null,
        group.supplierId,
        null,
        groupSupplier.deviceToken
      );
    }
  }
}
export const checkOnDeliveryGroup = async ()=>{
  const groups = await Group.find({status: "delivery"})
  const onDeliveryGroupDays = await Fee.findOne({ type: "numberOfOnDeliveryDays" })
  if(!onDeliveryGroupDays) return;
  const currentDate = new Date();
  for (const group of groups) {
    const groupSupplier = await Supplier.findById(group.supplierId)
    const dateForFine = await getFineDate(groupSupplier, group.updatedAt, onDeliveryGroupDays.amount);
    if (dateForFine < currentDate) {
      await applyFineGroup(group, group.supplierId, "fineForOnDelivery", ProcessNames.fineForTrash)
      const ordersForGroup = await Order.find({ group: group._id, control: "supplier" })
      await Promise.all(
        ordersForGroup.map(async (order) => await updateOrderForGroup(order._id, "trash", "delivery"))
      );
      group.beforeTrash = "delivery";
      group.status = "trash";
      await group.save();
      await pushNotification(
        "مجموعة مهمله",
        `تم تغير حالة المجموعة الخاصه بك رقم ${group.groupNumber} من مرحلة التوصيل الي المهملة`, 
        null,
        null,
        group.supplierId,
        null,
        groupSupplier.deviceToken
      );
    }
  }
}

/***************************************************** Helper Functions *****************************************************/
export const getFineDate = async (supplier, lastOrderDate, numberOfDays) => {
  const workingDays = supplier.workingDays ?? [];
  const fineDate = new Date(lastOrderDate);

  if(workingDays.length === 0) {
    fineDate.setDate(fineDate.getDate() + 30);
  } else {
    for (let i = 0; i <= numberOfDays;) {
      fineDate.setDate(fineDate.getDate() + 1);
      if (workingDays.includes(getDayName(fineDate.getDay()))) {
        i++; // Increment counter only on working days
      }
    }
    fineDate.setDate(fineDate.getDate() + 1);
  }

  return fineDate;
};

function getDayName(dayIndex) {
  const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  return days[dayIndex];
}

export const calculateDeliveryDate = async (supplier, order) => {
  try {
    const orderDate = new Date(order);
    
    const orderDay = orderDate.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, ...)
    const deliveryDays = supplier.deliveryDaysNumber;
    
    let remainingDeliveryDays = deliveryDays;
    let i = 0;
    let currentDay = orderDay;
    let deliveryDate = new Date(order); // Start with the order date

    // Loop through the days until all delivery days are accounted for
    while (remainingDeliveryDays > 0) {
      currentDay = (orderDay + i) % 7; // Ensure the index wraps around to the beginning of the week
      if (supplier.workingDays.includes(getDayName(currentDay))) {
        remainingDeliveryDays--;
        // If there are remaining delivery days after the current day, add them to the delivery date
        if (remainingDeliveryDays > 0) {
          deliveryDate.setDate(deliveryDate.getDate() + 1);
        }
      }
      i++;
    }
    // Calculate delivery time based on remaining working hours
    const workingHours = supplier.workingHours[1]- supplier.workingHours[0];
    const remainingHours = deliveryDays * workingHours;
    deliveryDate.setHours(deliveryDate.getHours() + remainingHours);
    
    return deliveryDate;
  } catch (error) {
    console.error("Error calculating delivery date:", error.message);
  }
};
