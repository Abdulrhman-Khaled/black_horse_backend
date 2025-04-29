import SupplierInventory from "../../models/store.models/supplierInventorySchema.js";
import CustomerInventory from "../../models/store.models/customerInventorySchema.js";
import { transformationCustomerInventory, transformationDetailedAccount, transformationSupplierInventory } from "../../format/transformationObject.js";
import DetailedAccountStatement from "../../models/store.models/detailedAccountStatementSchema.js";
import GlobalCreditAndDebit from "../../models/store.models/globalCreditAndDebitSchema.js";
import { validationResult } from "express-validator";

export const getAllSupplierInventory = async (req, res) => {
  let query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if (req.query.search) {
      query.name = new RegExp(req.query.search, "i");
    }
    const supplierInventories = await SupplierInventory.find(query).limit(limit).skip((page - 1) * limit).exec();
    const transformSupplierInventory = await Promise.all(
      supplierInventories.map(async (supplierInventory) => await transformationSupplierInventory(supplierInventory))
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil((await SupplierInventory.countDocuments(query)) / limit),
      data: transformSupplierInventory,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getAllCustomerInventory = async (req, res) => {
  let query = {};
  const search = req.query.search;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if (search) {
      query.name = new RegExp(search, "i");
    }
    const customerInventories = await CustomerInventory.find(query).limit(limit).skip((page - 1) * limit).exec();
    const transformCustomerInventory = await Promise.all(
      customerInventories.map(
        async (customerInventory) => await transformationCustomerInventory(customerInventory)
      )
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil((await CustomerInventory.countDocuments(query)) / limit),
      data: transformCustomerInventory,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getOneSupplierInventory = async (req, res) => {
  const id = req.params.id;
  try {
    const supplierInventory = await SupplierInventory.findById(id);
    res.status(200).json({
      status: "success",
      data: await transformationSupplierInventory(supplierInventory),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getOneCustomerInventory = async (req, res) => {
  const id = req.params.id;
  try {
    const customerInventory = await CustomerInventory.findById(id);
    res.status(200).json({
      status: "success",
      data: await transformationCustomerInventory(customerInventory),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const createSupplierInventory = async (req, res) => {
  try {
    const newSupplierInventory = new SupplierInventory(req.body);
    await newSupplierInventory.save();
    if (req.body.credit > 0) {
      await DetailedAccountStatement.create({
        supplierInventoryId: newSupplierInventory._id,
        admin: req.body.admin,
        credit: req.body.credit,
        debit: req.body.debit,
        balance: req.body.credit - req.body.debit,
        status: "supplierStartingBalance",
      });
    }
    res.status(201).json({
      status: "success",
      data: await transformationSupplierInventory(newSupplierInventory),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: "fail",
        message: "SupplierInventoryName already exist.",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
};
export const createCustomerInventory = async (req, res) => {
  try {
    const newCustomerInventory = new CustomerInventory(req.body);
    await newCustomerInventory.save();
    if (req.body.debit > 0) {
      await DetailedAccountStatement.create({
        customerInventoryId: newCustomerInventory._id,
        admin: req.body.admin,
        credit: req.body.credit,
        debit: req.body.debit,
        balance: req.body.debit - req.body.credit,
        status: "customerStartingBalance",
      });
    }
    res.status(201).json({
      status: "success",
      data: await transformationCustomerInventory(newCustomerInventory),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: "fail",
        message: "CustomerInventoryName already exist.",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
};
export const updateSupplierInventory = async (req, res) => {
  const id = req.params.id;
  try {
    const updatedSupplierInventory = await SupplierInventory.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({
      status: "success",
      data: await transformationSupplierInventory(updatedSupplierInventory),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: "fail",
        message: "SupplierInventoryName already exist.",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
};
export const updateCustomerInventory = async (req, res) => {
  const id = req.params.id;
  try {
    const updatedCustomerInventory = await CustomerInventory.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({
      status: "success",
      data: await transformationCustomerInventory(updatedCustomerInventory),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: "fail",
        message: "CustomerInventoryName already exist.",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
};
export const deleteSupplierInventory = async (req, res) => {
  const id = req.params.id;
  try {
    // await SupplierInventory.deleteOne({ _id: id });
    res.status(204).json({
      status: "success",
      data: "SupplierInventory deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const deleteCustomerInventory = async (req, res) => {
  const id = req.params.id;
  try {
    // await CustomerInventory.deleteOne({ _id: id });
    res.status(204).json({
      status: "success",
      data: "CustomerInventory deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const totalCredit = async (req, res) => {
  const totalBalance = await SupplierInventory.aggregate([
    { $group: {_id: null, totalCredit: { $sum: "$credit" }, totalDebit: { $sum: "$debit" }, }, },
  ]);
  res.status(200).json({
    status: "success",
    data: totalBalance.length > 0 ? totalBalance[0].totalCredit - totalBalance[0].totalDebit : 0,
  });
};
export const totalDebit = async (req, res) => {
  const totalBalance = await CustomerInventory.aggregate([
    { $group: { _id: null, totalCredit: { $sum: "$credit" }, totalDebit: { $sum: "$debit" }, }, },
  ]);
  res.status(200).json({
    status: "success",
    data: totalBalance.length > 0 ? totalBalance[0].totalDebit - totalBalance[0].totalCredit : 0,
  });
};
export const sortedSupplierInventory = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const supplierInventories = await SupplierInventory.aggregate([
      { $addFields: { balance: { $subtract: ["$credit", "$debit"] } } },
      { $sort: { balance: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).exec();
    const transformSupplierInventory = await Promise.all(
      supplierInventories.map(
        async (supplierInventory) => await transformationSupplierInventory(supplierInventory)
      )
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil((await SupplierInventory.countDocuments()) / limit),
      data: transformSupplierInventory,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const sortedCustomerInventory = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const customerInventories = await CustomerInventory.aggregate([
      { $addFields: { balance: { $subtract: ["$debit", "$credit"] } } },
      { $sort: { balance: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).exec();
    const transformCustomerInventory = await Promise.all(
      customerInventories.map(
        async (customerInventory) => await transformationCustomerInventory(customerInventory)
      )
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil((await CustomerInventory.countDocuments()) / limit),
      data: transformCustomerInventory,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const getDetailedAccount = async (req, res) => {
  let query = {};
  const type = req.query.type;
  const customerSupplierInventoryId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    if (type === "supplierInventory") {
      query.supplierInventoryId = customerSupplierInventoryId;
    } else if (type === "customerInventory") {
      query.customerInventoryId = customerSupplierInventoryId;
    } else {
      throw new Error(
        "Type should be either supplierInventory or customerInventory"
      );
    }

    const totalDetails = await DetailedAccountStatement.find(query).sort({ date: -1 }).limit(limit).skip((page - 1) * limit).exec();
    const transformDetailedAccounts = await Promise.all(
      totalDetails.map(
        async (totalDetail) => await transformationDetailedAccount(totalDetail)
      )
    );
    res.status(200).json({
      status: "success",
      page: page,
      totalPages: Math.ceil((await DetailedAccountStatement.countDocuments(query)) / limit),
      data: transformDetailedAccounts,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
export const createDetailedAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const bodyData = {};
  const type = req.query.type;
  try {
    if (type === "supplierInventory") {
      const supplierInventory = await SupplierInventory.findById(req.params.id);
      if (!supplierInventory) {
        throw new Error("SupplierInventory not found");
      }

      bodyData.supplierInventoryId = req.params.id;
      bodyData.debit = req.body.deposit;
      bodyData.balance = req.body.deposit;
      bodyData.credit = 0;
      bodyData.status = "depositeToSupplier";
    } else if (type === "customerInventory") {
      const customerInventory = await CustomerInventory.findById(req.params.id);
      if (!customerInventory) {
        throw new Error("CustomerInventory not found");
      }

      bodyData.customerInventoryId = req.params.id;
      bodyData.credit = req.body.deposit;
      bodyData.balance = req.body.deposit;
      bodyData.debit = 0;
      bodyData.status = "depositeFromCustomer";
    } else {
      throw new Error("Type should be either supplierInventory or customerInventory");
    }

    const detailedAccount = await DetailedAccountStatement.create({ ...bodyData, admin: req.body.admin });
    if (type === "supplierInventory") {
      await SupplierInventory.updateOne({ _id: req.params.id }, { $inc: { debit: req.body.deposit } } );
    } else if (type === "customerInventory") {
      await CustomerInventory.updateOne({ _id: req.params.id }, { $inc: { credit: req.body.deposit } });
    }
    res.status(201).json({
      status: "success",
      data: await transformationDetailedAccount(detailedAccount),
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

/****************************************** Helper Function ****************************************/
export const addCreditOrDebit = async (credit, debit) => {
  const updateResult = await GlobalCreditAndDebit.findOneAndUpdate({}, { $inc: { globalCredit: credit, globalDebit: debit }});
  if (!updateResult) {
    const newDocument = new GlobalCreditAndDebit({ globalCredit: credit, globalDebit: debit });
    await newDocument.save();
  }
};