import jwt from 'jsonwebtoken';
import Customer from "../models/customerSchema.js";
import {transformationCustomer} from "../format/transformationObject.js";

async function userProfile(token) {
    try {
        return await jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw error;
    }
}

export const customerProfile = async (req, res) => {
    const token = req.headers['access_token'];

    try {
        const decodedToken = await userProfile(token);
        const customer = await Customer.findOne({_id: decodedToken['_id']});
        if (!customer) {
            return res.status(207).json({
                status: "fail",
                message: "Customer not found"
            })
        }

        return res.status(200).json({
            status: "success",
            data: transformationCustomer(customer),
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
}
