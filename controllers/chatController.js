import { transformationChat, transformationMessage } from '../format/transformationObject.js';
import Chat from '../models/chatSchema.js';
import Message from '../models/messageSchema.js';

export const getAllChat = async (req, res) => {
    let query = {};
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    try {
        if(req.query.userType === 'customer') {
            query.customer = { $exists: true };
        }
        if(req.query.userType === 'supplier') {
            query.supplier = { $exists: true };
        }
        if(req.query.userType === 'deliveryBoy') {
            query.deliveryBoy = { $exists: true };
        }

        const chats = await Chat.find(query).sort({ lastMessage: -1 }).limit(limit).skip((page - 1) * limit).exec();
        const transformationChats = await Promise.all(
            chats.map(async (chat) =>  await transformationChat(chat))
        );
        res.status(200).json({
            status: 'success',
            page: page,
            totalPages: Math.ceil(await Chat.countDocuments() / limit),
            data: transformationChats,
        })
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

export const getMessagesByChatId = async (req, res) => {
    const chatId = req.params.chatId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    try {
        const messages = await Message.find({ chat: chatId }).sort({ time: -1 }).limit(limit).skip((page - 1) * limit).exec();
        const transformationMessages = await Promise.all(
            messages.map(async (message) => {
                return await transformationMessage(message);
            })
        );
        res.status(200).json({
            status: 'success',
            page: page,
            totalPages: Math.ceil(await Message.countDocuments({ chat: chatId }) / limit),
            data: transformationMessages,
        })
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

export const getMessagesByUserId = async (req, res) => {
    let messages = [];
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    try {
        if (req.headers['user-type'] === 'supplier') {
            messages = await Message.find({ supplier: userId }).sort({ time: -1 }).limit(limit).skip((page - 1) * limit).exec();
        } else if (req.headers['user-type'] === 'customer') {
            messages = await Message.find({ customer: userId }).sort({ time: -1 }).limit(limit).skip((page - 1) * limit).exec();
        } else if (req.headers['user-type'] === 'deliveryBoy') {
            messages = await Message.find({ deliveryBoy: userId }).sort({ time: -1 }).limit(limit).skip((page - 1) * limit).exec();
        }
        let transformationMessages = await Promise.all(
            messages.map(async (message) => {
                return await transformationMessage(message);
            })
        );
        res.status(200).json({
            status: 'success',
            page: page,
            totalPages: Math.ceil(await Message.countDocuments({ $or: [{ supplier: userId }, { customer: userId }, { deliveryBoy: userId }] }) / limit),
            data: transformationMessages,
        })
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

export const uploadMessageFile = async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            data: `${process.env.SERVER_URL}${req.file.path.replace(/\\/g, '/').replace(/^upload\//, '')}`
        });
    } catch (error) {
        res.status(500).json({ status: 'fail', message: error.message });
    }

};
