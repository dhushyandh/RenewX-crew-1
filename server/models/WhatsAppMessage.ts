import mongoose, { Schema } from 'mongoose';

export type WhatsAppDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface IWhatsAppMessage {
  id: string;
  order_id: string;
  event_key: string;
  recipient_phone: string;
  chat_id: string;
  template_action: string;
  message_text: string;
  status: WhatsAppDeliveryStatus;
  openwa_message_id?: string;
  error_message?: string;
  attempts: number;
  next_retry_at?: Date | null;
  sent_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const WhatsAppMessageSchema = new Schema<IWhatsAppMessage>(
  {
    order_id: { type: String, required: true, index: true },
    event_key: { type: String, required: true, unique: true, index: true },
    recipient_phone: { type: String, required: true },
    chat_id: { type: String, required: true },
    template_action: { type: String, required: true },
    message_text: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    openwa_message_id: { type: String, default: null },
    error_message: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    next_retry_at: { type: Date, default: null, index: true },
    sent_at: { type: Date, default: null },
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

WhatsAppMessageSchema.index({ order_id: 1, created_at: -1 });
WhatsAppMessageSchema.index({ status: 1, created_at: -1 });
WhatsAppMessageSchema.index({ status: 1, next_retry_at: 1 });

export const WhatsAppMessageModel =
  (mongoose.models.WhatsAppMessage as mongoose.Model<IWhatsAppMessage>) ||
  mongoose.model<IWhatsAppMessage>('WhatsAppMessage', WhatsAppMessageSchema);

/**
 * Reconciles and verifies the unique event_key index in MongoDB.
 * Critical for production where Mongoose autoIndex is disabled.
 */
export async function reconcileWhatsAppIndexes(): Promise<void> {
  try {
    await WhatsAppMessageModel.syncIndexes();
    console.log('🌿 [MongoDB] WhatsAppMessage unique event_key index verified');
  } catch (err: any) {
    console.warn('[MongoDB] Notice during WhatsApp index reconciliation:', err?.message || err);
  }
}
