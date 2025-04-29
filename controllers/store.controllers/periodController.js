import { transformationPeriod } from "../../format/transformationObject.js";
import Admin from "../../models/adminSchema.js";
import Period from "../../models/store.models/periodSchema.js";

export const getAllPeriods = async (req, res) => {
  try {
    const periods = await Period.find();
    const transformPeriods = await Promise.all(
      periods.map(async (period) => await transformationPeriod(period))
    );
    res.status(200).json({
      status: "success",
      data: transformPeriods,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const createPeriod = async (req, res) => {
  try {
    const newPeriod = new Period(req.body);
    await newPeriod.save();
    res.status(201).json({
      status: "success",
      data: await transformationPeriod(newPeriod),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: "fail",
        message: "Period already exist.",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
};

export const updatePeriod = async (req, res) => {
  try {
    const updatedPeriod = await Period.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({
      status: "success",
      data: await transformationPeriod(updatedPeriod),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.status(207).json({
        status: "fail",
        message: "Period already exist.",
      });
    } else {
      res.status(500).json({
        status: "fail",
        message: error.message,
      });
    }
  }
};

export const deletePeriod = async (req, res) => {
  const periodId = req.params.id;
  try {
    const period = await Admin.find({ period: periodId });
    if (period.length > 0) {
      return res.status(207).json({
        status: "fail",
        message: "Period cannot be deleted. It is in use in some admins.",
      });
    }
    await Period.findByIdAndDelete(periodId);
    res.status(204).json({
      status: "success",
      data: "product deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
