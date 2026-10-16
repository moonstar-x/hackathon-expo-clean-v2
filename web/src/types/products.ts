// Props of the product screens (components/products).
export interface ProductFormProps {
  /** `create` asks for the opening quantity; `edit` shows the stock on hand, which only movements change. */
  mode: 'create' | 'edit';
}
