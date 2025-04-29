import BalanceSheet from "../models/balanceSheetSchema.js";
export const egyptHour = 3;

export const insertBalanceSheet = async (supplierId, processName, customerName, orderNum, balance, type) => { // for supplier
  const newBalanceSheet = await BalanceSheet.create({
    supplierId,
    processName,
    customerAndOrder: customerName === null ? null : `${customerName} - (${orderNum})`,
    balance,
    type,
  });
  return  newBalanceSheet;
};

export const insertDeliveryBalanceSheet = async (deliveryId, processName, balance, type) => { // for delivery
  await BalanceSheet.create({
    deliveryId,
    processName,
    balance,
    type,
  });
};

export const ProcessNames = {
  fineForTrash: "Trash Order",
  processComplete: "Completed Order",
  processCancelled: "Cancelled Order",
  processCancelledGroup: "Cancelled Group",
  processAddBonus:'Add Bonus',
  deposit: "Deposit",
  debit: "Debit",
  // fineForTrash: "عملية شراء مهملة",
  // processComplete: "عملية شراء مكتملة",
  // processCancelled: "عملية شراء ملغاه",
  // processCancelledGroup: "عملية بيع اوردرات داخل جروب ملغية",
  //   // processAccepted: "عملية شراء مقبولة",
  //   // processRejected: "عملية شراء مرفوضة",
  //   // processPending: "عملية شراء قيد الانتظار",
  //   // processDelivered: "عملية شراء تم التوصيل",
}