import 'package:flutter/material.dart';
import 'package:nail_couture_flutter/theme/app_colors.dart';

void main() {
  runApp(const NailCoutureApp());
}

class NailCoutureApp extends StatelessWidget {
  const NailCoutureApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nail Couture',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.charcoal,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.gold,
          onPrimary: AppColors.charcoal,
          surface: AppColors.cardBg,
          onSurface: AppColors.offWhite,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.charcoal,
          foregroundColor: AppColors.offWhite,
          elevation: 0,
        ),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nail Couture'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.gold, width: 2),
                  color: AppColors.cardBg,
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: AppColors.gold,
                  size: 40,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Flutter shell ready',
                style: textTheme.headlineSmall?.copyWith(
                  color: AppColors.offWhite,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'This app is isolated from web, Expo, and Capacitor. '
                'Wire up Supabase and rebuild screens here when you are ready.',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppColors.offWhite.withValues(alpha: 0.7),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              const _InfoChip(label: 'Bundle: com.nailcouture.app.flutter'),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.35)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: AppColors.gold,
            ),
      ),
    );
  }
}
