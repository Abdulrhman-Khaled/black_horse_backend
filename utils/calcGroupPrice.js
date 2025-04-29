import Order from "../models/orderSchema.js";

export const calcGroupPrice = async (groupId) => {
  try {
    const orders = await Order.find({group:groupId});
    const groupTotalPrice = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    return groupTotalPrice;
  } catch (error) {
    throw new Error("Error calculating group price: " + error.message);
  }
}