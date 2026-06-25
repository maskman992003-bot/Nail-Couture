# Flutter ProGuard Rules
# ProGuard configuration for Flutter apps with code shrinking and obfuscation

# Keep Flutter classes
-keep class io.flutter.** { *; }
-dontwarn io.flutter.**

# Keep native methods used by Flutter
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Android support library classes
-keep class androidx.** { *; }
-dontwarn androidx.**

# Keep view constructors for Fragment/Activity inflation
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# Keep methods used by Dart reflection
-keepclasseswithmembernames class * {
    *** *(...);
}

# Keep Kotlin metadata
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Serializable classes
-keep class * implements java.io.Serializable {
    static final long serialVersionUID;
    static final java.io.ObjectStreamField[] serialPersistentFields;
    private static final java.io.ObjectStreamField[] $serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep parcelable classes
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep R classes
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Android WebView classes used by flutter_inappwebview in release builds
-keep class android.webkit.** { *; }
-keep class androidx.webkit.** { *; }
-dontwarn android.webkit.**
-dontwarn androidx.webkit.**

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep flutter_inappwebview plugin classes when code shrinking is enabled
-keep class com.pichillilorenzo.** { *; }
-dontwarn com.pichillilorenzo.**
