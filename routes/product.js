import express from 'express';
import { averagePriceForProduct, checkAfterSale, getOutOfStockProductBySupplier, getProductByMl5saty, getProductByOrderId, getProductBySubCategory, getProductBySupplier, getProductsByOfferId, getProductWithAfterSaleBySupplier, productsContainAfterSale } from '../controllers/productsController.js';

const Router = express.Router();

Router.get('/supplier/:id', getProductBySupplier);
Router.get('/supplier-outOfStock/:id', getOutOfStockProductBySupplier);

Router.get('/afterSale/:id', getProductWithAfterSaleBySupplier);
Router.get('/contain/afterSale/:customerId', productsContainAfterSale)
// check if the products in the card contain the afterSale or updated or deleted
Router.post ('/check/afterSale',checkAfterSale)

Router.get('/offer/:id', getProductsByOfferId)

Router.get('/order/:id', getProductByOrderId)

Router.get('/averagePrice/:id', averagePriceForProduct);

Router.get('/subCategory/:id', getProductBySubCategory);

Router.get('/ml5saty/customer/:customerId', getProductByMl5saty);

export default Router;