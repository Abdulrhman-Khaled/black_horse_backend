import mongoose from "mongoose";
import Inventory from "../../models/store.models/inventorySchema.js";
import {
  transformationDetailedAccount,
  transformationExpense,
  transformationInventory,
  transformationInventoryProduct,
  transformationOrder,
  transformationSettlement,
  transformationTreasury,
} from "../../format/transformationObject.js";
import PurchaseItem from "../../models/store.models/purchaseItemSchema.js";
import Settlement from "../../models/store.models/settlementSchema.js";
import Purchase from "../../models/store.models/purchaseSchema.js";
import Sale from "../../models/store.models/saleSchema.js";
import Expense from "../../models/store.models/receiptExpenseSchema.js";
import DetailedAccountStatement from "../../models/store.models/detailedAccountStatementSchema.js";
import Treasury from "../../models/store.models/treasurySchema.js";
import GlobalCreditAndDebit from "../../models/store.models/globalCreditAndDebitSchema.js";
import {egyptHour} from "../../utils/balanceSheet.js";
import Admin from "../../models/adminSchema.js";
import {validationResult} from "express-validator";
import SupplierProduct from "../../models/supplierProductSchema.js";
import Product from "../../models/productSchema.js";
import Supplier from "../../models/supplierSchema.js";
import {ObjectId} from "mongodb";
import Order from "../../models/orderSchema.js";
import DefectiveInventoryProduct from "../../models/store.models/defectiveItemSchema.js";

