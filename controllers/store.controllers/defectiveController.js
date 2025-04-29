import { transformationDefectiveProduct, transformationInventoryProduct } from '../../format/transformationObject.js';
import DefectiveInventoryProduct from '../../models/store.models/defectiveItemSchema.js';
import PurchaseItem from '../../models/store.models/purchaseItemSchema.js';
import { egyptHour } from '../../utils/balanceSheet.js';

export const getProductItemsByProductId = async (req, res) => {
  const productId = req.params.id;
  try {
    let query = {product: productId, reminderQuantity: { $gt: 0 }};
    if(req.query.inventoryId){
      query.inventoryId = req.query.inventoryId;
    }
    const purchaseItems = await PurchaseItem.find(query);
    const transformedPurchaseItems = await Promise.all(
      purchaseItems.map(async (purchaseItem) => await transformationInventoryProduct(purchaseItem))
    );
    res.status(200).json({
      status: 'success',
      data: transformedPurchaseItems,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}

export const getNearingExpiration = async (req, res) => {
  let query = {reminderQuantity: { $gt: 0 } };
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const start = new Date(new Date(req.query.startDate ?? Date.now()).getTime());
    const end = new Date(new Date(req.query.endDate ?? oneMonthFromNow).getTime() + 86400000);

    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    query.expiryDate = { $gte: start, $lte: end };

    const productItems = await PurchaseItem.find(query).sort({ expiryDate: 1 }).limit(limit).skip((page - 1) * limit).exec();
    const transformedProductItems = await Promise.all(
      productItems.map(async (productItem) => await transformationInventoryProduct(productItem))
    );
    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(await PurchaseItem.countDocuments(query) / limit),
      data: transformedProductItems,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
  
export const getDefectiveItems = async (req, res) => {
  let query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if(req.query.productId){
      query.productId = req.query.productId;
    }
    if(req.query.inventoryId){
      query.inventoryId = req.query.inventoryId;
    }
    if(req.query.startDate && req.query.endDate){
      const start = new Date(new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000);
      query.date = { $gte: start, $lte: end };
    }
    const defectiveItems = await DefectiveInventoryProduct.find(query).sort({ date: -1 }).limit(limit).skip((page - 1) * limit).exec();

    const transformedDefectiveItems = await Promise.all(
      defectiveItems.map(async (defectiveItem) => await transformationDefectiveProduct(defectiveItem))
    );

    const totalPrice = await DefectiveInventoryProduct.aggregate([
      { $match: query },
      { $addFields: { totalCost: { $multiply: ["$costPrice", "$quantity"] } } },
      { $group: { _id: null, totalPrice: { $sum: "$totalCost" } } }
    ]).exec();

    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil(await DefectiveInventoryProduct.countDocuments(query) / limit),
      data: {
        products: transformedDefectiveItems,
        totalPrice: totalPrice[0]?.totalPrice ?? 0
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}
  
export const createDefectiveItem = async (req, res) => {
  const defectiveItemData = req.body;
  try {
    const purchaseItem = await PurchaseItem.findById(defectiveItemData.productItemId);
    if(purchaseItem.reminderQuantity < defectiveItemData.quantity){
      return res.status(207).json({
        status: 'fail',
        data: `product: ${defectiveItemData.productItemId} not enough in inventory`,
      });
    }

    const defectiveItem = await DefectiveInventoryProduct.create({
      productId: purchaseItem.product,
      productItemId: defectiveItemData.productItemId,
      admin: defectiveItemData.admin,
      inventoryId: purchaseItem.inventoryId,
      quantity: defectiveItemData.quantity,
      costPrice: purchaseItem.costPrice,
      reason: defectiveItemData.reason,
    });
    await defectiveItem.save();
    purchaseItem.reminderQuantity -= defectiveItemData.quantity;
    await purchaseItem.save();
    res.status(200).json({
      status: 'success',
      data: await transformationDefectiveProduct(defectiveItem),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
}