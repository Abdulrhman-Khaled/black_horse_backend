import Group from "../models/groupSchema.js";
import Order from "../models/orderSchema.js";
import DefectiveInventoryProduct from "../models/store.models/defectiveItemSchema.js";
import PurchaseItem from "../models/store.models/purchaseItemSchema.js";
import { cancelOrReturnOrderForGroup } from "./updateOrderForGroup.js";

export const checkExpireGroup = async () => {
  try {
    const expiredGroups = await Group.find({ expireDate: { $lt: new Date() }, status: "pending" });
    await Promise.all(
      expiredGroups.map(async (group) => {
        group.status = "expired";
        const orders = await Order.find({ group: group._id });
        await Promise.all(
          orders.map(async (order) => await cancelOrReturnOrderForGroup(order._id, null, "المجموعة منتهية الصلاحية", "listener", "cancelled"))
        );
        await group.save();
      })
    );
  } catch (error) {
    console.error("Error updating expired groups:", error);
  }
};

export const checkExpireProducts = async () => {
  try {
    const purchaseItems = await PurchaseItem.find({ reminderQuantity: { $gt: 0 }, expiryDate: { $lt: new Date() } });
    for (const purchaseItem of purchaseItems) {
      await DefectiveInventoryProduct.create({
        productId: purchaseItem.product,
        productItemId: purchaseItem._id,
        inventoryId: purchaseItem.inventoryId,
        quantity: purchaseItem.reminderQuantity,
        costPrice: purchaseItem.costPrice,
        reason: "انتهاء تاريخ الصلاحية",
      });
      await purchaseItem.updateOne({ $set: { reminderQuantity: 0 } });
    }
  } catch (error) {
    console.error("Error updating expired products:", error);
  }
};