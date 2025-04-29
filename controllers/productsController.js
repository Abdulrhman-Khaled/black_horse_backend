import fs from "fs";
import mongoose from "mongoose";
import Product from "../models/productSchema.js";
import Offer from "../models/offerSchema.js";
import Order from "../models/orderSchema.js";
import SupplierProduct from "../models/supplierProductSchema.js";
import {
	transformationInventoryProduct,
	transformationOffer,
	transformationOrderProduct,
	transformationProduct,
	transformationSupplierProduct,
} from "../format/transformationObject.js";
import Supplier from "../models/supplierSchema.js";
import {getProductInInventory} from "./store.controllers/InventoryController.js";
import PurchaseItem from "../models/store.models/purchaseItemSchema.js";
import Customer from "../models/customerSchema.js";
import {ObjectId} from "mongodb";
import SaleItem from "../models/store.models/saleItemSchema.js";

export const createProduct = async (req, res) => {
	const {
		title,
		desc,
		weight,
		barcode,
		units,
		subUnit,
		category,
		subCategory,
		subSubCategory,
	} = req.body;

	try {
		// Normalize and check for duplicate title and barcode
		const normalizedTitle = title.trim().replace(/\s+/g, " "); // Normalize spaces and trim
		const regexTitle = new RegExp(["^", normalizedTitle, "$"].join(""), "i"); // Case insensitive match

		const existingProductByTitle = await Product.findOne({
			title: {$regex: regexTitle},
		});
		if (existingProductByTitle) {
			return res.status(207).json({
				status: "fail",
				message: "Title already exists",
			});
		}
		const existingProductByBarcode = await Product.findOne({barcode});
		if (existingProductByBarcode) {
			return res.status(208).json({
				status: "fail",
				message: "Barcode already exists",
			});
		}

		// Validate related documents exist
		const Unit = mongoose.model("Unit");
		const SubUnit = mongoose.model("SubUnit");
		const Category = mongoose.model("Category");
		const SubCategory = mongoose.model("SubCategory");
		const SubSubCategory = mongoose.model("SubSubCategory");

		const unitExists = await Unit.find({
			_id: {$in: units.map((u) => u._id)},
		});
		if (unitExists.length !== units.length) {
			return res.status(404).json({
				status: "fail",
				message: "One or more Units not found",
			});
		}

		const subUnitExists = await SubUnit.findById(subUnit._id);
		if (!subUnitExists) {
			return res.status(404).json({
				status: "fail",
				message: "SubUnit not found",
			});
		}

		const categoryExists = await Category.findById(category._id);
		if (!categoryExists) {
			return res.status(404).json({
				status: "fail",
				message: "Category not found",
			});
		}

		const subCategoryExists = await SubCategory.findById(subCategory._id);
		if (!subCategoryExists) {
			return res.status(404).json({
				status: "fail",
				message: "SubCategory not found",
			});
		}

		const subSubCategoryExists = subSubCategory
			? await SubSubCategory.findById(subSubCategory._id)
			: null;
		if (subSubCategory && !subSubCategoryExists) {
			return res.status(404).json({
				status: "fail",
				message: "SubSubCategory not found",
			});
		}

		// Create new product
		const newProduct = new Product({
			title,
			desc,
			weight,
			units: units.map((u) => u._id),
			subUnit: subUnit._id,
			category: category._id,
			subCategory: subCategory._id,
			subSubCategory: subSubCategory ? subSubCategory._id : null,
			barcode,
		});

		await newProduct.save();
		res.status(201).json({
			status: "success",
			data: await transformationProduct(newProduct),
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const updateProduct = async (req, res) => {
	const productId = req.params.id;
	const productData = req.body;
	try {
		if (productData.units) {
			productData.units = productData.units.map(({_id}) => _id);
		}
		if (productData.subUnit) {
			productData.subUnit = productData.subUnit._id;
		}
		if (productData.category) {
			productData.category = productData.category._id;
		}
		if (productData.subCategory) {
			productData.subCategory = productData.subCategory._id;
		}
		if (productData.subSubCategory) {
			productData.subSubCategory = productData.subSubCategory._id;
		}
		const updatedProduct = await Product.findByIdAndUpdate(
			productId,
			productData,
			{new: true}
		);
		if (updatedProduct) {
			res.status(200).json({
				status: "success",
				data: await transformationProduct(updatedProduct),
			});
		} else {
			throw new Error(`Product not found`);
		}
	} catch (error) {
		if (
			error.code === 11000 &&
			error.keyPattern &&
			error.keyPattern.title === 1
		) {
			res.status(207).json({
				status: "fail",
				message: "Duplicate title",
			});
		} else if (
			error.code === 11000 &&
			error.keyPattern &&
			error.keyPattern.barcode === 1
		) {
			res.status(208).json({
				status: "fail",
				message: "Duplicate barcode",
			});
		} else {
			res.status(500).json({
				status: "fail",
				message: error.message,
			});
		}
	}
};
export const deleteProduct = async (req, res) => {
	const productId = req.params.id;
	try {
		await Product.updateOne({_id: productId}, {$set: {deletedAt: Date.now()}});
		res.status(204).json({
			status: "success",
		})
	} catch (error) {
		res.status(error.statusCode || 404).json({
			status: "fail",
			message: error.message || "Not Found",
		});
	}
};
export const getProductBySupplier = async (req, res) => {
	const supplierId = new mongoose.Types.ObjectId(req.params.id);
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const skip = (page - 1) * limit;
	const sortDirection = req.query.price === "1" ? -1 : 1;

	try {
		const supplier = await Supplier.findById(supplierId);
		if (!supplier) {
			return res.status(404).json({
				status: "fail",
				message: "Supplier not found",
			});
		}

		const titleMatch = req.query.search
			? {"productInfo.title": new RegExp(`^${req.query.search}`, "i")}
			: {};
		const categoryMatch = req.query.category
			? {
				"productInfo.category": new mongoose.Types.ObjectId(
					req.query.category
				),
			}
			: {};
		const subCategoryMatch = req.query.subCategory
			? {
				"productInfo.subCategory": new mongoose.Types.ObjectId(
					req.query.subCategory
				),
			}
			: {};
		const subSubCategoryMatch = req.query.subSubCategory
			? {
				"productInfo.subSubCategory": new mongoose.Types.ObjectId(
					req.query.subSubCategory
				),
			}
			: {};
		const bestSellerMatch =
			req.query.bestSeller && req.query.bestSeller == 1
				? {"productInfo.frequency": {$gt: 0}}
				: {};

		const pagination = req.query.isPagination
			? [{$skip: skip}, {$limit: limit}]
			: [];

		const supplierProducts = await SupplierProduct.aggregate([
			{$match: {supplierId: supplierId, stock: {$gt: 0}}},
			{
				$lookup: {
					from: "products",
					localField: "productId",
					foreignField: "_id",
					as: "productInfo",
				},
			},
			{$unwind: "$productInfo"},
			{
				$match: {
					...titleMatch,
					...categoryMatch,
					...subCategoryMatch,
					...subSubCategoryMatch,
					...bestSellerMatch,
				},
			},
			{
				$sort:
					req.headers["user-type"] === "supplier"
						? {createdAt: -1}
						: {price: sortDirection},
			},
			...pagination
		]);

		const transformedProducts = await Promise.all(
			supplierProducts.map(
				async (supplierProduct) =>
					await transformationSupplierProduct(supplierProduct)
			)
		);

		return res.status(200).json({
			status: "success",
			page: page,
			data: transformedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getOutOfStockProductBySupplier = async (req, res) => {
	// done
	let query = {};
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	try {
		if (req.query.search) {
			query.title = new RegExp(`^${req.query.search}`, "i");
		}
		const supplierProducts = await SupplierProduct.aggregate([
			{
				$lookup: {
					from: "products",
					let: {productId: "$productId"},
					pipeline: [
						{$match: {$expr: {$eq: ["$_id", "$$productId"]}}},
						{$match: query},
					],
					as: "productData",
				},
			},
			{$unwind: "$productData"},

			{
				$match: {
					supplierId: new mongoose.Types.ObjectId(req.params.id),
					stock: 0,
				},
			},
			{$sort: {updatedAt: -1}},
			{$skip: (page - 1) * limit},
			{$limit: limit},
		]);

		const transformedProducts = await Promise.all(
			supplierProducts.map(async (supplierProduct) => {
				return await transformationSupplierProduct(supplierProduct);
			})
		);
		res.status(200).json({
			status: "success",
			page: page,
			data: transformedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getProductWithAfterSaleBySupplier = async (req, res) => {
	// done
	let query = {};
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	try {
		if (req.query.search) {
			query.title = new RegExp(`^${req.query.search}`, "i");
		}
		const supplierProducts = await SupplierProduct.aggregate([
			{
				$lookup: {
					from: "products",
					let: {productId: "$productId"},
					pipeline: [
						{$match: {$expr: {$eq: ["$_id", "$$productId"]}}},
						{$match: query},
					],
					as: "productData",
				},
			},
			{$unwind: "$productData"},

			{
				$match: {
					supplierId: new mongoose.Types.ObjectId(req.params.id),
					stock: {$gt: 0},
					afterSale: {$gt: 0},
				},
			},
			{$sort: {updatedAt: -1}},
			{$skip: (page - 1) * limit},
			{$limit: limit},
		]);

		const transformedProducts = await Promise.all(
			supplierProducts.map(async (supplierProduct) => {
				return await transformationSupplierProduct(supplierProduct);
			})
		);
		res.status(200).json({
			status: "success",
			page: page,
			data: transformedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getProductByCategory = async (req, res) => {
	// here
	const customerId = req.params.customerId; // Assuming customer ID is passed in the request body
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const skip = (page - 1) * limit;

	try {
		const customer = await Customer.findById(customerId);
		if (!customer) {
			return res.status(404).json({
				status: "fail",
				message: "Customer not found",
			});
		}

		const titleSearch = req.query.search
			? new RegExp(req.query.search, "i")
			: null;
		const supplierProducts = await SupplierProduct.aggregate([
			{
				$lookup: {
					from: "suppliers",
					localField: "supplierId",
					foreignField: "_id",
					as: "supplierInfo",
				},
			},
			{$unwind: "$supplierInfo"},
			{
				$match: {
					"supplierInfo.status": "active",
					"supplierInfo.isDeleted": false,
					"supplierInfo.deliveryRegion": {
						$elemMatch: {_id: new mongoose.Types.ObjectId(customer.region)},
					},
				},
			},
			{
				$lookup: {
					from: "products",
					localField: "productId",
					foreignField: "_id",
					as: "productInfo",
				},
			},
			{$unwind: "$productInfo"},
			{
				$match: {
					"productInfo.category": new mongoose.Types.ObjectId(req.params.id),
				},
			},
			...(titleSearch
				? [{$match: {"productInfo.title": titleSearch}}]
				: []),
			{$sort: {createdAt: -1}},
			{$skip: skip},
			{$limit: limit},
			{
				$project: {
					_id: 1,
					name: 1,
					price: 1,
					createdAt: 1,
					supplierId: 1,
					supplierName: "$supplierInfo.name",
				},
			},
		]);

		const transformedProducts = await Promise.all(
			supplierProducts.map(async (supplierProduct) => {
				const supplierProductData = await SupplierProduct.findById(
					supplierProduct._id
				);
				return await transformationSupplierProduct(supplierProductData);
			})
		);

		res.status(200).json({
			status: "success",
			page: page,
			data: transformedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getAllProductAssignedToSupplier = async (req, res) => {
	// here
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const skip = (page - 1) * limit;
	const sortDirection = req.query.price === "1" ? -1 : 1;
	const customerId = req.params.customerId;

	try {
		let customer;

		if (customerId) {
			customer = await Customer.findById(customerId).select("subRegion");

			if (!customer) {
				return res.status(404).json({
					status: "fail",
					message: "Customer not found",
				});
			}
		}

		const titleSearch = req.query.search ? new RegExp(req.query.search, "i") : null;
		const supplierProducts = await SupplierProduct.aggregate([
			{
				$lookup: {
					from: "suppliers",
					localField: "supplierId",
					foreignField: "_id",
					as: "supplierInfo",
				},
			},
			{$unwind: "$supplierInfo"},
			{
				$match: {
					"supplierInfo.isDeleted": false,
					"supplierInfo.status": "active",
					...(customer ? {"supplierInfo.deliveryRegion": {$elemMatch: {_id: new mongoose.Types.ObjectId(customer.region)}}} : {})
				},
			},
			{
				$lookup: {
					from: "products",
					localField: "productId",
					foreignField: "_id",
					as: "productInfo",
				},
			},
			{$unwind: "$productInfo"},
			...(titleSearch
				? [{$match: {"productInfo.title": titleSearch}}]
				: []),
			{$sort: {price: sortDirection}},
			{$skip: skip},
			{$limit: limit},
			{
				$project: {
					_id: 1,
					name: 1,
					price: 1,
					createdAt: 1,
					supplierId: 1,
					supplierName: "$supplierInfo.name",
				},
			},
		]);
		const transformedProducts = await Promise.all(
			supplierProducts.map(async (supplierProduct) => {
				const supplierProductData = await SupplierProduct.findById(
					supplierProduct._id
				).populate("supplierId");
				return await transformationSupplierProduct(supplierProductData);
			})
		);
		res.status(200).json({
			status: "success",
			page: page,
			data: transformedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getAllProduct = async (req, res) => {
	let query = {deletedAt: null};
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	try {
		let products;
		let supplierProductBlackHorse;
		if (req.query.search) {
			query.title = new RegExp(`^${req.query.search}`, "i");
		}
		if (req.query.barcode) {
			query.barcode = req.query.barcode;
		}
		if (req.query.searchToPurchase) {
			query.title = new RegExp("^" + req.query.searchToPurchase, "i");
		}
		if (req.query.subSubCategory) {
			query.subSubCategory = new mongoose.Types.ObjectId(
				req.query.subSubCategory
			);
		} else if (req.query.subCategory) {
			query.subCategory = new mongoose.Types.ObjectId(req.query.subCategory);
		} else if (req.query.category) {
			query.category = new mongoose.Types.ObjectId(req.query.category);
		}

		let pipelineAggregation = [{$match: query}];
		if (req.query.bestSeller) {
			pipelineAggregation.push(
				{
					$lookup: {
						from: "orders",
						localField: "_id",
						foreignField: "products.product",
						as: "orderDetails",
					},
				},
				{
					$unwind: {
						path: "$orderDetails",
						preserveNullAndEmptyArrays: false,
					},
				},
				{
					$unwind: {
						path: "$orderDetails.products",
						preserveNullAndEmptyArrays: false,
					},
				},
				{
					$match: {"orderDetails.status": "complete"},
				},
				{
					$group: {
						_id: "$orderDetails.products.product",
						totalSold: {$sum: "$orderDetails.products.quantity"},
					},
				},
				{
					$sort: {totalSold: -1},
				},
				{
					$lookup: {
						from: "products",
						localField: "_id",
						foreignField: "_id",
						as: "productDetails",
					},
				},
				{
					$unwind: {
						path: "$productDetails",
						preserveNullAndEmptyArrays: false,
					},
				},
				{
					$replaceRoot: {newRoot: "$productDetails"},
				},
				{
					$skip: (page - 1) * limit,
				},
				{
					$limit: limit,
				}
			);
		} else if (req.query.random) {
			pipelineAggregation.push({$sample: {size: +req.query.random}});
		} else {
			pipelineAggregation.push(
				{$skip: (page - 1) * limit},
				{$limit: limit}
			);
		}

		if (req.query.pagination === "notExist") {
			products = await Product.find(query);
		} else if (req.headers["type"] === "blackHorse") {
			pipelineAggregation = getProductInInventory(query);
			pipelineAggregation.push({
				$addFields: {
					"product.reminderQuantity": "$reminderQuantity",
					"product.expiryDate": "$expiryDate",
					"product.retailPrice": "$retailPrice",
					"product.wholesalePrice": "$wholesalePrice",
					"product.haveWholeSalePrice": "$haveWholeSalePrice",
					"product.costPrice": "$costPrice",
				},
			});
			pipelineAggregation.push({$replaceRoot: {newRoot: "$product"}});
			pipelineAggregation.push(
				{$skip: (page - 1) * limit},
				{$limit: limit}
			);
			products = await PurchaseItem.aggregate(pipelineAggregation).exec();
			const supplierBlackHorse = await Supplier.findOne({type: "blackHorse"});
			supplierProductBlackHorse = await SupplierProduct.find({
				supplierId: supplierBlackHorse._id,
				productId: {$in: products.map(product => product._id)}
			});
		} else {
			products = await Product.aggregate(pipelineAggregation).exec();
		}
		const transformedProducts = await Promise.all(
			products.map(
				async (product) => {
					if (req.headers["type"] === "blackHorse") {
						const stock = supplierProductBlackHorse.filter(sp => sp.productId.equals(product._id))
							.reduce((acc, sp) => acc + sp.stock, 0);

						return await transformationProduct(product, {stock});
					} else {
						return await transformationProduct(product);
					}
				}
			)
		);
		res.status(200).json({
			status: "success",
			page: page,
			totalPages: Math.ceil((await Product.countDocuments(query)) / limit),
			data: transformedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getProductsByOfferId = async (req, res) => {
	// done
	const offerId = req.params.id;
	try {
		const offer = await Offer.findById(offerId);
		if (!offer) {
			return res.status(200).json({
				status: "success",
				data: [],
				message: "Offer not found",
			});
		}
		let offerProducts = [];
		for (const prod of offer.products) {
			const sp = await SupplierProduct.findById(prod.productId);
			offerProducts.push(
				await transformationSupplierProduct(sp, prod.quantity)
			);
		}
		res.status(200).json({
			status: "success",
			data: offerProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getProductByOrderId = async (req, res) => {
	// done
	const orderId = req.params.id;
	try {
		const order = await Order.findById(orderId).sort({createdAt: -1});
		res.status(200).json({
			status: "success",
			data: await transformationOrderProduct(order),
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const uploadProductImage = async (req, res) => {
	// done
	const productId = req.params.id;
	try {
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(207).json({
				status: "fail",
				message: "product not found",
			});
		}
		const imagePath = `${process.env.SERVER_URL}${req.file.path
			.replace(/\\/g, "/")
			.replace(/^upload\//, "")}`;
		product.images = product.images.concat([imagePath]);
		await product.save();
		res.status(200).json({
			status: "success",
			data: await transformationProduct(product),
		});
	} catch (error) {
		return res.status(500).json({
			status: "error",
			message: error.message,
		});
	}
};
export const deleteProductImage = async (req, res) => {
	// done
	const productId = req.params.id;
	const productImage = req.body.image;
	try {
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(207).json({
				status: "fail",
				message: "product not found",
			});
		}

		if (product.images.includes(productImage)) {
			const pathName = productImage.split("/").slice(3).join("/");
			fs.unlink("upload/" + pathName, (err) => {
			});
		}

		product.images = product.images.filter((image) => image !== productImage);
		await product.save();
		res.status(200).json({
			status: "success",
			data: await transformationProduct(product),
		});
	} catch (error) {
		return res.status(500).json({
			status: "error",
			message: error.message,
		});
	}
};
export const averagePriceForProduct = async (req, res) => {
	// done
	const productId = req.params.id;
	let gomlaAveragePrice = 0;
	let nosGomlaAveragePrice = 0;
	try {
		const supplierProducts = await SupplierProduct.find({
			productId: productId,
		});
		const NumberOfGomlaProduct = supplierProducts.filter(
			(sp) => sp.unit
		).length;
		const NumberOfNosGomlaProduct = supplierProducts.filter(
			(sp) => !sp.unit
		).length;
		for (const sp of supplierProducts) {
			if (sp.unit) {
				gomlaAveragePrice += sp.price;
			} else {
				nosGomlaAveragePrice += sp.price;
			}
		}
		res.status(200).json({
			status: "success",
			data: {
				gomlaAveragePrice: gomlaAveragePrice / NumberOfGomlaProduct,
				nosGomlaAveragePrice: nosGomlaAveragePrice / NumberOfNosGomlaProduct,
			},
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getProductBySubCategory = async (req, res) => {
	// done
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const skip = (page - 1) * limit;
	try {
		const titleSearch = req.query.search
			? new RegExp(req.query.search, "i")
			: null;
		const supplierProducts = await SupplierProduct.aggregate([
			{
				$lookup: {
					from: "suppliers",
					localField: "supplierId",
					foreignField: "_id",
					as: "supplierInfo",
				},
			},
			{$unwind: "$supplierInfo"},
			{$match: {"supplierInfo.isDeleted": false}},
			{
				$lookup: {
					from: "products",
					localField: "productId",
					foreignField: "_id",
					as: "productInfo",
				},
			},
			{$unwind: "$productInfo"},
			{
				$match: {
					"productInfo.subCategory": new mongoose.Types.ObjectId(req.params.id),
					...req.query.thirdCategory ? {"productInfo.subSubCategory": new mongoose.Types.ObjectId(req.query.thirdCategory)} : {},
				},
			},
			...(titleSearch
				? [{$match: {"productInfo.title": titleSearch}}]
				: []),
			{$sort: {createdAt: -1}},
			{$skip: skip},
			{$limit: limit},
			{
				$project: {
					_id: 1,
					name: 1,
					price: 1,
					createdAt: 1,
					supplierId: 1,
					supplierName: "$supplierInfo.name",
				},
			},
		]);

		const transformedProducts = await Promise.all(
			supplierProducts.map(async (supplierProduct) => {
				const supplierProductData = await SupplierProduct.findById(
					supplierProduct._id
				);
				return await transformationSupplierProduct(supplierProductData);
			})
		);
		res.status(200).json({
			status: "success",
			page: page,
			data: transformedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getBestProduct = async (req, res) => {
	// here
	const customerId = req.params.customerId; // Assuming customer ID is passed in the request body

	try {
		const customer = await Customer.findById(customerId);
		if (!customer) {
			return res.status(404).json({
				status: "fail",
				message: "Customer not found",
			});
		}

		const supplierProducts = await SupplierProduct.aggregate([
			{
				$lookup: {
					from: "suppliers",
					localField: "supplierId",
					foreignField: "_id",
					as: "supplierInfo",
				},
			},
			{$unwind: "$supplierInfo"},
			{
				$match: {
					"supplierInfo.status": "active",
					"supplierInfo.isDeleted": false,
					"supplierInfo.deliveryRegion": {
						$elemMatch: {_id: new mongoose.Types.ObjectId(customer.region)}
					},
				},
			},
			{$group: {_id: "$productId", doc: {$first: "$$ROOT"}}},
			{$replaceRoot: {newRoot: "$doc"}},
			{$sort: {frequency: -1}},
			{$limit: 10},
		]);

		const formattedProducts = await Promise.all(
			supplierProducts.map(
				async (supplierProduct) =>
					await transformationSupplierProduct(supplierProduct)
			)
		);

		res.status(200).json({
			status: "success",
			data: formattedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getProductByMl5saty = async (req, res) => {
	// here
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const skip = (page - 1) * limit;
	const customerId = req.params.customerId; // Assuming customer ID is passed in the request params

	try {
		let customer;

		if (customerId) {
			customer = await Customer.findById(customerId);

			if (!customer) {
				return res.status(404).json({
					status: "fail",
					message: "Customer not found",
				});
			}
		}

		let query = {};
		if (req.query.search) {
			query.title = {$regex: req.query.search, $options: "i"};
		} else if (req.query.subSubCategory) {
			query.subSubCategory = new mongoose.Types.ObjectId(
				req.query.subSubCategory
			);
		} else if (req.query.subCategory) {
			query.subCategory = new mongoose.Types.ObjectId(req.query.subCategory);
		} else if (req.query.category) {
			query.category = new mongoose.Types.ObjectId(req.query.category);
		}

		const products = await Product.find(query);
		const results = await SupplierProduct.aggregate([
			{
				$match: {productId: {$in: products.map((product) => product._id)}},
			},
			{
				$lookup: {
					from: "suppliers",
					localField: "supplierId",
					foreignField: "_id",
					as: "supplier",
				},
			},
			{$unwind: "$supplier"},
			{
				$match: {
					"supplier.isDeleted": false,
					"supplier.status": "active",
					... (customer ? {"supplier.deliveryRegion": {$elemMatch: {_id: new mongoose.Types.ObjectId(customer.region)}}} : {})
				},
			},
			{
				$facet: {
					unitProducts: [
						{$match: {unit: {$ne: null}}},
						{
							$group: {
								_id: "$productId",
								minPriceDoc: {$min: "$price"},
								docs: {$push: "$$ROOT"},
							},
						},
						{
							$addFields: {
								minPriceDoc: {
									$filter: {
										input: "$docs",
										as: "doc",
										cond: {$eq: ["$$doc.price", "$minPriceDoc"]},
									},
								},
							},
						},
						{$unwind: "$minPriceDoc"},
						{
							$project: {
								_id: 1,
								minPrice: "$minPriceDoc.price",
								supplierProductId: "$minPriceDoc._id",
							},
						},
						{$sort: {minPrice: 1}},
						{$skip: skip},
						{$limit: limit},
					],
					subUnitProducts: [
						{$match: {unit: {$eq: null}}},
						{
							$group: {
								_id: "$productId",
								minPriceDoc: {$min: "$price"},
								docs: {$push: "$$ROOT"},
							},
						},
						{
							$addFields: {
								minPriceDoc: {
									$filter: {
										input: "$docs",
										as: "doc",
										cond: {$eq: ["$$doc.price", "$minPriceDoc"]},
									},
								},
							},
						},
						{$unwind: "$minPriceDoc"},
						{
							$project: {
								_id: 1,
								minPrice: "$minPriceDoc.price",
								supplierProductId: "$minPriceDoc._id",
							},
						},
						{$sort: {minPrice: 1}},
						{$skip: skip},
						{$limit: limit},
					],
				},
			},
		]);

		// Combine and sort the results if needed
		const unitProducts = results[0].unitProducts;
		const subUnitProducts = results[0].subUnitProducts;
		const combinedResults = [...unitProducts, ...subUnitProducts];
		combinedResults.sort((a, b) => a.minPrice - b.minPrice);

		const transformedProducts = await Promise.all(
			combinedResults.map(async (supplierProduct) => {
				const supplierProductData = await SupplierProduct.findById(
					supplierProduct.supplierProductId
				);
				return await transformationSupplierProduct(supplierProductData);
			})
		);
		return res.status(200).json({
			status: "success",
			page: page,
			data: transformedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const getProductByProductId = async (req, res) => {
	try {
		const productId = req.params.id;

		const purchase = await PurchaseItem.aggregate([
			{$match: {product: new ObjectId(productId)}},
			{$group:{_id: null,total: {$sum: { $multiply: ["$quantity", "$costPrice"]}}}}
		]);

		const sales = await SaleItem.aggregate([
			{$match: {product: new ObjectId(productId)}},
			{$group:{_id: null,total: {$sum: { $multiply: ["$quantity", "$salePrice"]}}}}
		]);

		const totalPurchases = purchase[0].total;
		const totalSales = sales[0].total;

		res.status(200).json({
			status: "success",
			data: {
				totalPurchases,
				totalSales,
				balance: totalSales - totalPurchases
			}
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};
export const productsContainAfterSale = async (req, res) => {
	// here
	try {
		const customer = await Customer.findById(req.params.customerId).select(
			"subRegion"
		);
		if (!customer) {
			return res.status(404).json({
				status: "fail",
				message: "Customer not found",
			});
		}

		const hasAfterSale = await SupplierProduct.aggregate([
			{
				$lookup: {
					from: "suppliers",
					localField: "supplierId",
					foreignField: "_id",
					as: "supplierInfo",
				},
			},
			{$unwind: "$supplierInfo"},
			{
				$match: {
					"supplierInfo.status": "active",
					"supplierInfo.isDeleted": false,
					"supplierInfo.deliveryRegion": {
						$elemMatch: {_id: new mongoose.Types.ObjectId(customer.region)}
					},
				},
			},
			{$match: {afterSale: {$exists: true, $ne: null}}},
		]);
		return res.status(200).json({
			status: "success",
			data: hasAfterSale.length > 0,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};

// check after sale product on the cart in frontend if the product has after sale
export const checkAfterSale = async (req, res) => {
	try {
		const {products, offers} = req.body; // Destructure products and offers from the request body
		const productIds = products.map((product) => product._id);
		const offerIds = offers.map((offer) => offer._id);

		// Fetch supplier products and offers
		const supplierProducts = await SupplierProduct.find({
			_id: {$in: productIds},
		}).select("_id price afterSale");

		const supplierOffers = await Offer.find({
			_id: {$in: offerIds},
		}).select("_id price afterSale");

		const mismatchedProducts = findMismatchedItems(products, supplierProducts);
		const mismatchedOffers = findMismatchedItems(offers, supplierOffers);

		const transformedProduct = await Promise.all(
			mismatchedProducts.map(async (product) => {
				const supplierProduct = await SupplierProduct.findById(product._id);
				return await transformationSupplierProduct(supplierProduct);
			})
		);
		const transformedOffer = await Promise.all(
			mismatchedOffers.map(async (offer) => {
				const supplierOffer = await Offer.findById(offer._id);
				return await transformationOffer(supplierOffer);
			})
		);

		res.status(200).json({
			status: "success",
			data: {
				products: transformedProduct,
				offers: transformedOffer,
			},
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
};

/***************************************** Helper Functions *****************************************/
// Function to check for mismatches in products or offers
function findMismatchedItems(requestedItems, dbItems) {
	return requestedItems
		.map((item) => {
			const correspondingDbItem = dbItems.find(
				(dbItem) => dbItem._id.toString() === item._id
			);

			if (correspondingDbItem) {
				const {price: dbPrice, afterSale: dbAfterSale} = correspondingDbItem;
				const {price: reqPrice, afterSale: reqAfterSale} = item;

				// 1. Do not return the item if both price and afterSale are equal
				if (reqPrice === dbPrice && reqAfterSale === dbAfterSale) {
					return null;
				}

				// 2. Do not return the item if afterSale is equal and not null, even if the price differs
				if (reqAfterSale === dbAfterSale && reqAfterSale !== null) {
					return null;
				}

				// Return the item if there's a mismatch
				return item;
			}

			return null;
		})
		.filter((item) => item !== null);
}

const getAppQuantitySystemQuantityForProduct = async (product) => {
	const appQuantity = SupplierProduct.findById(product).stock;
	const systemQuantity = PurchaseItem.findOne({product: product, reminderQuantity: {$gt: 0}}).reminderQuantity;
	return {
		appQuantity,
		systemQuantity
	}
}

export const getProductByCategorySubCategorySubSubCategory = async (req, res) => {
	const type = req.query.type;
	let query = {};
	try {
		if (req.query.search) {
			query.title = new RegExp(req.query.search, 'i');
		}
		if (req.query.category) {
			query.category = new mongoose.Types.ObjectId(req.query.category);
		}
		if (req.query.subCategory) {
			query.subCategory = new mongoose.Types.ObjectId(req.query.subCategory);
		}
		if (req.query.subSubCategory) {
			query.subSubCategory = new mongoose.Types.ObjectId(req.query.subSubCategory);
		}
		if (!req.query.withTrashed) {
			query.deletedAt = null;
		}
		let products = [];
		if (type === 'sale') {
			// Select from PurchaseItem for sales
			const pipelineAggregation = [
				{
					$lookup: {
						from: "products",
						let: {productId: "$product"},
						pipeline: [
							{$match: {$expr: {$eq: ["$_id", "$$productId"]}}},
							{$match: query}
						],
						as: "productInfo"
					}
				},
				{$unwind: "$productInfo"},
				{$match: {reminderQuantity: {$gt: 0}}},
				{
					$group: {
						_id: "$productInfo._id",
						product: {$first: "$$ROOT"}
					}
				},
				{
					$replaceRoot: {newRoot: "$product"}
				}
			];
			products = await PurchaseItem.aggregate(pipelineAggregation).exec();
		} else {
			// Default to selecting from Product for purchases
			const pipelineAggregation = [{$match: query}];
			products = await Product.aggregate(pipelineAggregation).exec();
		}

		// if (!products || products.length === 0) {
		//   return res.status(404).json({
		//     status: "fail",
		//     message: "No products found"
		//   });
		// }

		const transformedProducts = await Promise.all(
			products.map(async (product) => {
				if (type === 'sale') {
					return await transformationInventoryProduct(product); // Assuming transformationInventoryProduct is defined for transforming PurchaseItem
				} else {
					return await transformationProduct(product);
				}
			})
		);

		res.status(200).json({
			status: "success",
			data: transformedProducts,
		});
	} catch (error) {
		res.status(500).json({
			status: "fail",
			message: error.message,
		});
	}
}
