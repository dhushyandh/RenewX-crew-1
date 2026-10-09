package com.renewx.mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import android.os.Build
import android.text.SpannableString
import android.text.Spanned
import android.text.style.StrikethroughSpan
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.random.Random

class RenewXMessagingService : FirebaseMessagingService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        private const val TAG = "RenewXMessagingService"
        const val PROMOTIONS_CHANNEL_ID = "renewx-promotions"
        const val PROMOTIONS_CHANNEL_NAME = "RenewX Promotions"
        const val PRODUCTS_CHANNEL_ID = "renewx-products"
        const val PRODUCTS_CHANNEL_NAME = "RenewX New Arrivals"
        private const val MAX_IMAGE_DIMENSION = 512
        private const val NETWORK_TIMEOUT_MS = 8000
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val type = message.data["type"] ?: ""

        // 1. PRODUCT ARRIVAL: Native BigPictureStyle with real product image, name, price & RenewX branding
        if (type.uppercase() in listOf("PRODUCT_ARRIVAL", "PRODUCT")) {
            Log.d(TAG, "Product arrival notification received: ${message.data}")
            serviceScope.launch {
                try {
                    handleProductArrivalNotification(message.data)
                } catch (e: Throwable) {
                    Log.e(TAG, "Failed to render rich product arrival notification, falling back", e)
                    showFallbackProductNotification(message.data)
                }
            }
            return
        }

        // 2. PROMOTION: Dual-product card layout for sales/promotions
        if (type.uppercase() == "PROMOTION") {
            Log.d(TAG, "Promotional notification received with data: ${message.data}")
            serviceScope.launch {
                try {
                    handlePromotionNotification(message.data)
                } catch (e: Throwable) {
                    Log.e(TAG, "Failed to render custom rich notification; triggering safe fallback", e)
                    showFallbackNotification(message.data)
                }
            }
            return
        }

        // 3. ISOLATION: Normal customer notifications (orders, trade-ins, deliveries, security)
        // must continue working through standard expo-notifications system.
        Log.d(TAG, "Non-custom notification ($type) received; delegating to default handler.")
        super.onMessageReceived(message)
    }

    /**
     * Renders a genuine single-product arrival notification using Android's native BigPictureStyle.
     * Features:
     * - Small icon: RenewX app icon (small branding)
     * - Title: New arrival: <Product Name>
     * - Body: Now available for <Price> on RenewX.
     * - Large image: High-res downloaded product image
     * - Tap action: opens renewx://product/<productId>
     */
    private suspend fun handleProductArrivalNotification(data: Map<String, String>) {
        val productId = data["productId"] ?: data["id"] ?: ""
        val productName = data["name"] ?: data["productName"] ?: "Certified Device"
        val price = data["price"] ?: ""
        val title = data["title"] ?: "New arrival: $productName"
        val body = data["body"] ?: if (price.isNotBlank()) "Now available for $price on RenewX." else "Now available on RenewX."
        val imageUrl = data["imageUrl"] ?: data["image"] ?: ""

        val bitmap = if (imageUrl.isNotBlank()) downloadSampledBitmap(imageUrl) else null

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureProductsChannel(notificationManager)

        val notificationId = (System.currentTimeMillis() % 100000).toInt() + Random.nextInt(100)

        val targetUri = if (productId.isNotBlank()) "renewx://product/$productId" else "renewx://shop"
        val tapIntent = createDeepLinkIntent(targetUri)
        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId * 10,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val smallIconRes = resolveSmallIcon()

        val builder = NotificationCompat.Builder(this, PRODUCTS_CHANNEL_ID)
            .setSmallIcon(smallIconRes)
            .setColor(Color.parseColor("#FFC400"))
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        if (bitmap != null) {
            val bigPictureStyle = NotificationCompat.BigPictureStyle()
                .bigPicture(bitmap)
                .setBigContentTitle(title)
                .setSummaryText(body)
            builder.setStyle(bigPictureStyle)
        } else {
            val bigTextStyle = NotificationCompat.BigTextStyle()
                .bigText(body)
                .setBigContentTitle(title)
            builder.setStyle(bigTextStyle)
        }

        notificationManager.notify(notificationId, builder.build())
        Log.d(TAG, "Product arrival notification successfully displayed for ID: $productId")
    }

    private fun showFallbackProductNotification(data: Map<String, String>) {
        try {
            val productId = data["productId"] ?: data["id"] ?: ""
            val title = data["title"] ?: "New arrival on RenewX"
            val body = data["body"] ?: "A newly certified device is now in stock."
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            ensureProductsChannel(notificationManager)

            val targetUri = if (productId.isNotBlank()) "renewx://product/$productId" else "renewx://shop"
            val mainIntent = createDeepLinkIntent(targetUri)
            val pendingIntent = PendingIntent.getActivity(
                this,
                998,
                mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this, PRODUCTS_CHANNEL_ID)
                .setSmallIcon(resolveSmallIcon())
                .setColor(Color.parseColor("#FFC400"))
                .setContentTitle(title)
                .setContentText(body)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()

            notificationManager.notify((System.currentTimeMillis() % 10000).toInt(), notification)
        } catch (e: Exception) {
            Log.e(TAG, "Fallback product notification also encountered error", e)
        }
    }

    private suspend fun handlePromotionNotification(data: Map<String, String>) {
        val title = data["title"] ?: "🔥 Weekend Device Deals 🔥"
        val body = data["body"] ?: "Blockbuster deals on selected devices"

        val product1Id = data["product1Id"] ?: ""
        val product1Name = data["product1Name"] ?: "Certified Device"
        val product1Price = data["product1Price"] ?: ""
        val product1OldPrice = data["product1OldPrice"] ?: ""
        val product1Image = data["product1Image"] ?: ""

        val product2Id = data["product2Id"] ?: ""
        val product2Name = data["product2Name"] ?: "Certified Device"
        val product2Price = data["product2Price"] ?: ""
        val product2OldPrice = data["product2OldPrice"] ?: ""
        val product2Image = data["product2Image"] ?: ""

        // Concurrently download product images with timeout and downsampling
        val p1BitmapDeferred = serviceScope.async { downloadSampledBitmap(product1Image) }
        val p2BitmapDeferred = serviceScope.async { downloadSampledBitmap(product2Image) }

        val p1Bitmap = p1BitmapDeferred.await()
        val p2Bitmap = p2BitmapDeferred.await()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensurePromotionsChannel(notificationManager)

        val notificationId = (System.currentTimeMillis() % 100000).toInt() + Random.nextInt(100)

        // 1. Collapsed RemoteViews
        val collapsedViews = RemoteViews(packageName, R.layout.notification_promotion_collapsed).apply {
            setTextViewText(R.id.notification_title, title)
            setTextViewText(R.id.notification_body, body)
            setTextViewText(R.id.collapsed_product1_preview, "📱 $product1Name")
            setTextViewText(R.id.collapsed_product2_preview, "📱 $product2Name")
        }

        // 2. Expanded RemoteViews (2-Product RenewX Layout)
        val expandedViews = RemoteViews(packageName, R.layout.notification_promotion_expanded).apply {
            setTextViewText(R.id.notification_title, title)
            setTextViewText(R.id.notification_body, body)

            // Product 1
            setTextViewText(R.id.product1_name, product1Name)
            setTextViewText(R.id.product1_price, product1Price)
            if (product1OldPrice.isNotBlank()) {
                val span = SpannableString(product1OldPrice)
                span.setSpan(StrikethroughSpan(), 0, product1OldPrice.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                setTextViewText(R.id.product1_old_price, span)
                setViewVisibility(R.id.product1_old_price, View.VISIBLE)
            } else {
                setViewVisibility(R.id.product1_old_price, View.GONE)
            }
            if (p1Bitmap != null) {
                setImageViewBitmap(R.id.product1_image, p1Bitmap)
            }

            // Product 2
            setTextViewText(R.id.product2_name, product2Name)
            setTextViewText(R.id.product2_price, product2Price)
            if (product2OldPrice.isNotBlank()) {
                val span = SpannableString(product2OldPrice)
                span.setSpan(StrikethroughSpan(), 0, product2OldPrice.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                setTextViewText(R.id.product2_old_price, span)
                setViewVisibility(R.id.product2_old_price, View.VISIBLE)
            } else {
                setViewVisibility(R.id.product2_old_price, View.GONE)
            }
            if (p2Bitmap != null) {
                setImageViewBitmap(R.id.product2_image, p2Bitmap)
            }

            // Click PendingIntent for Product 1
            if (product1Id.isNotBlank()) {
                val p1Intent = createDeepLinkIntent("renewx://product/$product1Id")
                val p1Pending = PendingIntent.getActivity(
                    this@RenewXMessagingService,
                    notificationId * 10 + 1,
                    p1Intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                setOnClickPendingIntent(R.id.product1_card, p1Pending)
            }

            // Click PendingIntent for Product 2
            if (product2Id.isNotBlank()) {
                val p2Intent = createDeepLinkIntent("renewx://product/$product2Id")
                val p2Pending = PendingIntent.getActivity(
                    this@RenewXMessagingService,
                    notificationId * 10 + 2,
                    p2Intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                setOnClickPendingIntent(R.id.product2_card, p2Pending)
            }
        }

        // Global notification tap opens Shop
        val mainIntent = createDeepLinkIntent("renewx://shop")
        val mainPending = PendingIntent.getActivity(
            this,
            notificationId * 10,
            mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val smallIconRes = resolveSmallIcon()

        val notification = NotificationCompat.Builder(this, PROMOTIONS_CHANNEL_ID)
            .setSmallIcon(smallIconRes)
            .setColor(Color.parseColor("#FFC400"))
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(collapsedViews)
            .setCustomBigContentView(expandedViews)
            .setContentIntent(mainPending)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        notificationManager.notify(notificationId, notification)
        Log.d(TAG, "Promotional notification successfully displayed with ID: $notificationId")
    }

    private fun createDeepLinkIntent(uriString: String): Intent {
        return Intent(Intent.ACTION_VIEW, Uri.parse(uriString)).apply {
            `package` = packageName
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
    }

    private fun ensurePromotionsChannel(notificationManager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val existing = notificationManager.getNotificationChannel(PROMOTIONS_CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    PROMOTIONS_CHANNEL_ID,
                    PROMOTIONS_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Exclusive device deals and promotional offers from RenewX"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 200, 100, 200)
                    setShowBadge(true)
                }
                notificationManager.createNotificationChannel(channel)
                Log.d(TAG, "Created notification channel: $PROMOTIONS_CHANNEL_ID")
            }
        }
    }

    private fun ensureProductsChannel(notificationManager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val existing = notificationManager.getNotificationChannel(PRODUCTS_CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    PRODUCTS_CHANNEL_ID,
                    PRODUCTS_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Real-time updates when new products arrive on RenewX"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 200, 100, 200)
                    setShowBadge(true)
                }
                notificationManager.createNotificationChannel(channel)
                Log.d(TAG, "Created notification channel: $PRODUCTS_CHANNEL_ID")
            }
        }
    }

    private fun downloadSampledBitmap(imageUrl: String): Bitmap? {
        if (imageUrl.isBlank()) return null
        var connection: HttpURLConnection? = null
        var inputStream: InputStream? = null

        return try {
            val url = URL(imageUrl)
            connection = (url.openConnection() as HttpURLConnection).apply {
                doInput = true
                connectTimeout = NETWORK_TIMEOUT_MS
                readTimeout = NETWORK_TIMEOUT_MS
                instanceFollowRedirects = true
            }
            connection.connect()

            if (connection.responseCode != HttpURLConnection.HTTP_OK) {
                Log.w(TAG, "Image HTTP error ${connection.responseCode} for: $imageUrl")
                return null
            }

            inputStream = connection.inputStream
            val bytes = inputStream.readBytes()

            // 1. Decode bounds to inspect size
            val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, boundsOptions)

            val width = boundsOptions.outWidth
            val height = boundsOptions.outHeight
            var inSampleSize = 1

            if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                val halfHeight = height / 2
                val halfWidth = width / 2
                while ((halfHeight / inSampleSize) >= MAX_IMAGE_DIMENSION && (halfWidth / inSampleSize) >= MAX_IMAGE_DIMENSION) {
                    inSampleSize *= 2
                }
            }

            // 2. Decode scaled bitmap safely
            val decodeOptions = BitmapFactory.Options().apply {
                this.inSampleSize = inSampleSize
                inPreferredConfig = Bitmap.Config.RGB_565
            }

            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOptions)
        } catch (e: Throwable) {
            Log.w(TAG, "Could not fetch product notification image from $imageUrl: ${e.message}")
            null
        } finally {
            try {
                inputStream?.close()
                connection?.disconnect()
            } catch (_: Exception) {}
        }
    }

    private fun showFallbackNotification(data: Map<String, String>) {
        try {
            val title = data["title"] ?: "RenewX Special Deals"
            val body = data["body"] ?: "Check out certified devices on RenewX."
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            ensurePromotionsChannel(notificationManager)

            val mainIntent = createDeepLinkIntent("renewx://shop")
            val pendingIntent = PendingIntent.getActivity(
                this,
                999,
                mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this, PROMOTIONS_CHANNEL_ID)
                .setSmallIcon(resolveSmallIcon())
                .setColor(Color.parseColor("#FFC400"))
                .setContentTitle(title)
                .setContentText(body)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()

            notificationManager.notify((System.currentTimeMillis() % 10000).toInt(), notification)
        } catch (e: Exception) {
            Log.e(TAG, "Fallback notification also encountered error", e)
        }
    }

    private fun resolveSmallIcon(): Int {
        val iconRes = resources.getIdentifier("notification_icon", "drawable", packageName)
        return if (iconRes != 0) iconRes else applicationInfo.icon
    }
}
