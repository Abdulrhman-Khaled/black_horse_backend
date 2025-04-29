import mongoose from "mongoose";
import {
  transformationProduct,
  transformationReturnSale,
  transformationSale,
  transformationSaleReport
} from "../../format/transformationObject.js";
import CustomerInventory from "../../models/store.models/customerInventorySchema.js";
import DetailedAccountStatement from "../../models/store.models/detailedAccountStatementSchema.js";
import PurchaseItem from "../../models/store.models/purchaseItemSchema.js";
import SaleItem from "../../models/store.models/saleItemSchema.js";
import SaleReturn from "../../models/store.models/saleReturnSchema.js";
import Sale from "../../models/store.models/saleSchema.js";
import Unit from "../../models/unitSchema.js";
import {egyptHour} from "../../utils/balanceSheet.js";
import {validationResult} from "express-validator";
import Report from "../../models/reportSchema.js";

export const getAllSales = async (req, res) => {
  let query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if (req.query.receiptNumber) {
      query.receiptNumber = req.query.receiptNumber;
    }
    if (req.query.paymentType) {
      query.paymentType = new mongoose.Types.ObjectId(req.query.paymentType);
    }
    const sales = await Sale.find(query).sort({ date: -1 }).limit(limit).skip((page - 1) * limit).exec();
    const transformedSales = await Promise.all(
      sales.map(async (sale) => await transformationSale(sale))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil(await Sale.countDocuments(query) / limit),
      data: transformedSales,
    })
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}

