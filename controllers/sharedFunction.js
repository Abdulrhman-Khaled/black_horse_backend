import Product from "../models/productSchema.js";
import Customer from "../models/customerSchema.js";
import Rating from "../models/ratingSchema.js";
import Supplier from "../models/supplierSchema.js";
import { transformationProduct } from "../format/transformationObject.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import SupplierProduct from "../models/supplierProductSchema.js";
import Offer from "../models/offerSchema.js";


export const calcAvgRating = async (userId, isCustomer) => {
  if (isCustomer) {
    // If the user is a customer
    const supplier = await Supplier.findById(userId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    const ratings = await Rating.find({
      supplierId: userId,
      userType: "customer",
    });
    const totalRating = ratings.reduce((sum, rating) => sum + rating.rate, 0);
    supplier.averageRating =
      ratings.length > 0 ? totalRating / ratings.length : 0;
    await supplier.save();
  } else {
    // If the user is a supplier
    const customer = await Customer.findById(userId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    const ratings = await Rating.find({
      customerId: userId,
      userType: "supplier",
    });
    const totalRating = ratings.reduce((sum, rating) => sum + rating.rate, 0);
    customer.averageRating = ratings.length > 0 ? totalRating / ratings.length : 0;
    await customer.save();
  }
};

export const storage = (folderName) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(`upload/${folderName}`, { recursive: true });
      cb(null, `upload/${folderName}`);
    },
    filename: (req, file, cb) => {
      cb(
        null,
        `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
      );
    },
  });

export const checkActiveSupplier = async (updatedSupplier) => {
  // checkActive if any required fields are empty or missing
  let status = "active"; // Assume status is active by default
  Object.entries(updatedSupplier.toObject()).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length === 0) {
      status = "inactive";
    } else if (typeof value === "string" && value.trim() === "") {
      status = "inactive";
    } else if (typeof value === "number" && isNaN(value)) {
      status = "inactive";
    }
  });
  updatedSupplier.status = status;
  await updatedSupplier.save();
  return updatedSupplier;
};

export const backProductsToSupplierStock = async (order, isBeforeEditedOrder=false) => {
  const products = isBeforeEditedOrder ? order.beforeEditedProducts : order.products;
  const offers = isBeforeEditedOrder ? order.beforeEditedOffers : order.offers;
  for (const product of products) {
    const sp = await SupplierProduct.findById(product.product);
    sp.stock += product.quantity;
    await sp.save();
  }

  for (const offer of offers) {
    const offerData = await Offer.findById(offer.offer);
    offerData.stock += offer.quantity;
    await offerData.save();

    for (const iterProduct of offerData.products) {
      const sp = await SupplierProduct.findById(iterProduct.productId);
      sp.stock += iterProduct.quantity * offer.quantity;
      await sp.save();
    }
  }
};
