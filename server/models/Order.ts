import mongoose, { Schema, Document } from 'mongoose';

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  user_id: string;
  subtotal: number;
  savings: number;
  status: 'pending' | 'verified' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  courier?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  customer_info?: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
  };
  order_items?: OrderItem[];
  created_at?: string;
}

export interface IOrder extends Document {
  id: string;
  user_id: string;
  subtotal: number;
  savings: number;
  status: 'pending' | 'verified' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  courier?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  customer_info?: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
  };
  order_items: OrderItem[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrderDTO {
  items: {
    product_id: string;
    quantity: number;
  }[];
  customer_info: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
  };
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    product_id: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    user_id: { type: String, required: true, index: true },
    subtotal: { type: Number, required: true },
    savings: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'verified', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    courier: { type: String, default: 'BlueDart Express' },
    tracking_number: { type: String, default: '' },
    estimated_delivery: { type: String, default: '' },
    customer_info: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    order_items: { type: [OrderItemSchema], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const OrderModel = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
