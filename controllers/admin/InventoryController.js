// transform functions to transform between the stock of the supplier and inventory of the supplier;
import mongoose from "mongoose";
import Supplier from "../../models/supplierSchema.js";
import PurchaseItem from "../../models/store.models/purchaseItemSchema.js";
import Product from "../../models/productSchema.js";
import SupplierProduct from "../../models/supplierProductSchema.js";

export const transformOneItemInventory = async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const {productId, transferTo, transferAmount, transferPrice} = req.body;
		const supplier = await Supplier.findOne({type: 'blackHorse'}).session(session);

		if (!supplier) {
			await session.abortTransaction();
			await session.endSession();

			return res.status(404).json({
				status: "fail",
				message: "Supplier not found",
			});
		}

		if (transferTo === 'toSupplier') {
			const purchaseProduct = await PurchaseItem.aggregate([
				{ $match: { product: new mongoose.Types.ObjectId(productId) } },
				{
					$group: {
						_id: null,
						totalReminderQuantity: {$sum: "$reminderQuantity"}
					}
				}
			]).session(session);

			if (!purchaseProduct || purchaseProduct[0].totalReminderQuantity < transferAmount) {
				await session.abortTransaction();
				await session.endSession();
				return res.status(207).json({
					status: "fail",
					message: `Purchase product with ID ${productId} not found or has no remaining quantity enough`,
				});
			}

			const adminProduct = await Product.findById(productId).session(session).exec();

			if (!adminProduct) {
				await session.abortTransaction();
				await session.endSession();
				return res.status(404).json({
					status: "fail",
					message: `Admin product with ID ${productId} not found`,
				});
			}

			const purchaseItems = await PurchaseItem.find({
				product: new mongoose.Types.ObjectId(productId),
			}).sort({expiryDate: 1}).session(session);

			let quantity = transferAmount;

			for (let i = 0; quantity !== 0; i++) {
				const item = purchaseItems[i];
				const currentQuantity = item.reminderQuantity;

				let supplierProduct = await SupplierProduct.findOne({
					productId: productId,
					supplierId: supplier._id,
					expiryDate: item.expiryDate,
				}).session(session).exec();

				if (!supplierProduct) {
					supplierProduct = new SupplierProduct();

					supplierProduct.supplierId = supplier._id;
					supplierProduct.stock = 0;
					supplierProduct.productId = productId;
					supplierProduct.price = transferPrice;
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

				await item.save({session});
				await supplierProduct.save({session});
			}
		} else if (transferTo === 'toInventory') {
			const supplierProducts = await SupplierProduct.find({
				productId: new mongoose.Types.ObjectId(productId),
				supplierId: new mongoose.Types.ObjectId(supplier._id)
			}).sort({expireDate: 1}).session(session);

			let quantity = transferAmount;

			for (let i = 0; quantity !== 0; i++) {
				const product = supplierProducts[i];
				const currentStock = product.stock;

				let item = await PurchaseItem.findOne({
					product: new mongoose.Types.ObjectId(productId),
					expiryDate: product.expiryDate,
				}).session(session).exec();

				if (!item) {
					item = await PurchaseItem.findOne({
						product: new mongoose.Types.ObjectId(productId),
					}).session(session).exec();

					if (!item) {
						return res.status(500).json({message: 'something wrong'});
					}
				}

				if (currentStock > quantity) {
					product.stock -= quantity;
					item.reminderQuantity += quantity;
					quantity = 0;
				} else {
					quantity -= currentStock;
					item.reminderQuantity += product.stock;
					product.stock = 0;
				}

				await product.save({session});
				await item.save({session});
			}
		}

		await session.commitTransaction();
		await session.endSession();

		res.status(200).json({
			status: "success",
			message: "Transformations completed successfully",
		});
	} catch (error) {
		await session.abortTransaction();
		await session.endSession();
		res.status(500).json({
			status: "fail",
			message: `Error processing product ID ${error.productId}: ${error.message}`,
		});
	}
};