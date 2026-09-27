import { connectDB } from './config/db';
import { OrderModel } from './models/Order';

async function main() {
  await connectDB();
  const orders = await OrderModel.find({}).sort({ created_at: -1 }).limit(10).lean();
  console.log(`Found ${orders.length} recent orders:`);
  for (const o of orders) {
    console.log(JSON.stringify({
      id: o._id,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      status: o.status,
      razorpay_order_id: o.razorpay_order_id,
      razorpay_payment_id: o.razorpay_payment_id,
      subtotal: o.subtotal,
      created_at: o.created_at,
    }, null, 2));
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
