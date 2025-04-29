import Fee from "../models/feesSchema.js";
import supplierFine from "../models/supplierFineSchema.js";
import Supplier from "../models/supplierSchema.js";
import { ProcessNames, insertBalanceSheet } from "./balanceSheet.js";

export const applyFine = async (order, supplierId, typeOfFine, reasonOfCancel) => {
  try {
    const supplier = await Supplier.findById(supplierId);
    const fine = await Fee.findOne({ type: typeOfFine });
    if(!fine){ return; }
    if (supplier) {
      await insertBalanceSheet(order.supplierId, reasonOfCancel, order.customerName, order.orderNumber, fine.amount, 'Credit');
      supplier.wallet += fine.amount;
      await supplier.save();
      await supplierFine.create({
        supplierId,
        fine: fine.amount,
        typeOfFine: typeOfFine,
        order: order._id,
        reasonOfCancel
      });
    }
  } catch (error) {
    console.error("Error apply fine order:", error.message);
  }
};

export const applyFineGroup = async (group, supplierId, typeOfFine, reasonOfCancel) => {
  try {
    const supplier = await Supplier.findById(supplierId);
    const fine = await Fee.findOne({ type: typeOfFine });
    if(!fine){ return; }
    if (supplier) {
      await insertBalanceSheet(group.supplierId, reasonOfCancel, ProcessNames.processCancelledGroup, group.groupNumber, fine.amount, 'Credit');
      supplier.wallet += fine.amount;
      await supplier.save();
      await supplierFine.create({
        supplierId,
        fine: fine.amount,
        typeOfFine: typeOfFine,
        group: group._id,
        reasonOfCancel
      });
    }
  } catch (error) {
    console.error("Error apply fine group:", error.message);
  }
};