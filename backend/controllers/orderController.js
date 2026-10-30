import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import Stripe from 'stripe';
import razorpay from 'razorpay';
import nodemailer from 'nodemailer';

// Global variables
const currency = 'USD';
const deliveryCharges = 10;

// Gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function to send Order Status Emails
const sendOrderEmail = async (
    userId,
    orderId,
    amount,
    items = [],
    status = 'Order Placed'
) => {
    try {
        const user = await userModel.findById(userId);
        if (!user || !user.email) return;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let subject = 'Order Placed Successfully - FOREVER.';
        let statusMessage =
            'Your order has been placed successfully!';

        const lowerStatus = status.toLowerCase();

        if (lowerStatus === 'out for delivery') {
            subject = 'Your Order is Out for Delivery - FOREVER.';
            statusMessage =
                'Good news! Your order is out for delivery ' +
                'and will reach you soon.';
        } else if (lowerStatus === 'delivered') {
            subject = 'Your Order Has Been Delivered - FOREVER.';
            statusMessage =
                'Your order has been delivered! ' +
                'We hope you love your purchase.';
        }

        // Build product list HTML
        const itemsListHtml = items
            .map((item) => {
                const sizeInfo = item.size
                    ? ` (Size: ${item.size})`
                    : '';
                return (
                    `<li style="margin-bottom: 5px;">` +
                    `<b>${item.name}</b>${sizeInfo} ` +
                    `— Qty: ${item.quantity}` +
                    `</li>`
                );
            })
            .join('');

        const mailOptions = {
            from: `"FOREVER." <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>FOREVER<span style="color: #F082AC;">.</span></h2>
                    <p>Hi <b>${user.name}</b>,</p>
                    <p>${statusMessage}</p>
                    <p><b>Status:</b> ${status}</p>
                    <p><b>Order ID:</b> ${orderId}</p>
                    <p><b>Ordered Items:</b></p>
                    <ul style="padding-left: 20px;">
                        ${itemsListHtml}
                    </ul>
                    <p><b>Total Amount:</b> $${amount}</p>
                    <br/>
                    <p>Thank you for shopping with us.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log("Email error:", error.message);
    }
};

// Placing orders using COD Method
const placeOrder = async (req, res) => {
    try {
        const { userId, items, amount, address } = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "COD",
            payment: false,
            date: Date.now()
        };

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        await userModel.findByIdAndUpdate(userId, { cartData: {} });

        // Send Order Placed email with items
        await sendOrderEmail(
            userId,
            newOrder._id,
            amount,
            items,
            'Order Placed'
        );

        res.json({ success: true, message: "Order Placed" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Placing orders using Stripe Method
const placeOrderStrip = async (req, res) => {
    try {
        const { userId, items, amount, address } = req.body;
        const { origin } = req.headers;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Stripe",
            payment: false,
            date: Date.now()
        };

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        const line_items = items.map((item) => ({
            price_data: {
                currency: currency,
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }));

        line_items.push({
            price_data: {
                currency: currency,
                product_data: {
                    name: 'Delivery Charges'
                },
                unit_amount: deliveryCharges * 100
            },
            quantity: 1
        });

        const successUrl =
            `${origin}/verify?success=true&orderId=${newOrder._id}`;
        const cancelUrl =
            `${origin}/verify?success=false&orderId=${newOrder._id}`;

        const session = await stripe.checkout.sessions.create({
            success_url: successUrl,
            cancel_url: cancelUrl,
            line_items,
            mode: 'payment',
        });

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Verify Stripe
const verifyStripe = async (req, res) => {
    const { orderId, success, userId } = req.body;

    try {
        if (success === "true") {
            const updatedOrder = await orderModel.findByIdAndUpdate(
                orderId,
                { payment: true }
            );
            await userModel.findByIdAndUpdate(userId, { cartData: {} });

            // Send Order Placed email with items
            if (updatedOrder) {
                await sendOrderEmail(
                    userId,
                    orderId,
                    updatedOrder.amount,
                    updatedOrder.items,
                    'Order Placed'
                );
            }

            res.json({ success: true });
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({ success: false });
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req, res) => {
    try {
        const { userId, items, amount, address } = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Razorpay",
            payment: false,
            date: Date.now()
        };

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        const options = {
            amount: amount * 100,
            currency: currency.toLocaleUpperCase(),
            receipt: newOrder._id.toString()
        };

        await razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                console.log(error);
                return res.json({ success: false, message: error });
            }
            res.json({ success: true, order });
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Verify Razorpay
const verifyRazorpay = async (req, res) => {
    try {
        const { userId, razorpay_order_id } = req.body;

        const orderInfo = await razorpayInstance.orders.fetch(
            razorpay_order_id
        );

        if (orderInfo.status === 'paid') {
            const updatedOrder = await orderModel.findByIdAndUpdate(
                orderInfo.receipt,
                { payment: true }
            );
            await userModel.findByIdAndUpdate(userId, { cartData: {} });

            // Send Order Placed email with items
            if (updatedOrder) {
                await sendOrderEmail(
                    userId,
                    orderInfo.receipt,
                    updatedOrder.amount,
                    updatedOrder.items,
                    'Order Placed'
                );
            }

            res.json({ success: true, message: "Payment Successful" });
        } else {
            res.json({ success: false, message: "Payment Failed" });
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// All Orders data for Admin Panel
const allOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});

        const validOrders = orders.filter((order) => {
            return order.paymentMethod === 'COD' || order.payment === true;
        });

        res.json({ success: true, orders: validOrders });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// User Order data for Frontend 
const userOrders = async (req, res) => {
    try {
        const { userId } = req.body;

        const orders = await orderModel.find({ userId });

        const validOrders = orders.filter((order) => {
            return order.paymentMethod === 'COD' || order.payment === true;
        });

        res.json({ success: true, orders: validOrders });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Update order Status from Admin Panel
const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const updatedOrder = await orderModel.findByIdAndUpdate(
            orderId,
            { status }
        );

        // Send email with items for Out for delivery or Delivered
        const lowerStatus = status ? status.toLowerCase() : '';
        if (
            updatedOrder &&
            (lowerStatus === 'out for delivery' ||
                lowerStatus === 'delivered')
        ) {
            await sendOrderEmail(
                updatedOrder.userId,
                orderId,
                updatedOrder.amount,
                updatedOrder.items,
                status
            );
        }

        res.json({ success: true, message: 'Status Updated' });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Delete unpaid order if user cancels payment
const deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        await orderModel.findByIdAndDelete(orderId);

        res.json({ success: true, message: 'Order Deleted' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    deleteOrder,
    verifyRazorpay,
    verifyStripe,
    placeOrder,
    placeOrderStrip,
    placeOrderRazorpay,
    allOrders,
    userOrders,
    updateStatus,
    sendOrderEmail
};