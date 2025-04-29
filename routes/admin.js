import express from 'express';
import multer from 'multer';
import {
  createAdmin,
  createHomeSlideShow,
  createReason,
  createRegion,
  createSubRegion,
  createSubUnit,
  createUnit,
  deleteAdmin,
  deleteHomeSlideShow,
  deleteReason,
  deleteRegion,
  deleteSubRegion,
  deleteSubUnit,
  deleteSupplier,
  deleteUnit,
  getAdminsByPeriodId,
  getAllAdmins,
  getAllHomeSlideShow,
  getAllReasons,
  getAllRegion,
  getAllSubRegion,
  getAllSubUnits,
  getAllUnits,
  getSubRegionByRegionId,
  updateAdmin,
  updateReason,
  updateRegion,
  updateSubRegion,
  updateSubUnit,
  updateUnit,
} from '../controllers/adminController.js';
import {storage,} from '../controllers/sharedFunction.js';
import {
  changeImageCategory,
  createCategory,
  createSubCategory,
  createSubSubCategory,
  deleteCategory,
  deleteSubCategory,
  deleteSubSubCategory,
  getAllCategory,
  getSubCategoryByCategory,
  getSubSubCategoryBySubCategory,
  updateCategory,
  updateSubCategory,
  updateSubSubCategory
} from '../controllers/categoryController.js';
import {createCustomer, createSupplier} from '../auth/signup.js';
import {
  addBonusToSupplier,
  getAllSupplier,
  getAllSupplierForAdmin,
  getSupplier,
  getSuppliersByOrderCount,
  getTotalSales,
  getTotalSalesForEveryDay,
  totalSalesBySupplierId,
  updateSupplier,
  updateSupplierProducts,
} from '../controllers/supplierController.js';
import {createOffer, deleteOffer, getAllOffer,} from '../controllers/offerController.js';
import {
  getAllOrder,
  getCustomerNotConfirmedOrders,
  getNumOfOrders,
  getOrderByDeliveryRoute,
  getOrderByIdOrOrderNumber,
  getOrdersStatus,
  mostFrequentDistricts,
  returnPartOfOrder,
  updateOrder,
} from '../controllers/orderController.js';
import {authenticate} from '../middlewares/authorizationMiddleware.js';
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  getAllProduct,
  getProductByCategorySubCategorySubSubCategory,
  getProductByMl5saty,
  getProductByProductId,
  updateProduct,
  uploadProductImage
} from '../controllers/productsController.js';
import {
  changeImageCar,
  createCar,
  deleteCar,
  getCarByWeight,
  getCars,
  updateCar,
} from '../controllers/carController.js';
import {
  changeImageDeliveryBoy,
  createDeliveryBoy,
  deleteDeliveryBoy,
  getAllDeliveryBoy,
  getDeliveryById, getDeliveryOrders,
  updateDeliveryBoy
} from '../controllers/deliveryBoyController.js';
import {
  createPromoCode,
  deletePromoCode,
  getAllPromoCode,
  updatePromoCode
} from '../controllers/promoCodeController.js';
import {getAllGroupForAdmin, getGroupById} from '../controllers/groupController.js';
import {getNumberOfCustomer} from '../controllers/customerController.js';
import {
  createExpireDayGroup,
  createFee,
  createFineForCancel,
  createFineForCompleteGroup,
  createFineForOnDelivery,
  createFineForPending,
  createFineForTrash,
  createInProgressFine,
  createNumberOfCompleteGroupDays,
  createNumberOfInProgressDays,
  createNumberOfOnDeliveryDays,
  createNumberOfPendingDays,
  deleteFineForCancel,
  deleteFineForOnDelivery,
  deleteFineForPending,
  deleteFineForTrash,
  deleteInProgressFine,
  getExpireDayGroup,
  getFee,
  getFineForCancel,
  getFineForCompleteGroup,
  getFineForOnDelivery,
  getFineForPending,
  getFineForTrash,
  getInProgressFine,
  getNumberOfCompleteGroupDays,
  getNumberOfInProgressDays,
  getNumberOfOnDeliveryDays,
  getNumberOfPendingDays
} from '../controllers/fineController.js';
import {
  createInventory,
  createTreasuryOperation,
  deleteInventory,
  getAllInventory,
  getEntries,
  getGlobalCreditAndDebit,
  getOneInventory,
  getProductsByInventoryId,
  getSettlement,
  getTreasury,
  patchSettlement,
  postSettlement,
  updateInventory
} from '../controllers/store.controllers/InventoryController.js';
import {
  createCustomerInventory,
  createDetailedAccount,
  createSupplierInventory,
  deleteCustomerInventory,
  deleteSupplierInventory,
  getAllCustomerInventory,
  getAllSupplierInventory,
  getDetailedAccount,
  getOneCustomerInventory,
  getOneSupplierInventory,
  sortedCustomerInventory,
  sortedSupplierInventory,
  totalCredit,
  totalDebit,
  updateCustomerInventory,
  updateSupplierInventory
} from '../controllers/store.controllers/customerSupplierController.js';
import {
  calcTotalAmountPurchase,
  createPurchase,
  deletePurchase,
  getAllPurchases,
  getPurchaseById,
  getReturnsByPurchaseId,
  returnPurchase
} from '../controllers/store.controllers/purchasesController.js';
import {
  createSale,
  deleteSale,
  getAllSales,
  getProductReport,
  getReturnsBySaleId,
  getSaleById,
  returnSale, salesReport
} from '../controllers/store.controllers/salesController.js';
import {
  createExpense,
  createFixedExpense,
  deleteExpense,
  deleteFixedExpense,
  getAllFixedExpenses,
  getExpenseById,
  getExpenses,
  getFixedExpenseById,
  getTotalExpenses,
  updateExpense,
  updateFixedExpense
} from '../controllers/store.controllers/expenseController.js';
import {
  createPeriod,
  deletePeriod,
  getAllPeriods,
  updatePeriod
} from '../controllers/store.controllers/periodController.js';
import {
  createDefectiveItem,
  getDefectiveItems,
  getNearingExpiration,
  getProductItemsByProductId
} from '../controllers/store.controllers/defectiveController.js';
import {validatePhoneNumber} from '../middlewares/phoneNumberMiddleware.js';
import {
  validateCreateAdmin,
  validateCreateCar,
  validateCreateDetailedAccount,
  validateCreateInventory,
  validateCreatePurchase,
  validateCreateReason,
  validateCreateRegion,
  validateCreateSale,
  validateCreateSubRegion,
  validateCreateSubUnit,
  validateCreateSupplier,
  validateCreateUnit,
  validatePatchSettlement,
  validatePostSettlement,
  validateReturnPurchase,
  validateReturnSale,
  validateUpdateAdmin,
  validateUpdateCar,
  validateUpdateReason,
  validateUpdateRegion,
  validateUpdateSubRegion,
  validateUpdateSubUnit,
  validateUpdateSupplier,
  validateUpdateUnit
} from '../middlewares/validationMiddlewaresRequest.js';
import {putSubSubCategoryInDB} from '../helper/calculateCompletionPercentage.js';
import {
  createAdvertisement,
  deleteAdvertisement,
  getAdvertisementById,
  getAllAdvertisements,
  updateAdvertisement
} from '../controllers/advertisementController.js';
import {
  createPayment,
  deletePayment,
  getAllPayment,
  getPaymentById,
  updatePayment
} from "../controllers/store.controllers/paymentController.js";
import {sendNotificationToSubregion, sendNotificationToSupplier} from "../controllers/notificationController.js";
import {transformOneItemInventory} from "../controllers/admin/InventoryController.js";

