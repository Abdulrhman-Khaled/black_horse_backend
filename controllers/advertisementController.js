import { transformationAdvertisement } from '../format/transformationObject.js';
import Advertisement from '../models/advertisementSchema.js';
import SupplierProduct from '../models/supplierProductSchema.js';
import Supplier from '../models/supplierSchema.js'; // Assuming you have a Supplier model
import Customer from '../models/customerSchema.js';

export async function createAdvertisement(req, res) {
  try {
    const { supplierProductId } = req.body;
    const supplierProduct = await SupplierProduct.findOne({ _id: supplierProductId, status:"active" }).populate('supplierId');
    if (!supplierProduct) {
      return res.status(404).json({
        status: 'fail',
        message: 'Supplier product not found'
      });
    }
    const subRegions = await Supplier.find({_id: supplierProduct.supplierId}, 'subRegions'); // Assuming Supplier has a 'subRegions' field
    const newAdvertisement = new Advertisement({
      product: supplierProductId,
      subRegion: subRegions
    });
    await newAdvertisement.save();
    res.status(201).json({
      status: 'success',
      data: newAdvertisement
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}

export async function updateAdvertisement(req, res) {
  try {
    const { advertisementId } = req.params;
    const updateData = req.body;
    const updatedAdvertisement = await Advertisement.findByIdAndUpdate(advertisementId, updateData, { new: true });
    if (!updatedAdvertisement) {
      return res.status(404).json({
        status: 'fail',
        message: 'Advertisement not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: updatedAdvertisement
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}

export async function getAdvertisementById(req, res) {
  try {
    const { advertisementId } = req.params;
    const advertisement = await Advertisement.findById(advertisementId).populate('product');
    if (!advertisement) {
      return res.status(404).json({
        status: 'fail',
        message: 'Advertisement not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: await transformationAdvertisement(advertisement)
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}

export async function getAllAdvertisements(req, res) {
  try {
    const query = {};

    const { customerId } = req.query;

    if (customerId) {
      // Fetch the customer
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          status: 'fail',
          message: 'Customer not found'
        });
      }

      // Get the customer's subRegion
      const customerSubRegion = customer.subRegion;
      if (!customerSubRegion) {
        return res.status(400).json({
          status: 'fail',
          message: 'Customer does not have a subRegion'
        });
      }

      query.subRegion = customerSubRegion;
    }

    // Find advertisements that include the customer's subRegion
    const advertisements = await Advertisement.find(query).populate('product');
    const transformAdvertisement = await Promise.all(
      advertisements.map(async (advertisement) => await transformationAdvertisement(advertisement))
    );

    res.status(200).json({
      status: 'success',
      data: transformAdvertisement
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}

export async function deleteAdvertisement(req, res) {
  try {
    const { id } = req.params;

    const deletedAdvertisement = await Advertisement.findByIdAndDelete(id);

    if (!deletedAdvertisement) {
      return res.status(404).json({
        status: 'fail',
        message: 'Advertisement not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: deletedAdvertisement
    });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
}

