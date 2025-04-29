import Order from "../models/orderSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import { transformationFineOrder } from "../format/transformationObject.js";
import SupplierFine from "../models/supplierFineSchema.js";
import Supplier from "../models/supplierSchema.js";
import Group from "../models/groupSchema.js";
import DeletedProduct from "../models/deletedProductSchema.js";
import { egyptHour } from "../utils/balanceSheet.js";

export const rateOfStatistics = async (req, res) => {
  const supplierId = req.params.id;
  const { startDate, endDate } = req.query;
  try {
    const supplier = await Supplier.findById(supplierId);
    let filter = { supplierId: supplierId };
    if (startDate && endDate) {
      const start = new Date(new Date(startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(endDate).getTime() - egyptHour * 60 * 60 * 1000);
      filter.createdAt = { $gte: start, $lte: end };
    }

    // Count total orders
    const orders = await Order.find({ status: "complete", ...filter });
    const orderCancelled = await Order.countDocuments({ status: "cancelled", ...filter });
    const orderTrash = await Order.countDocuments({ status: "trash", ...filter });
    const totalReturned = await Order.countDocuments({ status: "returned", ...filter });
    const totalCompletedOrders = await Order.countDocuments({ status: "complete", ...filter });
    const totalOrders = await Order.countDocuments(filter);

    // Count products and deleted products
    const totalProducts = await SupplierProduct.countDocuments(filter);
    const uniqueDeletedProducts = await DeletedProduct.distinct('productId', filter);
    const deletedProducts = uniqueDeletedProducts.length;

    const totalProductsWithoutFilterDate = await SupplierProduct.countDocuments({ supplierId });
    const uniqueDeletedProductsWithoutFilterDate = await DeletedProduct.distinct('productId', { supplierId });
    const deletedProductsWithoutFilterDate = uniqueDeletedProductsWithoutFilterDate.length;

    // Calculate rates
    const completedRate = totalOrders === 0 ? 0 : (totalCompletedOrders / totalOrders) * 100 || 0;
    const cancellationRate = totalOrders === 0 ? 0 : (orderCancelled / totalOrders) * 100 || 0;
    const trashRate = totalOrders === 0 ? 0 : (orderTrash / totalOrders) * 100 || 0;
    const removalRate = (totalProductsWithoutFilterDate + deletedProductsWithoutFilterDate) === 0 ? 0 : (deletedProducts / (totalProductsWithoutFilterDate + deletedProductsWithoutFilterDate)) * 100 || 0;
    const losingRate = totalOrders === 0 ? 0 : (orderTrash + orderCancelled + totalReturned)/totalOrders * 100 || 0;
    
    // Calculate average order price and total price
    let totalPriceForOrder = 0;
    for (const order of orders) {
      totalPriceForOrder += order.totalPrice;
    }
    const averageOrderPrice = totalCompletedOrders === 0 ? 0 : totalPriceForOrder / totalCompletedOrders;
    const totalPrice = totalPriceForOrder || 0;

    // Calculate customer count per supplier
    const uniqueCustomers = new Set(
      orders.map((order) => order.customerId.toString())
    );
    const numberOfCustomers = uniqueCustomers.size ?? 0;

    res.status(200).json({
      status: "success",
      data: {
        cancellationRate,
        trashRate,
        removalRate,
        completedRate,
        numberOfCustomers,
        averageOrderPrice,
        totalPrice,
        rating: supplier.averageRating,
        losingRate,
        totalSupplierProduct: totalProducts
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllFine = async (req, res) => {
  const supplierId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    let query = { supplierId };
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000);
      query.createdAt = { $gte: start, $lte: end };
    }
    let orderIds = [];
    let groupIds = [];

    if (req.query.orderStatus) {
      const ordersWithStatus = await Order.find({ status: req.query.orderStatus });
      orderIds = ordersWithStatus.map((order) => order._id);
    }

    if (req.query.orderStatus) {
      const groupsWithStatus = await Group.find({ status: req.query.orderStatus });
      groupIds = groupsWithStatus.map((group) => group._id);
    }
    // Merge orderIds and groupIds
    const mergedIds = [...orderIds, ...groupIds];
    
    // Add merged IDs to the query
    if (mergedIds.length > 0) {
      query.$or = [
        { order: { $in: mergedIds } },
        { group: { $in: mergedIds } },
      ];
    }

    if (req.query.fineType) {
      query.typeOfFine = req.query.fineType;
    }

    const supplierFines = await SupplierFine.find(query).populate("order").sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).exec(); // Populate 'order' field
    const transformationFineOrders = await Promise.all(
      supplierFines.map(async supplierFine => await transformationFineOrder(supplierFine))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await SupplierFine.countDocuments(query) / limit),
      data: transformationFineOrders,
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