const uploadCategory = multer({ storage: storage('category') });
const uploadSlideShow = multer({ storage: storage('slideshow') });
const uploadDeliveryBoy = multer({ storage: storage('deliveryboy') });
const uploadProducts = multer({ storage: storage('product') });
const uploadCar = multer({ storage: storage('car') });

const Router = express.Router();

Router.get('/supplier', authenticate, getAllSupplier);
Router.get('/supplierForAdmin', getAllSupplierForAdmin);
Router.patch('/addBonusToSupplier/:id', addBonusToSupplier);
Router.get('/supplier/:id', getSupplier);
Router.delete('/supplier/:id', deleteSupplier);
Router.post('/supplier', validateCreateSupplier, validatePhoneNumber, createSupplier);
Router.patch('/supplier/products/:id', updateSupplierProducts);
Router.patch('/supplier/:id', validateUpdateSupplier, updateSupplier);
Router.get('/supplier/order/count', getSuppliersByOrderCount);

Router.get('/ml5saty', getProductByMl5saty);

Router.get('/customer', createCustomer);
Router.get('/customer/numberOfCustomer', getNumberOfCustomer)

Router.get('/product', getAllProduct);
Router.get('/product/all/category', getProductByCategorySubCategorySubSubCategory);
Router.get('/product/:id', getProductByProductId);
Router.post('/product', createProduct); // uploadProducts.array('images'),
Router.post('/product/uploadImage/:id', uploadProducts.single('image'), uploadProductImage);
Router.delete('/product/deleteImage/:id', deleteProductImage);
Router.patch('/product/:id', updateProduct);
Router.delete('/product/:id', deleteProduct);