export const getAllInventory = async (req, res) => {
  try {
    const inventories = await Inventory.find();
    const transformInventory = await Promise.all(
      inventories.map(
        async (inventory) => await transformationInventory(inventory)
      )
    );
    res.status(200).json({
      status: "success",
      data: transformInventory,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const getOneInventory = async (req, res) => {
  const id = req.params.id;
  try {
    const inventory = await Inventory.findById(id);
    res.status(200).json({
      status: "success",
      data: [await transformationInventory(inventory)],
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const createInventory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newInventory = new Inventory({
      name: req.body.name,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber
    });
    await newInventory.save();
    res.status(201).json({
      status: "success",
      data: await transformationInventory(newInventory),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: "fail",
        message: "Inventory already exist.",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
};

export const updateInventory = async (req, res) => {
  try {
    const updatedInventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json({
      status: "success",
      data: await transformationInventory(updatedInventory),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: "fail",
        message: "Inventory already exist.",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
};

export const deleteInventory = async (req, res) => {
  try {
    const totalPurchases = await PurchaseItem.countDocuments({
      inventoryId: req.params.id,
      reminderQuantity: { $gt: 0 },
    });
    if (totalPurchases > 0) {
      res.status(207).json({
        status: "fail",
        message: "Inventory cannot be deleted because it has purchases.",
      });
    }
    await Inventory.deleteOne({ _id: req.params.id });
    res.status(204).json({
      status: "success",
      data: "Inventory deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const getProductsByInventoryId = async (req, res) => {
  let query = {};

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if (req.query.search) {
      query.title = new RegExp("^" + req.query.search, "i");
    }
    if (req.query.barcode) {
      query.barcode = req.query.barcode;
    }
    const pipelineAggregation = [];
    pipelineAggregation.push({
      $match: { inventoryId: new mongoose.Types.ObjectId(req.params.id) },
    });
    pipelineAggregation.push(...getProductInInventory(query));
    if (req.query.isPagination === true) {
      pipelineAggregation.push(
        { $skip: (page - 1) * limit },
        { $limit: limit }
      );
    }
    if (req.query.random) {
      pipelineAggregation.push({ $sample: { size: +req.query.random } });
    }

    const purchaseItems = await PurchaseItem.aggregate(
      pipelineAggregation
    ).exec();
    const transformInventory = await Promise.all(
      purchaseItems.map(
        async (purchaseItem) =>
          await transformationInventoryProduct(purchaseItem)
      )
    );

    if (req.query.isPagination === true) {
      res.status(200).json({
        status: "success",
        page: page,
        data: transformInventory,
      });
    } else {
      res.status(200).json({
        status: "success",
        data: transformInventory,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const getSettlement = async (req, res) => {
  let query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(
        new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      query.date = { $gte: start, $lte: end };
    }
    if (req.query.product) {
      query.product = new mongoose.Types.ObjectId(req.query.product);
    }
    if (req.query.admin) {
      query.admin = new mongoose.Types.ObjectId(req.query.admin);
    }
    if (req.query.inventoryId) {
      query.inventoryId = new mongoose.Types.ObjectId(req.query.inventoryId);
    }
    const settlements = await Settlement.find(query)
      .sort({ date: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();
    const transformSettlements = await Promise.all(
      settlements.map(
        async (settlement) => await transformationSettlement(settlement)
      )
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil((await Settlement.countDocuments(query)) / limit),
      data: transformSettlements,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const postSettlement = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let issues = [];
  try {
    for (const product of req.body.products) {
      const totalReminderQuantity = await PurchaseItem.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(product._id),
            inventoryId: new mongoose.Types.ObjectId(req.body.inventoryId),
          },
        },
        { $group: { _id: null, totalQuantity: { $sum: "$reminderQuantity" } } },
      ]);
      if (totalReminderQuantity[0].totalQuantity !== product.quantity) {
        issues.push(
          ...(await PurchaseItem.find({
            inventoryId: req.body.inventoryId,
            product: product._id,
            reminderQuantity: { $gt: 0 },
          }))
        );
      }
    }
    const transformIssues = await Promise.all(
      issues.map(async (issue) => await transformationInventoryProduct(issue))
    );
    res.status(200).json({
      status: "success",
      data: transformIssues,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const patchSettlement = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    for (const product of req.body.products) {
      const purchaseItemData = await PurchaseItem.findById(
        product.productItemId
      );
      const newSettlement = await Settlement.create({
        admin: req.body.admin,
        inventoryId: req.body.inventoryId,
        purchaseItemId: product.productItemId,
        product: purchaseItemData.product,
        beforeChanges: purchaseItemData.reminderQuantity,
        afterChanges: product.reminderQuantity,
      });
      await newSettlement.save();
      purchaseItemData.reminderQuantity = product.reminderQuantity;
      await purchaseItemData.save();
    }

    res.status(200).json({
      status: "success",
      data: [],
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const createTreasuryOperation = async (req, res) => {
  try {
    if (req.body.type === "withdraw") {
      const globalCreditAndDebit = await GlobalCreditAndDebit.findOne({});
      if (
        !globalCreditAndDebit ||
        globalCreditAndDebit.globalDebit - globalCreditAndDebit.globalCredit <
          req.body.amount
      ) {
        return res.status(207).json({
          status: "fail",
          message: "Insufficient balance",
        });
      }
    }

    const newTreasury = await Treasury.create(req.body);
    await newTreasury.save();

    res.status(201).json({
      status: "success",
      data: await transformationTreasury(newTreasury),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const getTreasury = async (req, res) => {
  try {
    const matchMap = {};
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(
        new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      matchMap.date = { $gte: start, $lte: end };
    }

    const purchases = await Purchase.aggregate([
      { $match: matchMap },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          totalReturnAmount: { $sum: "$totalReturnAmount" },
        },
      },
      {
        $project: {
          total: { $subtract: ["$totalAmount", "$totalReturnAmount"] },
        },
      },
    ]);
    const sales = await Sale.aggregate([
      { $match: matchMap },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          totalReturnAmount: { $sum: "$totalReturnAmount" },
        },
      },
      {
        $project: {
          total: { $subtract: ["$totalAmount", "$totalReturnAmount"] },
        },
      },
    ]);
    const expenses = await Expense.aggregate([
      { $match: matchMap },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const addToTreasury = await Treasury.aggregate([
      { $match: { ...matchMap, type: { $eq: "deposit" } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const subtractFromTreasury = await Treasury.aggregate([
      { $match: { ...matchMap, type: { $eq: "withdraw" } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const defectiveProducts = await DefectiveInventoryProduct.aggregate([
      { $match: matchMap },
      { $group: { _id: null, total: { $sum: "$costPrice" } } },
    ]);

    const detailedSuppliers = await DetailedAccountStatement.aggregate([
      { $match: { ...matchMap, supplierInventoryId: { $ne: null } } },
      {
        $group: {
          _id: null,
          totalNonDeposite: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "depositeToSupplier"] },
                    { $ne: ["$status", "returnPurchase"] },
                    { $ne: ["$status", "returnCashPurchase"] },
                  ],
                },
                "$balance",
                0,
              ],
            },
          },
          totalReturn: {
            $sum: {
              $cond: [{ $eq: ["$status", "returnPurchase"] }, "$balance", 0],
            },
          },
          totalCashReturn: {
            $sum: {
              $cond: [
                { $eq: ["$status", "returnCashPurchase"] },
                "$balance",
                0,
              ],
            },
          },
          totalDeposite: {
            $sum: {
              $cond: [
                { $eq: ["$status", "depositeToSupplier"] },
                "$balance",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          total: {
            $subtract: [
              {
                $subtract: [
                  { $subtract: ["$totalNonDeposite", "$totalDeposite"] },
                  "$totalReturn",
                ],
              },
              "$totalCashReturn",
            ],
          },
        },
      },
    ]);

    const detailedCustomers = await DetailedAccountStatement.aggregate([
      { $match: { ...matchMap, customerInventoryId: { $ne: null } } },
      {
        $group: {
          _id: null,
          totalNonDeposite: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "depositeFromCustomer"] },
                    { $ne: ["$status", "returnSale"] },
                    { $ne: ["$status", "returnCashSale"] },
                  ],
                },
                "$balance",
                0,
              ],
            },
          },
          totalReturn: {
            $sum: {
              $cond: [{ $eq: ["$status", "returnSale"] }, "$balance", 0],
            },
          },
          totalCashReturn: {
            $sum: {
              $cond: [{ $eq: ["$status", "returnCashSale"] }, "$balance", 0],
            },
          },
          totalDeposite: {
            $sum: {
              $cond: [
                { $eq: ["$status", "depositeFromCustomer"] },
                "$balance",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          total: {
            $subtract: [
              {
                $subtract: [
                  { $subtract: ["$totalNonDeposite", "$totalDeposite"] },
                  "$totalReturn",
                ],
              },
              "$totalCashReturn",
            ],
          },
        },
      },
    ]);

    const paymentPurchase = await Purchase.aggregate([
      {$match: matchMap},
      {
        $lookup: {
          from: "payments",
          localField: "paymentType",
          foreignField: "_id",
          as: "payment",
        }
      },
      {$unwind: "$payment"},
      {$match: {$or: [{"payment.title": "محفظة"}, {"payment.title": "فيزا"}]}},
      {
        $group: {
          _id: "$payment.title",
          total: {$sum: "$paidAmount"},
        },
      },
    ]).exec();

    const paymentSale = await Sale.aggregate([
      {$match: matchMap},
      {
        $lookup: {
          from: "payments",
          localField: "paymentType",
          foreignField: "_id",
          as: "payment",
        }
      },
      {$unwind: "$payment"},
      {$match: {$or: [{"payment.title": "محفظة"}, {"payment.title": "فيزا"}]}},
      {
        $group: {
          _id: "$payment.title",
          total: {$sum: "$paidAmount"},
        },
      },
    ]).exec();

    const t = (total) => total?.[0]?.total ?? 0;
    const r = (total) => Math.round(total * 100) / 100;

    const totalPurchases = t(purchases);
    const totalSales = t(sales);
    const totalExpenses = t(expenses);
    const totalSuppliers = t(detailedSuppliers);
    const totalCustomers = t(detailedCustomers);
    const totalAddToTreasury = t(addToTreasury);
    const totalSubtractFromTreasury = t(subtractFromTreasury);
    const totalDefectiveProducts = t(defectiveProducts);

    const walletPurchase = t([paymentPurchase.find(p => p._id === 'محفظة')]);
    const visaPurchase = t([paymentPurchase.find(p => p._id === 'فيزا')]);
    const walletSale = t([paymentSale.find(p => p._id === 'محفظة')]);
    const visaSale = t([paymentSale.find(p => p._id === 'فيزا')]);

    const totalCredits = totalPurchases + totalExpenses + totalSuppliers + totalSubtractFromTreasury + totalDefectiveProducts;
    const totalDebits = totalSales + totalCustomers + totalAddToTreasury;
    const totalBalance = totalDebits - totalCredits;
    const totalWallet = walletSale - walletPurchase;
    const totalVisa = visaSale - visaPurchase;

    res.status(200).json({
      status: "success",
      data: {
        balance: r(totalBalance),
        credit: r(totalCredits),
        debit: r(totalDebits),
        purchases: r(totalPurchases),
        sales: r(totalSales),
        expenses: r(totalExpenses),
        customers: r(totalCustomers),
        suppliers: r(totalSuppliers),
        addCashToTreasury: r(totalAddToTreasury),
        subtractCashFromTreasury: r(totalSubtractFromTreasury),
        wallet: r(totalWallet),
        visa: r(totalVisa),
        defected: r(totalDefectiveProducts)
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const getEntries = async (req, res) => {
  let query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    if (req.query.admin) {
      // only for admin
      query.admin = new mongoose.Types.ObjectId(req.query.admin);
    }

    if (req.query.period) {
      // only for period
      const admins = await Admin.find({ period: { $in: req.query.period } })
        .select("_id")
        .lean();
      const adminIds = admins.map((admin) => admin._id);
      query.admin = { $in: adminIds };
    }

    if (req.query.startDate && req.query.endDate) {
      // only for date
      const start = new Date(
        new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      query.date = { $gte: start, $lte: end };
    } else if (req.query.endDate) {
      const startDate = new Date(req.query.endDate);
      const endDate = new Date(req.query.endDate);

      startDate.setUTCHours(0, 0, 0, 0);

      query.date = {$gte: startDate, $lte: endDate};
    }

    const orderPipeline = [
      {$match: query},
      {$match: {deliveryBoy: {$ne: null}}},
      {$sort: {date: -1}},
      {
        $project: {
          orderNumber: 1,
          totalPrice: 1,
          subTotalPrice: 1,
          customerName: 1,
          deliveryFees: 1,
          deliveryDate: 1,
          operationType: {$literal: "delivery"}
        }
      }
    ];

    const expensesPipeline = [
      { $match: query },
      { $sort: { date: -1 } },
      {
        $project: {
          date: 1,
          amount: 1,
          description: 1,
          operationType: { $literal: "expenses" },
        },
      },
    ];

    const detailedAccountStatementsPipeline = [
      {
        $match: {
          ...query,
          status: { $nin: ["returnSale", "returnPurchase"] },
        },
      },
      { $sort: { date: -1 } },
      {
        $project: {
          date: 1,
          details: 1,
          statementId: 1,
          operationType: { $literal: "customerSupplierDeposite" },
        },
      },
    ];

    const treasuriesPipeline = [
      { $match: query },
      { $sort: { date: -1 } },
      {
        $project: {
          date: 1,
          treasuryId: 1,
          balance: 1,
          operationType: { $literal: "treasuryOperation" },
        },
      },
    ];

    const combinedPipeline = [
      {
        $unionWith: {
          coll: "detailedaccountstatements",
          pipeline: detailedAccountStatementsPipeline,
        },
      },
      { $unionWith: { coll: "treasuries", pipeline: treasuriesPipeline } },
      {$unionWith: {coll: "orders", pipeline: orderPipeline}},
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const paginatedData = await Expense.aggregate([
      ...expensesPipeline,
      ...combinedPipeline,
    ]).exec();

    const transformEntries = await Promise.all(
      paginatedData.map(async (entry) => {
        if (entry.operationType === "expenses") {
          const expenseData = await Expense.findById(entry._id);
          return await transformationExpense(expenseData);
        } else if (entry.operationType === "customerSupplierDeposite") {
          const detailedAccountStatemententryData =
            await DetailedAccountStatement.findById(entry._id);
          return await transformationDetailedAccount(
            detailedAccountStatemententryData
          );
        } else if (entry.operationType === "treasuryOperation") {
          const treasuryData = await Treasury.findById(entry._id);
          return await transformationTreasury(treasuryData);
        } else if (entry.operationType === "delivery") {
          const orderData = await Order.findById(entry._id);
          return await transformationOrder(orderData, entry.operationType);
        }
      })
    );
    return res.status(200).json({
      status: "success",
      data: transformEntries,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const getGlobalCreditAndDebit = async (req, res) => {
  let query = {};
  try {
    if (req.query.admin) {
      query.admin = new mongoose.Types.ObjectId(req.query.admin);
    }

    if (req.query.startDate && req.query.endDate) {
      const start = new Date(
        new Date(req.query.startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      query.date = { $gte: start, $lte: end };
    } else if (req.query.endDate) {
      const startDate = new Date(req.query.endDate).setUTCHours(0, 0, 0, 0);
      const start = new Date(
        new Date(startDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(req.query.endDate).getTime() - egyptHour * 60 * 60 * 1000
      );
      query.date = { $gte: start, $lte: end };
    }

    if (Object.keys(query).length === 0) {
      const getlobalCreditAndDebitData = await GlobalCreditAndDebit.findOne();
      return res.status(200).json({
        status: "success",
        data: {
          globalCredit: getlobalCreditAndDebitData
            ? getlobalCreditAndDebitData.globalCredit
            : 0,
          globalDebit: getlobalCreditAndDebitData
            ? getlobalCreditAndDebitData.globalDebit
            : 0,
          globalBlance: getlobalCreditAndDebitData
            ? getlobalCreditAndDebitData.globalDebit -
              getlobalCreditAndDebitData.globalCredit
            : 0,
        },
      });
    }

    const purchases = await Purchase.aggregate([
      // credit
      { $match: query },
      { $group: { _id: null, paidAmount: { $sum: "$paidAmount" } } },
    ]);
    const sales = await Sale.aggregate([
      // debit
      { $match: query },
      { $group: { _id: null, paidAmount: { $sum: "$paidAmount" } } },
    ]);
    const expenses = await Expense.aggregate([
      // credit
      { $match: query },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]);
    const addToTreasury = await Treasury.aggregate([
      // debit
      { $match: { ...query, type: { $eq: "deposit" } } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]);
    const subtractFromTreasury = await Treasury.aggregate([
      // credit
      { $match: { ...query, type: { $eq: "withdraw" } } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]);
    const detailedSuppliers1 = await DetailedAccountStatement.aggregate([
      // credit
      {
        $match: {
          ...query,
          supplierInventoryId: { $ne: null },
          status: { $eq: "supplierStartingBalance" },
        },
      },
      { $group: { _id: null, credit: { $sum: "$credit" } } },
    ]);
    const detailedSuppliers2 = await DetailedAccountStatement.aggregate([
      // credit
      {
        $match: {
          ...query,
          supplierInventoryId: { $ne: null },
          status: { $eq: "depositeToSupplier" },
        },
      },
      { $group: { _id: null, debit: { $sum: "$debit" } } },
    ]);
    const detailedSuppliers3 = await DetailedAccountStatement.aggregate([
      // debit
      {
        $match: {
          ...query,
          supplierInventoryId: { $ne: null },
          status: { $eq: "returnCashPurchase" },
        },
      },
      { $group: { _id: null, debit: { $sum: "$debit" } } },
    ]);
    const detailedCustomers1 = await DetailedAccountStatement.aggregate([
      // debit
      {
        $match: {
          ...query,
          customerInventoryId: { $ne: null },
          status: { $eq: "customerStartingBalance" },
        },
      },
      { $group: { _id: null, debit: { $sum: "$debit" } } },
    ]);
    const detailedCustomers2 = await DetailedAccountStatement.aggregate([
      // debit
      {
        $match: {
          ...query,
          customerInventoryId: { $ne: null },
          status: { $eq: "depositeFromCustomer" },
        },
      },
      { $group: { _id: null, credit: { $sum: "$credit" } } },
    ]);
    const detailedCustomers3 = await DetailedAccountStatement.aggregate([
      // credit
      {
        $match: {
          ...query,
          customerInventoryId: { $ne: null },
          status: { $eq: "returnCashSale" },
        },
      },
      { $group: { _id: null, credit: { $sum: "$credit" } } },
    ]);

    const purchasesCredit = purchases.length > 0 ? purchases[0].paidAmount : 0;
    const salesDebit = sales.length > 0 ? sales[0].paidAmount : 0;
    const expensesCredit = expenses.length > 0 ? expenses[0].amount : 0;
    const addToTreasuryDebit =
      addToTreasury.length > 0 ? addToTreasury[0].amount : 0;
    const subtractFromTreasuryCredit =
      subtractFromTreasury.length > 0 ? subtractFromTreasury[0].amount : 0;
    const detailedSuppliersCredit1 =
      detailedSuppliers1.length > 0 ? detailedSuppliers1[0].credit : 0;
    const detailedSuppliersCredit2 =
      detailedSuppliers2.length > 0 ? detailedSuppliers2[0].debit : 0;
    const detailedSuppliersCredit3 =
      detailedSuppliers3.length > 0 ? detailedSuppliers3[0].debit : 0;
    const detailedCustomersDebit1 =
      detailedCustomers1.length > 0 ? detailedCustomers1[0].debit : 0;
    const detailedCustomersDebit2 =
      detailedCustomers2.length > 0 ? detailedCustomers2[0].credit : 0;
    const detailedCustomersDebit3 =
      detailedCustomers3.length > 0 ? detailedCustomers3[0].credit : 0;

    const globalCredit =
      purchasesCredit +
      expensesCredit +
      subtractFromTreasuryCredit +
      detailedSuppliersCredit1 +
      detailedSuppliersCredit2 +
      detailedCustomersDebit3;
    const globalDebit =
      salesDebit +
      addToTreasuryDebit +
      detailedCustomersDebit1 +
      detailedCustomersDebit2 +
      detailedSuppliersCredit3;

    res.status(200).json({
      status: "success",
      data: {
        globalCredit: globalCredit,
        globalDebit: globalDebit,
        globalBlance: globalDebit - globalCredit,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

/******************************************* Helper Functions */
export const getProductInInventory = (query) => {
  return [
    {
      $lookup: {
        from: "products",
        let: { productId: "$product" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$productId"] } } },
          { $match: query },
        ],
        as: "productInfo",
      },
    },
    { $unwind: "$productInfo" },
    {
      $group: {
        _id: "$product",
        product: { $first: "$productInfo" },
        quantity: { $first: 0 },
        unit: { $last: "$unit" },
        reminderQuantity: { $sum: "$reminderQuantity" },
        costPrice: { $last: "$costPrice" },
        retailPrice: { $last: "$retailPrice" },
        wholesalePrice: { $last: "$wholesalePrice" },
        haveWholeSalePrice: { $last: "$haveWholeSalePrice" },
        expiryDate: { $min: "$expiryDate" },
        date: { $last: "$date" },
      },
    },
    { $match: { reminderQuantity: { $gt: 0 } } },
    { $sort: { date: -1 } },
  ];
};

// transform functions to transform between the stock of the supplier and inventory of the supplier;
export const transformInventoryToBlackhorse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transformations = req.body.transformations;
    const supplierId = req.body.supplierId;

    const supplier = await Supplier.findById(supplierId).session(session);
    if (!supplier) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: "fail",
        message: "Supplier not found",
      });
    }
    if (supplier.type !== "blackHorse") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: "fail",
        message: "The Supplier is not Blackhorse",
      });
    }

    for (const transformation of transformations) {
      const {productId, appQuantity, systemQuantity, price} = transformation;

      if (appQuantity < 0 || systemQuantity < 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(206).json({
          status: "fail",
          message: `Quantities must be greater than or equal to zero for product ID ${productId}`,
        });
      }

      // const supplierProduct = await SupplierProduct.findOne({
      //   productId: productId,
      //   supplierId: supplierId,
      // }).session(session).populate('productId');

      const [{totalStock}] = await SupplierProduct.aggregate([
        {
          $match: {
            productId: new ObjectId(productId),
            supplierId: new ObjectId(supplierId)
          }
        },
        {
          $group: {
            _id: null,
            totalStock: {$sum: "$stock"}
          }
        }
      ]).session(session);

      const purchaseProduct = await PurchaseItem.aggregate([
        {
          $match: {
            product: new ObjectId(productId)
          }
        },
        {
          $group: {
            _id: null,
            totalReminderQuantity: {$sum: "$reminderQuantity"}
          }
        }
      ]).session(session);
      if (!purchaseProduct) {
        await session.abortTransaction();
        session.endSession();
        return res.status(207).json({
          status: "fail",
          message: `Purchase product with ID ${productId} not found or has no remaining quantity`,
        });
      }

      const adminProduct = await Product.findById(productId).session(session);
      if (!adminProduct) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          status: "fail",
          message: `Admin product with ID ${productId} not found`,
        });
      }
      // if (systemQuantity > purchaseProduct.reminderQuantity) {
      //   await session.abortTransaction();
      //   session.endSession();
      //   return res.status(400).json({
      //     status: "fail",
      //     message: `System quantity ${systemQuantity} exceeds available stock ${purchaseProduct.reminderQuantity} for product ID ${productId}`,
      //   });
      // }

      if (adminProduct) {
        const totalRequestQuantity = appQuantity + systemQuantity;
        const totalQuantity = purchaseProduct[0].totalReminderQuantity + totalStock;

        if (totalQuantity !== totalRequestQuantity) {
          await session.abortTransaction();
          session.endSession();
          return res.status(208).json({
            status: "fail",
            //The sum of appQuantity and systemQuantity must equal the original system quantity (${totalQuantity}) for product ${supplierProduct.productId.title}
            message: `totalRequestQuantity: ${totalRequestQuantity}, totalQuantity: ${totalQuantity}`,
          });
        }
      }

      // if (!supplierProduct) {
      //   await SupplierProduct.create(
      //     [
      //       {
      //         supplierId: supplierId,
      //         productId: productId,
      //         price: price,
      //         stock: appQuantity,
      //         subUnit: adminProduct.subUnit,
      //         productWeight: adminProduct.weight,
      //         expiryDate: purchaseProduct.expiryDate,
      //       },
      //     ],
      //     { session }
      //   );
      // } else {
      // if (appQuantity !== 0 && systemQuantity !== 0) {
      // const supplierExpiryDate = new Date(supplierProduct.expiryDate);
      // const purchaseExpiryDate = new Date(purchaseProduct.expiryDate);
      // if (
      //   supplierExpiryDate.getMonth() !== purchaseExpiryDate.getMonth() ||
      //   supplierExpiryDate.getFullYear() !== purchaseExpiryDate.getFullYear()
      // ) {
      //   await session.abortTransaction();
      //   session.endSession();
      //   return res.status(209).json({
      //     status: "fail",
      //     //The expiration dates do not match for product ID ${productId}
      //     message: `${supplierProduct.productId.title}`,
      //   });
      // }
      // }
      // if(appQuantity == 0){
      //   supplierProduct.expiryDate = purchaseProduct.expiryDate;
      // }
      // supplierProduct.stock = appQuantity;
      // purchaseProduct.reminderQuantity = systemQuantity;
      // await supplierProduct.save({ session });
      // await purchaseProduct.save({ session });
    // }
      // find nearest expire date with reminder quantity
      // if not exists get item with expiryDate equal supplierProduct.expiryDate
      // else set in last expire date

      // client doesn't change quantity
      if (appQuantity === totalStock) {
        return res.status(200).json({
          status: "success",
          message: "Transformations completed successfully",
        });
      }
      // from purchaseItems to stock
      if (appQuantity > totalStock) {
        const purchaseItems = await PurchaseItem.find({
          product: new ObjectId(productId),
        }).sort({ expiryDate: 1 }).session(session);

        let quantity = appQuantity - totalStock;

        for (let i = 0; quantity !== 0; i++) {
          const item = purchaseItems[i];
          const currentQuantity = item.reminderQuantity;

          let supplierProduct = await SupplierProduct.findOne({
            productId: productId,
            supplierId: supplierId,
            expiryDate: item.expiryDate,
          }).session(session);

          if (!supplierProduct) {
            supplierProduct = new SupplierProduct();

            supplierProduct.supplierId = supplierId;
            supplierProduct.stock = 0;
            supplierProduct.productId = productId;
            supplierProduct.price = price;
            supplierProduct.subUnit = adminProduct.subUnit;
            supplierProduct.productWeight = adminProduct.weight;
            supplierProduct.expiryDate = item.expiryDate;
          }

          if (currentQuantity > quantity) {
            supplierProduct.stock += quantity;
            item.reminderQuantity -= quantity;
            quantity = 0;
          } else {
            supplierProduct.stock += currentQuantity;
            quantity -= currentQuantity;
            item.reminderQuantity = 0;
          }

          await item.save({ session });
          await supplierProduct.save({ session });
        }
      }
      // from stock to purchaseItems
      else {
        const supplierProducts = await SupplierProduct.find({
          productId: new ObjectId(productId),
          supplierId: new ObjectId(supplierId)
        }).sort({ expireDate: 1 }).session(session);

        let quantity = totalStock - appQuantity;

        console.log({supplierProducts})

        for (let i = 0; quantity !== 0; i++) {
          const product = supplierProducts[i];
          const currentStock = product.stock;

          let item = await PurchaseItem.findOne({
            product: new ObjectId(productId),
            expiryDate: product.expiryDate,
          }).session(session);

          if (!item) {
            item = await PurchaseItem.findOne({
              product: new ObjectId(productId),
            }).session(session);

            if (!item) {
              return res.status(500).json({ message: 'something wrong' });
            }
          }

          console.log({item, product})

          if (currentStock > quantity) {
            product.stock -= quantity;
            item.reminderQuantity += quantity;
            quantity = 0;
          } else {
            quantity -= currentStock;
            item.reminderQuantity += product.stock;
            product.stock = 0;
          }

          await product.save({ session });
          await item.save({ session });
        }
      }
    }


    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: "Transformations completed successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      status: "fail",
      message: `Error processing product ID ${error.productId}: ${error.message}`,
    });
  }
};
