import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listFoods, type CatalogFood } from '../services/foodService';

type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; foods: CatalogFood[] };

export default function FoodCatalogScreen() {
  const [attempt, setAttempt] = useState(0);
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    listFoods(controller.signal).then(
      (foods) => {
        if (!controller.signal.aborted) setCatalog({ status: 'ready', foods });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setCatalog({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không tải được danh sách món.',
          });
        }
      }
    );
    return () => controller.abort();
  }, [attempt]);

  return (
    <SafeAreaView style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>Kho món ăn</Text>
      {catalog.status === 'loading' && <ActivityIndicator accessibilityLabel="Đang tải món ăn" />}
      {catalog.status === 'error' && (
        <View style={styles.row}>
          <Text accessibilityRole="alert">{catalog.message}</Text>
          <Button title="Thử lại" onPress={() => {
            setCatalog({ status: 'loading' });
            setAttempt((value) => value + 1);
          }} />
        </View>
      )}
      {catalog.status === 'ready' && (
        <FlatList
          data={catalog.foods}
          keyExtractor={(food) => food.id}
          ListEmptyComponent={<Text>Kho món ăn chưa có dữ liệu.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.foodName}>{item.name}</Text>
              <Text>{item.category} · {item.calories} kcal/khẩu phần</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '700', marginVertical: 16 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#bbb' },
  foodName: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
});