Router.get('/getAllCategory', getAllCategory);
Router.post('/category', uploadCategory.single('image'), createCategory);
Router.patch('/category/:id', uploadCategory.single('image'), updateCategory);
Router.delete('/category/:id', deleteCategory);
Router.patch('/category/changeImage/:id', uploadCategory.single('image'), changeImageCategory);

Router.get('/subCategory/category/:id', getSubCategoryByCategory);
Router.delete('/subCategory/:id', deleteSubCategory);
Router.patch('/subCategory/:id', updateSubCategory);
Router.post('/subCategory', createSubCategory);

Router.get('/subSubCategory/subCategory/:id', getSubSubCategoryBySubCategory);
Router.delete('/subSubCategory/:id', deleteSubSubCategory);
Router.patch('/subSubCategory/:id', updateSubSubCategory);
Router.post('/subSubCategory', createSubSubCategory);

Router.get('/deliveryBoys', getAllDeliveryBoy);
Router.get('/deliveryBoy/orders/:deliveryId', getDeliveryOrders);
Router.get('/deliveryBoy/:id', getDeliveryById);
Router.post('/deliveryBoy', uploadDeliveryBoy.single('image'), createDeliveryBoy);
Router.patch('/deliverBoy/:id', updateDeliveryBoy);
Router.patch('/deliverBoy/changeImage/:id', uploadDeliveryBoy.single('image'), changeImageDeliveryBoy);
Router.delete('/deliveryBoy/:id', deleteDeliveryBoy);

Router.get('/offer', getAllOffer);
Router.post('/offer', createOffer);
Router.delete('/offer/:id', deleteOffer);

Router.post('/homeSlideShow', uploadSlideShow.single('image'), createHomeSlideShow);
Router.get('/homeSlideShow', getAllHomeSlideShow);
Router.delete('/homeSlideShow/:id', deleteHomeSlideShow);

Router.get('/order', getAllOrder);
Router.patch('/order/:id', updateOrder);
Router.get('/order/getOrderByIdOrOrderNumber/:id', getOrderByIdOrOrderNumber);
Router.get('/order/mostDistrict', mostFrequentDistricts);
Router.get('/order/numOfOrders', getNumOfOrders);
Router.patch('/order/returnPartOfOrder/:id', returnPartOfOrder);
Router.get('/getOrderByDelivery/:deliveryId', getOrderByDeliveryRoute);
Router.get('/getCustomerNotConfirmedOrders', getCustomerNotConfirmedOrders);
Router.get('/allGroups', getAllGroupForAdmin);
Router.get('/oneGroup/:id', getGroupById);

Router.get('/totalSales', getTotalSales);
Router.get('/totalSales/:id', totalSalesBySupplierId);
Router.get('/totalSalesByDay', getTotalSalesForEveryDay);
Router.get('/totalSalesBrief', getOrdersStatus);

Router.post('/unit', validateCreateUnit, createUnit);
Router.get('/unit', getAllUnits);
Router.patch('/unit/:id', validateUpdateUnit, updateUnit);
Router.delete('/unit/:id', deleteUnit);

Router.post('/subUnit', validateCreateSubUnit, createSubUnit);
Router.get('/subUnit', getAllSubUnits);
Router.patch('/subUnit/:id', validateUpdateSubUnit, updateSubUnit);
Router.delete('/subUnit/:id', deleteSubUnit);

