import mongoose, { Schema, Document } from 'mongoose';

export interface IWebPushSubscription extends Document {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_id?: string | null;
  user_agent?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const WebPushSubscriptionSchema = new Schema<IWebPushSubscription>(
  {
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    user_id: { type: String, default: null, index: true },
    user_agent: { type: String, default: null },
    is_active: { type: Boolean, default: true, index: true },
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

WebPushSubscriptionSchema.index({ user_id: 1, is_active: 1 });

export const WebPushSubscriptionModel =
  (mongoose.models.WebPushSubscription as mongoose.Model<IWebPushSubscription>) ||
  mongoose.model<IWebPushSubscription>('WebPushSubscription', WebPushSubscriptionSchema);
