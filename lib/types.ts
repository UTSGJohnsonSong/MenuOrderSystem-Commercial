export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  image_url: string;
  ingredients: string;
  instructions: string;
  notes: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  item: MenuItem;
  category: Category;
  quantity: number;
}

export interface MealLogEntry {
  item_id: string;
  name: string;
  category_name: string;
  image_url: string;
  quantity: number;
}

export interface MealLog {
  id: string;
  date: string; // YYYY-MM-DD
  meal: string; // 'breakfast' | 'lunch' | 'dinner' | 'all'（老数据）
  items: MealLogEntry[];
  created_at: string;
}
