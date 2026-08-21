import express from 'express'
import { placeOrder, placeOrderStrip, placeOrderRazorpay, allOrders, userOrders, updateStatus, verifyStripe, verifyRazorpay, deleteOrder } from '../controllers/orderController.js'
import adminAuth from '../middleware/adminAuth.js'
import authUser from '../middleware/auth.js';

const orderRouter = express.Router()

//Admin Features
orderRouter.post('/list', adminAuth, allOrders);
orderRouter.post('/status', adminAuth, updateStatus);

// Payment Features
orderRouter.post('/place', authUser, placeOrder);
orderRouter.post('/stripe', authUser, placeOrderStrip);
orderRouter.post('/razorpay', authUser, placeOrderRazorpay);

//User Feature
orderRouter.post('/userorders', authUser, userOrders);

//Verify Payment
orderRouter.post('/verifyStripe', authUser, verifyStripe)
orderRouter.post('/verifyRazorpay', authUser, verifyRazorpay)

//Cancel/Delete Order
orderRouter.post('/delete', authUser, deleteOrder);

export default orderRouter;