export const getSaleById = async (req, res) => {
  const saleId = req.params.id;
  try {
    const sale = await Sale.findById(saleId);
    res.status(200).json({
      status: "success",
      data: await transformationSale(sale),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}

export const createSale = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const saleData = req.body;

  try {
    // جمع جميع بيانات الوحدات المتعلقة بالمنتجات في طلب واحد
    const unitIds = saleData.products.map(product => product.unit?._id).filter(Boolean);
    const units = await Unit.find({ _id: { $in: unitIds } }).lean();
    const unitMap = units.reduce((map, unit) => {
      map[unit._id] = unit;
      return map;
    }, {});

    // جمع جميع بيانات المخزون للمنتجات المطلوبة
    const productIds = saleData.products.map(product => product._id);
    const purchaseItems = await PurchaseItem.find({
      product: { $in: productIds },
      inventoryId: saleData.inventory._id,
      reminderQuantity: { $gt: 0 }
    }).sort({ expiryDate: 1 }).lean();

    // تحضير بيانات المخزون لكل منتج
    const productPurchaseMap = {};
    purchaseItems.forEach(item => {
      if (!productPurchaseMap[item.product]) {
        productPurchaseMap[item.product] = [];
      }
      productPurchaseMap[item.product].push(item);
    });

    // خطوة 1: التحقق من توفر الكمية المطلوبة
    for (const product of saleData.products) {
      const unitData = product.type === "retail" ? null : unitMap[product.unit._id];
      const unitQuantity = unitData ? unitData.maxNumber : 1;
      const requiredQuantity = product.quantity;
      const availableItems = productPurchaseMap[product._id] || [];

      let totalAvailableUnits = 0;
      availableItems.forEach(item => {
        totalAvailableUnits += Math.floor(item.reminderQuantity / unitQuantity);
      });

      if (totalAvailableUnits < requiredQuantity) {
        return res.status(207).json({
          status: "fail",
          data: `Product: ${product._id} not enough in inventory with consistent expiry dates`
        });
      }
    }

    // خطوة 2: خصم الكميات من المخزون
    let saleItemDetails = saleData.products.map(() => []); // مصفوفة لتخزين تفاصيل العناصر لكل منتج في الطلب
    saleData.products.forEach((product, index) => {
      const unitData = product.type === "retail" ? null : unitMap[product.unit._id];
      const unitQuantity = unitData ? unitData.maxNumber : 1;
      let remainingQuantity = product.quantity;
      const availableItems = productPurchaseMap[product._id] || [];

      for (const purchaseItem of availableItems) {
        while (remainingQuantity > 0 && purchaseItem.reminderQuantity >= unitQuantity) {
          const existingBatch = saleItemDetails[index].find(item => item.expiryDate.getTime() === purchaseItem.expiryDate.getTime());
          if (existingBatch) {
            existingBatch.quantity += 1; // زيادة الكمية لكرتونة واحدة
          } else {
            saleItemDetails[index].push({
              expiryDate: purchaseItem.expiryDate,
              quantity: 1 // كرتونة واحدة
            });
          }

          purchaseItem.reminderQuantity -= unitQuantity;
          remainingQuantity -= 1;

          if (remainingQuantity === 0) break;
        }
      }
    });

    // حفظ التحديثات في المخزون دفعة واحدة
    const bulkOps = purchaseItems.map(item => ({
      updateOne: { filter: { _id: item._id }, update: { reminderQuantity: item.reminderQuantity } }
    }));
    await PurchaseItem.bulkWrite(bulkOps);

    const sale = await Sale.create({
      ...saleData,
      customerInventoryId: saleData.customerSupplierInventory ? saleData.customerSupplierInventory._id : null,
      inventoryId: saleData.inventory._id
    });

    const saleItems = saleData.products.map((product, index) => ({
      product: product._id,
      quantity: product.quantity,
      totalSubQuantity: product.type === "retail" ? product.quantity : product.quantity * unitMap[product.unit._id].maxNumber,
      salePrice: product.salePrice,
      originalPrice: {
        'gomla': product.wholesalePrice,
        'nosGomla': product.haveWholeSalePrice,
        'retail': product.retailPrice
      }[product.type],
      unit: product.unit ? product.unit._id : null,
      subUnit: product.subUnit._id,
      saleId: sale._id,
      inventoryId: saleData.inventory._id,
      type: product.type,
      saleItemDetails: saleItemDetails[index] // استخدام تفاصيل العنصر الخاصة بكل منتج
    }));

    const addedSaleItems = await SaleItem.insertMany(saleItems);
    const insertIds = [];

    for (const item of addedSaleItems) {
      if (item.originalPrice !== item.salePrice) {
        insertIds.push(item._id);
      }
    }

    if (insertIds.length) {
      await Report.create({
        table: 'sales',
        foreignKey: sale._id,
        data: insertIds
      });
    }

    if (saleData.customerSupplierInventory) {
      await DetailedAccountStatement.create({
        saleId: sale._id,
        customerInventoryId: saleData.customerSupplierInventory._id,
        credit: saleData.paidAmount,
        debit: saleData.totalAmount,
        balance: saleData.dueAmount,
        status: 'sale',
        admin: saleData.admin
      });
      await CustomerInventory.updateOne({ _id: saleData.customerSupplierInventory._id }, { $inc: { credit: saleData.paidAmount, debit: saleData.totalAmount } });
    }

    res.status(200).json({
      status: "success",
      data: await transformationSale(sale),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const deleteSale = async (req, res) => {
  const saleId = req.params.id;
  try {
    await SaleItem.deleteMany({ saleId });
    await Sale.deleteMany({_id: saleId});
    res.status(204).json({
      status: "success",
      data: "sale deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}

export const getReturnsBySaleId = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: await transformationReturnSale(sale)
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}

export const returnSale = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const saleId = req.params.id;
  const products = req.body.products;
  try {
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({
        status: 'fail',
        message: 'Sale not found'
      })
    }

    const inventoryId = sale.inventoryId;
    for(const product of products){
      const saleItemData = await SaleItem.findById(product.productItemId);
      if(product.quantity > saleItemData.quantity){
        return res.status(208).json({
          status: 'fail',
          message: `The returned quantity for product ${product.productItemId} is greater than the quantity in the sale.`
        });
      }
    }
    
    for(const product of products){
      const saleItemData = await SaleItem.findById(product.productItemId);
      const purchaseItemData = await PurchaseItem.findOne({ product: saleItemData.product, inventoryId: inventoryId, expiryDate: product.expiryDate }).sort({reminderQuantity: -1});
      purchaseItemData.reminderQuantity += product.quantity;
      await purchaseItemData.save();
    }

    let returnPrice = 0;
    let returnProductIDs = [];
    for(const product of products){
      const saleItemData = await SaleItem.findById(product.productItemId);
      saleItemData.quantity -= product.quantity;
      saleItemData.saleItemDetails.find(item => item.expiryDate.toISOString() === product.expiryDate).quantity -= product.quantity;
      returnPrice += saleItemData.salePrice * product.quantity;
      await saleItemData.save();
     
      const saleReturn = await SaleReturn.create({
        saleId: saleId,
        inventoryId: inventoryId,
        product: saleItemData.product,
        unit: saleItemData.unit ?? null,
        quantity: product.quantity,
        salePrice: saleItemData.salePrice, //
        expiryDate: product.expiryDate,
      });
      returnProductIDs.push(saleReturn._id);
    }

    returnPrice = returnPrice + returnPrice * (sale.taxes / 100);
    if(sale.customerInventoryId){
      await DetailedAccountStatement.create({
        saleId: saleId,
        customerInventoryId: sale.customerInventoryId,
        credit: returnPrice,
        debit: 0,
        balance: returnPrice,
        status: req.body.cash ? 'returnCashSale' : 'returnSale',
        admin: req.body.admin,
        returnProductIDs: returnProductIDs
      });
      await CustomerInventory.updateOne({ _id: sale.customerInventoryId }, { $inc: { credit: returnPrice } });
    } else {
      await DetailedAccountStatement.create({
        saleId: saleId,
        customerInventoryId: null,
        credit: 0,
        debit: 0,
        balance: 0,
        status: req.body.cash ? 'returnCashSale' : 'returnSale',
        admin: req.body.admin,
        returnProductIDs: returnProductIDs
      });
    }

    await Sale.updateOne({ _id: saleId }, { $inc: { totalReturnAmount: returnPrice } });
    const saleData = await Sale.findById(saleId);
    res.status(200).json({
      status: "success",
      data: await transformationSale(saleData),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
}

export const getProductReport = async (req, res) => {
  let durationQuery = {}, titleQuery = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if(req.query.search){
      titleQuery.title = new RegExp(req.query.search, 'i');
    }
    if(req.query.barcode){
      titleQuery.barcode = req.query.barcode;
    }
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000);
      const end = new Date(new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000);
      durationQuery.date = { $gte: start, $lte: end };
    }

    const purchaseItems = await PurchaseItem.aggregate([
      {
        $lookup: {
          from: "products",
          let: { productId: "$product" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$productId"] } } },
            { $match: titleQuery }
          ],
          as: "productData"
        }
      },
      { $unwind: "$productData" },
      
      { $match: { ...durationQuery } },
      { $addFields: { totalCost: { $multiply: ['$costPrice', '$quantity'] } } },
      { $group: { _id: '$product', totalPurchaseQuantity: { $sum: '$totalSubQuantity' }, totalPurchasePrice: { $sum: '$totalCost' }, productData: { $first: '$productData' } } },
    
      {
        $lookup: {
          from: 'saleitems',
          let: { productId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$product', '$$productId'] } } },
            { $match: { ...durationQuery } }
          ],
          as: 'saleData'
        }
      },
      {
        $addFields: {
          totalSaleQuantity: {
            $sum: {
              $map: {
                input: "$saleData",
                as: "sale",
                in: "$$sale.totalSubQuantity"
              }
            }
          },
          totalSalePrice: {
            $sum: {
              $map: {
                input: "$saleData",
                as: "sale",
                in: { $multiply: ["$$sale.quantity", "$$sale.salePrice"] }
              }
            }
          }
        }
      },

      {
        $lookup: {
          from: 'defectiveinventoryproducts',
          let: { productId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$productId', '$$productId'] } } },
            { $match: { ...durationQuery } }
          ],
          as: 'defectiveData'
        }
      },
      {
        $addFields: {
          totalDefectiveQuantity: {
            $sum: {
              $map: {
                input: "$defectiveData",
                as: "defective",
                in: "$$defective.quantity"
              }
            }
          },
          totalDefectivePrice: {
            $sum: {
              $map: {
                input: "$defectiveData",
                as: "defective",
                in: { $multiply: ["$$defective.quantity", "$$defective.costPrice"] }
              }
            }
          }
        }
      },
      { $sort: { _id: -1 } },
      { $skip: (page - 1) * limit }, { $limit: limit }
    ]);


    const transformProductReport = await Promise.all(
      purchaseItems.map(async (purchaseItem) => {
        return {
          _id: purchaseItem._id,
          totalPurchaseQuantity: purchaseItem.totalPurchaseQuantity,
          totalPurchasePrice: purchaseItem.totalPurchasePrice,
          totalSaleQuantity: purchaseItem.totalSaleQuantity,
          totalSalePrice: purchaseItem.totalSalePrice,
          totalDefectiveQuantity: purchaseItem.totalDefectiveQuantity,
          totalDefectivePrice: purchaseItem.totalDefectivePrice,
          productData: await transformationProduct(purchaseItem.productData)
        };
      })
    );

    return res.status(200).json({
      status: "success",
      page: page,
      data: transformProductReport
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}

export const salesReport = async (req, res) => {
  try {
    const reports = await Report.aggregate([
      {$match: {table: 'sales'}},
      {
        $lookup: {
          from: "sales",
          foreignField: "_id",
          localField: "foreignKey",
          as: "sale"
        }
      },
      {$unwind: "$sale"},
      {$unwind: "$data"},
      {
        $lookup: {
          from: "saleitems",
          foreignField: "_id",
          localField: "data",
          as: "saleitem"
        }
      },
      {$unwind: "$saleitem"},
      {
        $project: {
          receipt: {
            _id: "$sale._id",
            receiptNumber: "$sale.receiptNumber",
            originalPrice: "$saleitem.originalPrice"
          },
          product: "$saleitem"
        }
      }
    ]).exec();

    const transformData = await Promise.all(reports.map((report) => transformationSaleReport(report)));

    res.status(200).json({
      status: "success",
      data: transformData
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}