Router.get('/car', getCars);
Router.post('/car', uploadCar.single('image'), validateCreateCar, createCar);
Router.patch('/car/:id', validateUpdateCar, updateCar);
Router.patch('/car/changeImage/:id', uploadCar.single('image'), changeImageCar);
Router.delete('/car/:id', deleteCar);
Router.post('/getCarByWeight', getCarByWeight);

Router.post('/region', validateCreateRegion, createRegion);
Router.get('/region', getAllRegion);
Router.delete('/region/:id', deleteRegion);
Router.patch('/region/:id', validateUpdateRegion, updateRegion);

Router.get('/subRegion', getAllSubRegion);
Router.post('/subRegion', validateCreateSubRegion, createSubRegion);
Router.get('/getSubRegionByRegionId/:id', getSubRegionByRegionId);
Router.delete('/subRegion/:id', deleteSubRegion);
Router.patch('/subRegion/:id', validateUpdateSubRegion, updateSubRegion);

Router.post('/promoCode', createPromoCode);
Router.get('/promoCode', getAllPromoCode);
Router.delete('/promoCode/:id', deletePromoCode);
Router.patch('/promoCode/:id', updatePromoCode);

Router.get('/reasons', getAllReasons);
Router.post('/reason', validateCreateReason, createReason);
Router.patch('/reason/:id', validateUpdateReason, updateReason);
Router.delete('/reason/:id', deleteReason);

Router.get('/period', getAllPeriods);
Router.post('/period', createPeriod);
Router.patch('/period/:id', updatePeriod);
Router.delete('/period/:id', deletePeriod);

Router.get('/admins', getAllAdmins);
Router.post('/admin', validateCreateAdmin, createAdmin);
Router.patch('/admin/:id', validateUpdateAdmin, updateAdmin);
Router.delete('/admin/:id', deleteAdmin);
Router.get('/admins-period/:id', getAdminsByPeriodId);

Router.get('/inventory', getAllInventory);
Router.get('/inventory/:id', getOneInventory);
Router.post('/inventory', validateCreateInventory, createInventory);
Router.patch('/inventory/:id', updateInventory);
Router.delete('/inventory/:id', deleteInventory);
Router.get('/inventory-products/:id', getProductsByInventoryId);

Router.get('/inventory-settlement', getSettlement); // تسوية
Router.post('/inventory-settlement', validatePostSettlement, postSettlement); // تسوية
Router.patch('/inventory-settlement', validatePatchSettlement, patchSettlement); // تسوية
Router.get('/inventory-entries', getEntries); // خزنة
Router.post('/treasuryOperation', createTreasuryOperation); // خزنة
Router.get('/treasury', getTreasury); // خزنة
Router.get('/globalCreditAndDebit', getGlobalCreditAndDebit); // خزنة

Router.get('/supplierInventory', getAllSupplierInventory);
Router.get('/supplierInventory/:id', getOneSupplierInventory);
Router.post('/supplierInventory', createSupplierInventory);
Router.patch('/supplierInventory/:id', updateSupplierInventory);
Router.delete('/supplierInventory/:id', deleteSupplierInventory);
Router.get('/supplierInventory-totalCredit', totalCredit);
Router.get('/sortedSupplierInventory', sortedSupplierInventory);
Router.get('/customerSupplierDetailedAccount/:id', getDetailedAccount);
Router.post('/customerSupplierDetailedAccount/:id', validateCreateDetailedAccount, createDetailedAccount);

Router.get('/customerInventory', getAllCustomerInventory);
Router.get('/customerInventory/:id', getOneCustomerInventory);
Router.post('/customerInventory', createCustomerInventory);
Router.patch('/customerInventory/:id', updateCustomerInventory);
Router.delete('/customerInventory/:id', deleteCustomerInventory);
Router.get('/customerInventory-totalDebit', totalDebit); 
Router.get('/sortedCustomerInventory', sortedCustomerInventory);

Router.get('/purchases', getAllPurchases); 
Router.get('/purchase/:id', getPurchaseById);
Router.post('/purchase', validateCreatePurchase, createPurchase);
Router.delete('/purchase/:id', deletePurchase);
Router.patch('/purchase/:id', validateReturnPurchase, returnPurchase); // مرتجع
Router.get('/purchase-returns/:id', getReturnsByPurchaseId); // مرتجع
Router.get('/purchase-calcTotalAmount', calcTotalAmountPurchase);

