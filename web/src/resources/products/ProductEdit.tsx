import { DeleteButton, Edit, SaveButton, ShowButton, Toolbar, TopToolbar } from 'react-admin';
import { ProductForm } from './ProductForm';

function ProductEditToolbar() {
  return (
    <Toolbar sx={{ justifyContent: 'space-between' }}>
      <SaveButton />
      <DeleteButton mutationMode="pessimistic" />
    </Toolbar>
  );
}

export function ProductEdit() {
  return (
    <Edit
      mutationMode="pessimistic"
      redirect="show"
      actions={
        <TopToolbar>
          <ShowButton />
        </TopToolbar>
      }
    >
      <ProductForm mode="edit" toolbar={<ProductEditToolbar />} />
    </Edit>
  );
}
