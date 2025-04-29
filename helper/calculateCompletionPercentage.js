import mongoose from "mongoose";
import Order from "../models/orderSchema.js";
import Product from "../models/productSchema.js";
import SubSubCategory from "../models/subSubCategorySchema.js";

export async function calculateCompletionPercentage(supplierId) {
  const results = await Order.aggregate([
    { $match: { supplierId: new mongoose.Types.ObjectId(supplierId) } }, // Corrected usage of ObjectId
    { $group: {
      _id: "$status",
      count: { $sum: 1 }
    }}
  ]);
  const totalOrders = results.reduce((acc, curr) => acc + curr.count, 0);
  const completedOrders = results.find(result => result._id === 'complete')?.count || 0;
  return (completedOrders / totalOrders) * 100;
}
export const putSubSubCategoryInDB = async (req, res) => {
  const products = await Product.find();

  for (const product of products) {
    if (!product.subSubCategory) {
      const titleWords = product.title.split(' ');
      if (titleWords.length >= 2) {
        const secondWord = titleWords[1];
        // Set the temporarySubSubCategoryName field
        product.temporarySubSubCategoryName = secondWord;
        await product.save();
      }
    }
  }
}