Router.get('/sales', getAllSales); 
Router.get('/sale/:id', getSaleById);
Router.post('/sale', validateCreateSale, createSale);
Router.delete('/sale/:id', deleteSale);
Router.patch('/sale/:id', validateReturnSale, returnSale); // مرتجع
Router.get('/sale-returns/:id', getReturnsBySaleId); // مرتجع
Router.get('/sale-report', getProductReport); // تقرير المبيعات والمشتريات والهوالك

Router.get('/purchaseProduct-productItems/:id', getProductItemsByProductId); // هالك
Router.get('/defectiveItems', getDefectiveItems); // هالك
Router.get('/nearingExpiration', getNearingExpiration); // هالك
Router.post('/defectiveItem', createDefectiveItem); // هالك

Router.get('/fixedExpenses', getAllFixedExpenses);
Router.get('/fixedExpense/:id', getFixedExpenseById);
Router.post('/fixedExpense', createFixedExpense);
Router.patch('/fixedExpense/:id', updateFixedExpense);
Router.delete('/fixedExpense/:id', deleteFixedExpense);

Router.get('/expenses', getExpenses);
Router.get('/expense/:id', getExpenseById);
Router.post('/expense', createExpense);
Router.patch('/expense/:id', updateExpense);
Router.delete('/expense/:id', deleteExpense);
Router.get('/totalExpenses', getTotalExpenses);

Router.get('/fee', getFee);
Router.post('/fee', createFee);
Router.get('/group/expireDate', getExpireDayGroup);
Router.post('/group/expireDate', createExpireDayGroup);
Router.get('/daysNumber/pending', getNumberOfPendingDays);
Router.post('/daysNumber/pending', createNumberOfPendingDays);
Router.get('/daysNumber/onDelivery', getNumberOfOnDeliveryDays);
Router.post('/daysNumber/onDelivery', createNumberOfOnDeliveryDays);
Router.get('/daysNumber/inProgress', getNumberOfInProgressDays);
Router.post('/daysNumber/inProgress', createNumberOfInProgressDays);
Router.get('/daysNumber/completeGroup', getNumberOfCompleteGroupDays);
Router.post('/daysNumber/completeGroup', createNumberOfCompleteGroupDays);

Router.post('/fine/pending', createFineForPending);
Router.delete('/fine/pending/:id', deleteFineForPending);
Router.get('/fine/pending', getFineForPending);
Router.post('/fine/onDelivery', createFineForOnDelivery);
Router.delete('/fine/onDelivery/:id', deleteFineForOnDelivery);
Router.get('/fine/onDelivery', getFineForOnDelivery);
Router.post('/fine/inProgress', createInProgressFine);
Router.delete('/fine/inProgress', deleteInProgressFine);
Router.get('/fine/inProgress', getInProgressFine);
Router.post('/fine/trash', createFineForTrash);
Router.delete('/fine/trash/:id', deleteFineForTrash);
Router.get('/fine/trash', getFineForTrash);
Router.post('/fine/cancel', createFineForCancel);
Router.delete('/fine/cancel/:id', deleteFineForCancel);
Router.get('/fine/cancel', getFineForCancel);
Router.post('/fine/completeGroup', createFineForCompleteGroup);
Router.get('/fine/completeGroup', getFineForCompleteGroup);

// just for test 
Router.post('/makesubcategory', putSubSubCategoryInDB)

// advertisement
Router.get('/advertisement/customer', getAllAdvertisements);
Router.get('/advertisement/customer/:id', getAllAdvertisements);
Router.get('/advertisement/:id', getAdvertisementById);
Router.post('/advertisement', createAdvertisement);
Router.patch('/advertisement/:id', updateAdvertisement);
Router.delete('/advertisement/:id', deleteAdvertisement);

Router.post('/payment',createPayment)
Router.get('/payment',getAllPayment)
Router.delete('/payment/:id',deletePayment)
Router.patch('/payment/:id',updatePayment)
Router.get('/payment/:id',getPaymentById)

Router.post('/notification/subRegion', sendNotificationToSubregion)
Router.post('/notification/supplier', sendNotificationToSupplier)

Router.get('/reports/sales', salesReport);

Router.post('/transfer', transformOneItemInventory);

export default Router;
