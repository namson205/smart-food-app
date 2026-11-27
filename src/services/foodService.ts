import { supabaseClient } from './axiosClient';
import type { Food } from '../types/models';

export type CatalogFood = Pick<Food, 'id' | 'name' | 'category' | 'calories'>;

export async function listFoods(signal?: AbortSignal): Promise<CatalogFood[]> {
  const { data } = await supabaseClient.get<CatalogFood[]>('/foods', {
    params: { select: 'id,name,category,calories', order: 'name.asc,id.asc' },
    signal,
  });
  return data;
}
