import 'package:flutter_test/flutter_test.dart';
import 'package:nail_couture_flutter/main.dart';

void main() {
  testWidgets('home screen renders', (WidgetTester tester) async {
    await tester.pumpWidget(const NailCoutureApp());

    expect(find.text('Nail Couture'), findsOneWidget);
    expect(find.text('Flutter shell ready'), findsOneWidget);
  });
}
