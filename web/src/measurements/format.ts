const number = (n: number, decimals: number) => n.toLocaleString('es', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
export const length = (n: number | null) => n === null ? '—' : `${number(n, 2)} m`;
export const area = (n: number | null, approximate = false) => n === null ? '—' : `${approximate ? '≈ ' : ''}${number(n, 1)} m²`;
export const size = (values: number[]) => `${values.map((n) => number(n, 2)).join(' × ')} m`;
export const fileSize = (bytes: number) => `${number(bytes / (bytes >= 1048576 ? 1048576 : 1024), 1)} ${bytes >= 1048576 ? 'MB' : 'KB'}`;
const roomTypes: Record<string, string> = { bedroom: 'Dormitorio', bathroom: 'Baño', kitchen: 'Cocina', livingRoom: 'Sala', diningRoom: 'Comedor' };
export const roomType = (type: string | null) => type && Object.hasOwn(roomTypes, type) ? roomTypes[type] : '—';
const categories: Record<string, string> = { storage: 'Almacenamiento', refrigerator: 'Refrigerador', stove: 'Estufa', bed: 'Cama', sink: 'Lavabo', washerDryer: 'Lavadora/Secadora', toilet: 'Inodoro', bathtub: 'Bañera', oven: 'Horno', dishwasher: 'Lavavajillas', table: 'Mesa', sofa: 'Sofá', chair: 'Silla', fireplace: 'Chimenea', television: 'Televisor', stairs: 'Escaleras' };
export const categoryName = (category: string) => Object.hasOwn(categories, category) ? categories[category] : 'Objeto';
