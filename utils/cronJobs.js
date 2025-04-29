import Offer from "../models/offerSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";

export const checkProductsAfterSaleExpireDate = async () => {
  try {
    const products = await SupplierProduct.find({
      afterSaleExpireDate: { $lt: new Date() },
      afterSale: { $gt: 0 },
    });
    if(products){
      for (const product of products) {
        product.afterSale = null;
        product.afterSaleExpireDate = null;
        await product.save();
      }
    }

  } catch (error) {
    console.error("Error checking after sale expire date:", error);
  }
}

export const  checkOffersAfterSaleExpireDate = async () => {
  try {
    const offers = await Offer.find({
      afterSaleExpireDate: { $lt: new Date() },
      afterSale: { $gt: 0 },
    });
    if(offers){
      for (const offer of offers) {
        offer.afterSale = null;
        offer.afterSaleExpireDate = null;
        await offer.save();
      }
    }

  } catch (error) {
    console.error("Error checking after sale expire date:", error);
  }
}