# ProGuard / R8 rules for Trusted Web Activity (TWA)

# Keep AndroidBrowserHelper classes and methods
-keep class com.google.androidbrowserhelper.** { *; }
-keepclassmembers class com.google.androidbrowserhelper.** { *; }

# Keep AndroidX Browser Custom Tabs classes
-keep class androidx.browser.** { *; }
-keepclassmembers class androidx.browser.** { *; }

# Keep application package classes
-keep class com.rielar.app.** { *; }
-keepclassmembers class com.rielar.app.** { *; }
