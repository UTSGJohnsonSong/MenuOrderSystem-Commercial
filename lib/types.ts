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
}
