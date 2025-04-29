import {transformationExpense, transformationFixedExpense} from '../../format/transformationObject.js';
import Expense from '../../models/store.models/receiptExpenseSchema.js';
import FixedExpense from '../../models/store.models/fixedExpenseSchema.js';

export const getAllFixedExpenses = async (req, res) => {
  try {
    const fixedExpenses = await FixedExpense.find();
    const transformedFixedExpenses = await Promise.all(
      fixedExpenses.map(async (fixedExpense) => await transformationFixedExpense(fixedExpense))
    );
    res.status(200).json({
      status: 'success',
      data: transformedFixedExpenses,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const getFixedExpenseById = async (req, res) => {
  try {
    const fixedExpense = await FixedExpense.findById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: await transformationFixedExpense(fixedExpense),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const createFixedExpense = async (req, res) => {
  try {
    const fixedExpense = await FixedExpense.create(req.body);
    res.status(201).json({
      status: 'success',
      data: await transformationFixedExpense(fixedExpense),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.title) {
      res.status(207).json({
        status: 'fail',
        message: 'FixedExpense already exist.',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
};

export const updateFixedExpense = async (req, res) => {
  try {
    const fixedExpense = await FixedExpense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({
      status: 'success',
      data: await transformationFixedExpense(fixedExpense),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.title) {
      res.status(207).json({
        status: 'fail',
        message: 'FixedExpense already exist.',
      });
    } else {
      res.status(500).json({
        status: 'fail',
        message: error.message,
      });
    }
  }
};

export const deleteFixedExpense = async (req, res) => {
  try {
    await FixedExpense.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: 'FixedExpense deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const query = {};

    if (req.query.type) {
      query.type = req.query.type;
    }

    const expenses = await Expense.find(query).sort({date: -1}).limit(limit).skip((page - 1) * limit).exec();
    const transformedExpenses = await Promise.all(
      expenses.map(async (expense) => await transformationExpense(expense))
    );
    res.status(200).json({
      status: 'success',
      page: page,
      totalPages: Math.ceil((await Expense.countDocuments()) / limit),
      data: transformedExpenses,
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: await transformationExpense(expense),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const createExpense = async (req, res) => {
  try {
    const expense = await Expense.create(req.body);
    res.status(201).json({
      status: 'success',
      data: await transformationExpense(expense),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {new: true});
    res.status(200).json({
      status: 'success',
      data: await transformationExpense(expense),
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: 'Expense deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message,
    });
  }
};

export const getTotalExpenses = async (req, res) => {
  const query = {};

  if (req.query.type) {
    query.type = req.query.type;
  }

  const totalAmountExpenses = await Expense.aggregate([
    {$match: query},
    {$group: {_id: null, total: {$sum: '$amount'}}},
  ]);
  res.status(200).json({
    status: 'success',
    data: totalAmountExpenses.length > 0 ? totalAmountExpenses[0].total : 0
  });
}